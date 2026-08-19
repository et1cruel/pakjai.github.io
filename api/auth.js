const { createClient } = require('@supabase/supabase-js');

function supabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase server environment is not configured');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(x => x.trim().split('='))); }
async function userFromRequest(req) {
  const token = cookies(req).pakjai_access_token;
  if (!token) return null;
  const { data: { user }, error } = await supabase().auth.getUser(decodeURIComponent(token));
  return error ? null : user;
}
function publicProfile(profile) { return profile ? { id: profile.id, username: profile.username, email: profile.email, nickname: profile.nickname || profile.username, nicknameColor: profile.nickname_color || '#34a887', bio: profile.bio || '', profileImage: profile.avatar_path || '', coverImage: profile.cover_path || '', pet: profile.pet || '', tree: profile.tree || '', zodiac: profile.zodiac || '' } : null; }
module.exports = async function handler(req, res) {
  try {
    const client = supabase();
    if (req.method === 'GET') {
      const user = await userFromRequest(req);
      if (!user) return res.status(200).json({ success: false, user: null });
      const { data: profile } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
      return res.status(200).json({ success: true, user: publicProfile(profile) });
    }
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const { action, username, email, password } = req.body || {};
    if (action === 'logout') { res.setHeader('Set-Cookie', 'pakjai_access_token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax'); return res.json({ success: true }); }
    if (!password || password.length < 6) return res.status(400).json({ success: false, error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
    if (action === 'signup') {
      const normalizedUsername = String(username || '').trim();
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (normalizedUsername.length < 3 || !normalizedEmail) return res.status(400).json({ success: false, error: 'กรุณากรอกข้อมูลสมัครสมาชิกให้ครบถ้วน' });

      // Check the profile table before creating the Supabase auth user. This
      // prevents a duplicate username from creating an unusable auth account.
      const { data: existingUsername } = await client.from('profiles').select('id').eq('username', normalizedUsername).maybeSingle();
      if (existingUsername) return res.status(409).json({ success: false, error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น' });
      const { data: existingEmail } = await client.from('profiles').select('id').eq('email', normalizedEmail).maybeSingle();
      if (existingEmail) return res.status(409).json({ success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น' });

      const { data, error } = await client.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { username: normalizedUsername } }
      });
      if (error) return res.status(400).json({ success: false, error: error.message });
      if (!data.user) return res.status(400).json({ success: false, error: 'ไม่สามารถสร้างบัญชีได้' });
      const { data: profile, error: profileError } = await client.from('profiles').upsert({ id: data.user.id, username: normalizedUsername, email: normalizedEmail, nickname: normalizedUsername }).select().single();
      if (profileError) {
        if (profileError.code === '23505' && profileError.message.includes('profiles_username_key')) {
          return res.status(409).json({ success: false, error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น' });
        }
        if (profileError.code === '23505' && profileError.message.includes('profiles_email_key')) {
          return res.status(409).json({ success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น' });
        }
        return res.status(500).json({ success: false, error: profileError.message });
      }

      if (data.session?.access_token) {
        res.setHeader('Set-Cookie', `pakjai_access_token=${encodeURIComponent(data.session.access_token)}; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax`);
        return res.status(201).json({ success: true, user: publicProfile(profile), emailConfirmationRequired: false });
      }
      return res.status(201).json({ success: true, user: null, emailConfirmationRequired: true, message: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ' });
    }
    if (action === 'login') {
      const identity = String(username || '').trim();
      const normalizedIdentity = identity.toLowerCase();
      // Resolve username and email separately. PostgREST's .or() syntax can
      // fail for usernames containing punctuation, causing a valid account to
      // be sent to Supabase with the username instead of its email address.
      const { data: byUsername } = await client.from('profiles').select('email').eq('username', identity).maybeSingle();
      const { data: byEmail } = await client.from('profiles').select('email').eq('email', normalizedIdentity).maybeSingle();
      const loginEmail = byUsername?.email || byEmail?.email || (identity.includes('@') ? normalizedIdentity : null);
      if (!loginEmail) return res.status(401).json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
      const { data, error } = await client.auth.signInWithPassword({ email: loginEmail, password });
      if (error || !data.user) return res.status(401).json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
      const { data: profile } = await client.from('profiles').select('*').eq('id', data.user.id).single();
      res.setHeader('Set-Cookie', `pakjai_access_token=${encodeURIComponent(data.session.access_token)}; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax`);
      return res.json({ success: true, user: publicProfile(profile) });
    }
    return res.status(400).json({ success: false, error: 'คำสั่งไม่ถูกต้อง' });
  } catch (error) { console.error(error); return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase' }); }
};
module.exports.userFromRequest = userFromRequest;
module.exports.publicProfile = publicProfile;
module.exports.supabase = supabase;
