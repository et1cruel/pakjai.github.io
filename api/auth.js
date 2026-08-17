const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const supabase = getSupabase();
    const { action, username, email, password } = req.body || {};
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
      return res.json({ success: true, user: publicUser(user) });
    }
    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (error) {
    console.error('Supabase Auth API error:', error);
    return res.status(500).json({ success: false, error: 'ไม่สามารถเชื่อมต่อ Supabase ได้' });
  }
};
