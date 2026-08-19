const { createClient } = require('@supabase/supabase-js');

function supabase() {
  const rawUrl = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const supabaseUrl = rawUrl.replace(/\/rest\/v1$/i, '');
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase server environment is not configured');
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

function logAuth(event, details = {}) {
  // Never log passwords, access tokens, or service-role keys.
  console.info(`[auth] ${event}`, { ...details, supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY), supabaseHost: process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : null });
}

function authFailure(error) {
  const code = error?.code || error?.status || 'unknown';
  if (code === 'email_not_confirmed' || error?.message?.toLowerCase().includes('email not confirmed')) return { status: 403, message: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ' };
  if (code === 'invalid_credentials') return { status: 401, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
  return { status: 502, message: 'ระบบยืนยันตัวตนขัดข้อง กรุณาลองใหม่อีกครั้ง', code };
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
    if (action === 'reset-password') {
      const user = await userFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว' });
      const newPassword = String(password || '');
      if (newPassword.length < 6) return res.status(400).json({ success: false, error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
      const { error } = await client.auth.admin.updateUserById(user.id, { password: newPassword });
      if (error) return res.status(400).json({ success: false, error: error.message });
      return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' });
    }
    if (action === 'forgot-password') {
      const recoveryEmail = String(email || '').trim().toLowerCase();
      if (!recoveryEmail) return res.status(400).json({ success: false, error: 'กรุณากรอกอีเมล' });
      const redirectTo = `${process.env.PUBLIC_SITE_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`}/pakjai/index.html`;
      const { error } = await client.auth.resetPasswordForEmail(recoveryEmail, { redirectTo });
      if (error) {
        console.error('[auth] password_recovery_failed', { email: recoveryEmail, errorCode: error.code, errorStatus: error.status, errorMessage: error.message });
        return res.status(502).json({ success: false, error: error.message });
      }
      return res.json({ success: true, message: 'ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลแล้ว กรุณาตรวจสอบ Inbox หรือ Spam' });
    }
    if (!password || password.length < 6) return res.status(400).json({ success: false, error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
    if (action === 'signup') {
      const normalizedUsername = String(username || '').trim();
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (normalizedUsername.length < 3 || !normalizedEmail) return res.status(400).json({ success: false, error: 'กรุณากรอกข้อมูลสมัครสมาชิกให้ครบถ้วน' });

      // Check the profile table before creating the Supabase auth user. This
      // prevents a duplicate username from creating an unusable auth account.
      const { data: existingUsername } = await client.from('profiles').select('id').eq('username', normalizedUsername).maybeSingle();
      if (existingUsername) return res.status(409).json({ success: false, error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น' });
      const { data: existingEmail } = await client.from('profiles').select('id').ilike('email', normalizedEmail).maybeSingle();
      if (existingEmail) return res.status(409).json({ success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น' });

      // Supabase can intentionally return a seemingly successful response for
      // an email that already exists (to prevent account enumeration). Check
      // Auth users as well, otherwise a second signup can leave a profile
      // pointing at the wrong account and make the original login confusing.
      const { data: authUsers, error: authUsersError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (!authUsersError && authUsers.users.some(user => user.email?.toLowerCase() === normalizedEmail)) {
        return res.status(409).json({ success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น' });
      }

      const { data, error } = await client.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { username: normalizedUsername } }
      });
      if (error) return res.status(400).json({ success: false, error: error.message });
      if (!data.user) return res.status(400).json({ success: false, error: 'ไม่สามารถสร้างบัญชีได้' });
      // signUp may return an existing user without an error. Do not overwrite
      // that user's profile with the new username from this signup attempt.
      if (!data.user.identities || data.user.identities.length === 0) {
        return res.status(409).json({ success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น' });
      }
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
      const { data: byUsername, error: usernameLookupError } = await client.from('profiles').select('email').eq('username', identity).maybeSingle();
      const { data: byEmail, error: emailLookupError } = await client.from('profiles').select('email').ilike('email', normalizedIdentity).maybeSingle();
      if (usernameLookupError || emailLookupError) {
        logAuth('profile_lookup_failed', { identity, usernameError: usernameLookupError?.message, emailError: emailLookupError?.message });
        return res.status(500).json({ success: false, error: 'ไม่สามารถค้นหาบัญชีผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง' });
      }
      const loginEmail = byUsername?.email || byEmail?.email || (identity.includes('@') ? normalizedIdentity : null);
      if (!loginEmail) {
        logAuth('profile_not_found', { identity });
        return res.status(401).json({ success: false, error: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ' });
      }
      logAuth('sign_in_attempt', { identity, loginEmail });
      const { data, error } = await client.auth.signInWithPassword({ email: loginEmail, password });
      if (error || !data.user || !data.session) {
        const failure = authFailure(error);
        logAuth('sign_in_failed', { identity, loginEmail, authCode: error?.code, authStatus: error?.status, authMessage: error?.message });
        return res.status(failure.status).json({ success: false, error: failure.message, errorCode: failure.code });
      }
      logAuth('sign_in_succeeded', { identity, userId: data.user.id, emailConfirmedAt: data.user.email_confirmed_at || null });
      let { data: profile, error: profileLookupError } = await client.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      if (profileLookupError) {
        logAuth('profile_by_auth_id_failed', { userId: data.user.id, error: profileLookupError.message });
        return res.status(500).json({ success: false, error: 'ไม่สามารถโหลดโปรไฟล์ของบัญชีนี้ได้' });
      }
      // Repair accounts created before profile creation completed. Without a
      // profile, username login cannot work after email confirmation.
      if (!profile) {
        const requestedUsername = data.user_metadata?.username || loginEmail.split('@')[0];
        const safeUsername = requestedUsername.replace(/[^a-zA-Z0-9ก-๙._-]/g, '').slice(0, 40) || 'member';
        const { data: profileByEmail } = await client.from('profiles').select('*').ilike('email', data.user.email || loginEmail).maybeSingle();
        if (profileByEmail) {
          profile = profileByEmail;
        } else {
          const { data: repairedProfile, error: repairError } = await client.from('profiles').insert({ id: data.user.id, username: `${safeUsername}-${data.user.id.slice(0, 8)}`, email: data.user.email || loginEmail, nickname: requestedUsername }).select().single();
          if (repairError) return res.status(500).json({ success: false, error: 'เข้าสู่ระบบได้ แต่ไม่สามารถสร้างข้อมูลโปรไฟล์ได้' });
          profile = repairedProfile;
        }
      }
      res.setHeader('Set-Cookie', `pakjai_access_token=${encodeURIComponent(data.session.access_token)}; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax`);
      return res.json({ success: true, user: publicProfile(profile) });
    }
    return res.status(400).json({ success: false, error: 'คำสั่งไม่ถูกต้อง' });
  } catch (error) {
    logAuth('request_failed', { error: error?.message, errorCode: error?.code, errorStatus: error?.status });
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase' });
  }
};
module.exports.userFromRequest = userFromRequest;
module.exports.publicProfile = publicProfile;
module.exports.supabase = supabase;
