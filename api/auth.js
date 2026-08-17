const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SESSION_DAYS = 30;

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function publicUser(user) {
  return {
    id: user.id, username: user.username, email: user.email,
    bio: user.bio || '', profileImage: user.profile_image || '',
    followers: user.followers || [], following: user.following || [], posts: user.posts || []
  };
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function readCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(value => {
    const index = value.indexOf('=');
    return [value.slice(0, index).trim(), decodeURIComponent(value.slice(index + 1).trim())];
  }));
}

function setSessionCookie(res, token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  res.setHeader('Set-Cookie', `pakjai_session=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'pakjai_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
}

async function createSession(supabase, user, res) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  const { error } = await supabase.from('sessions').insert({ token_hash: hashToken(token), user_id: user.id, expires_at: expiresAt });
  if (error) throw error;
  setSessionCookie(res, token);
}

async function getSessionUser(supabase, req) {
  const token = readCookies(req).pakjai_session;
  if (!token) return null;
  const { data: session, error } = await supabase.from('sessions').select('user_id, expires_at').eq('token_hash', hashToken(token)).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (error) throw error;
  if (!session) return null;
  const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', session.user_id).single();
  if (userError) throw userError;
  return user;
}

module.exports = async function handler(req, res) {
  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      const user = await getSessionUser(supabase, req);
      return res.json({ success: Boolean(user), user: user ? publicUser(user) : null });
    }
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const { action, username, email, password } = req.body || {};
    if (action === 'logout') {
      const token = readCookies(req).pakjai_session;
      if (token) await supabase.from('sessions').delete().eq('token_hash', hashToken(token));
      clearSessionCookie(res);
      return res.json({ success: true });
    }
    if (!password || password.length < 6) return res.status(400).json({ success: false, error: 'รหัสผ่านต้องมากกว่า 6 ตัวอักษร' });

    if (action === 'signup') {
      if (!username || username.trim().length < 3 || !email) return res.status(400).json({ success: false, error: 'ข้อมูลสมัครสมาชิกไม่ครบถ้วน' });
      const normalizedUsername = username.trim();
      const normalizedEmail = email.toLowerCase().trim();
      const { data: existingUsername, error: usernameError } = await supabase.from('users').select('id').eq('username', normalizedUsername).maybeSingle();
      if (usernameError) throw usernameError;
      const { data: existingEmail, error: emailError } = await supabase.from('users').select('id').eq('email', normalizedEmail).maybeSingle();
      if (emailError) throw emailError;
      if (existingUsername || existingEmail) return res.status(409).json({ success: false, error: 'ชื่อผู้ใช้หรือ Email นี้มีอยู่แล้ว' });
      const { data: user, error } = await supabase.from('users').insert({ username: normalizedUsername, email: normalizedEmail, password_hash: hashPassword(password) }).select().single();
      if (error) {
        if (error.code === '23505') return res.status(409).json({ success: false, error: 'ชื่อผู้ใช้หรือ Email นี้มีอยู่แล้ว' });
        throw error;
      }
      await createSession(supabase, user, res);
      return res.status(201).json({ success: true, user: publicUser(user) });
    }

    if (action === 'login') {
      const identity = String(username || '').trim();
      const { data: byUsername, error: usernameError } = await supabase.from('users').select('*').eq('username', identity).maybeSingle();
      if (usernameError) throw usernameError;
      const { data: byEmail, error: emailError } = await supabase.from('users').select('*').eq('email', identity.toLowerCase()).maybeSingle();
      if (emailError) throw emailError;
      const user = byUsername || byEmail;
      if (!user || !verifyPassword(password, user.password_hash)) return res.status(401).json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
      await createSession(supabase, user, res);
      return res.json({ success: true, user: publicUser(user) });
    }
    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (error) {
    console.error('Supabase Auth API error:', error);
    const isConfigurationError = error.message?.includes('required');
    return res.status(isConfigurationError ? 500 : 500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'ไม่สามารถดำเนินการสมัครสมาชิกได้ กรุณาตรวจสอบการตั้งค่า Supabase' : error.message
    });
  }
};
