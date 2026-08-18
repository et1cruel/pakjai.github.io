const mongoose = require('mongoose');
const crypto = require('crypto');

const SESSION_DAYS = 30;
let connectionPromise;

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  bio: { type: String, default: '' },
  profileImage: { type: String, default: '' },
  followers: { type: [String], default: [] },
  following: { type: [String], default: [] },
  posts: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'PakjaiUser' },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const User = mongoose.models.PakjaiUser || mongoose.model('PakjaiUser', userSchema);
const Session = mongoose.models.PakjaiSession || mongoose.model('PakjaiSession', sessionSchema);

function connectDatabase() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured in Vercel');
  connectionPromise ??= mongoose.connect(process.env.MONGO_URI, { bufferCommands: false });
  return connectionPromise;
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
    bio: user.bio || '', profileImage: user.profileImage || '',
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
  const cookies = {};
  for (const value of (req.headers.cookie || '').split(';').filter(Boolean)) {
    const index = value.indexOf('=');
    if (index < 0) continue;
    try {
      cookies[value.slice(0, index).trim()] = decodeURIComponent(value.slice(index + 1).trim());
    } catch {
      // Ignore malformed cookie values and continue parsing valid cookies.
    }
  }
  return cookies;
}

function setSessionCookie(res, token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  res.setHeader('Set-Cookie', `pakjai_session=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'pakjai_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
}

async function createSession(user, res) {
  const token = createSessionToken();
  await Session.create({ tokenHash: hashToken(token), userId: user._id, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000) });
  setSessionCookie(res, token);
}

async function getSessionUser(req) {
  const token = readCookies(req).pakjai_session;
  if (!token) return null;
  const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  return User.findById(session.userId);
}

module.exports = async function handler(req, res) {
  try {
    await connectDatabase();

    if (req.method === 'GET') {
      const user = await getSessionUser(req);
      return res.json({ success: Boolean(user), user: user ? publicUser(user) : null });
    }
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const { action, username, email, password } = req.body || {};
    if (action === 'logout') {
      const token = readCookies(req).pakjai_session;
      if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
      clearSessionCookie(res);
      return res.json({ success: true });
    }
    if (!password || password.length < 6) return res.status(400).json({ success: false, error: 'รหัสผ่านต้องมากกว่า 6 ตัวอักษร' });

    if (action === 'signup') {
      if (!username || username.trim().length < 3 || !email) return res.status(400).json({ success: false, error: 'ข้อมูลสมัครสมาชิกไม่ครบถ้วน' });
      const normalizedUsername = username.trim();
      const normalizedEmail = email.toLowerCase().trim();
      const existingUsername = await User.exists({ username: normalizedUsername });
      const existingEmail = await User.exists({ email: normalizedEmail });
      if (existingUsername || existingEmail) return res.status(409).json({ success: false, error: 'ชื่อผู้ใช้หรือ Email นี้มีอยู่แล้ว' });
      let user;
      try {
        user = await User.create({ username: normalizedUsername, email: normalizedEmail, passwordHash: hashPassword(password) });
      } catch (error) {
        if (error?.code === 11000) return res.status(409).json({ success: false, error: 'ชื่อผู้ใช้หรือ Email นี้มีอยู่แล้ว' });
        throw error;
      }
      try {
        await createSession(user, res);
      } catch (sessionError) {
        console.error('Session table error:', sessionError);
        try {
          await User.deleteOne({ _id: user._id });
        } catch (rollbackError) {
          console.error('User rollback error:', rollbackError);
        }
        return res.status(500).json({ success: false, error: 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
      }
      return res.status(201).json({ success: true, user: publicUser(user) });
    }

    if (action === 'login') {
      const identity = String(username || '').trim();
      const user = await User.findOne({ $or: [{ username: identity }, { email: identity.toLowerCase() }] });
      if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
      await createSession(user, res);
      return res.json({ success: true, user: publicUser(user) });
    }
    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (error) {
    console.error('MongoDB Auth API error:', error);
    return res.status(500).json({
      success: false,
      error: 'MongoDB ไม่สามารถดำเนินการได้'
    });
  }
};
