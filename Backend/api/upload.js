const { userFromRequest, supabase } = require('./auth');
module.exports = async function handler(req, res) {
  try {
    const user = await userFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'กรุณาเข้าสู่ระบบ' });
    if (req.method === 'GET') {
      const { bucket, path } = req.query || {};
      if (!['avatars', 'covers', 'posts', 'artworks'].includes(bucket) || !path) return res.status(400).json({ success: false, error: 'ข้อมูลไฟล์ไม่ครบถ้วน' });
      if (!path.startsWith(`${user.id}/`)) return res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์อ่านไฟล์นี้' });
      const { data, error } = await supabase().storage.from(bucket).createSignedUrl(path, 3600);
      if (error) throw error;
      return res.json({ success: true, signedUrl: data.signedUrl });
    }
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const { bucket, path, contentType, body } = req.body || {};
    if (!['avatars', 'covers', 'posts', 'artworks'].includes(bucket) || !path || !body) return res.status(400).json({ success: false, error: 'ข้อมูลไฟล์ไม่ครบถ้วน' });
    if (!path.startsWith(`${user.id}/`) && !path.includes(`/${user.id}/`)) return res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์ใช้ path นี้' });
    const buffer = Buffer.from(String(body).replace(/^data:[^;]+;base64,/, ''), 'base64');
    const { error } = await supabase().storage.from(bucket).upload(path, buffer, { contentType: contentType || 'application/octet-stream', upsert: true });
    if (error) throw error;
    const { data: signed, error: signedError } = await supabase().storage.from(bucket).createSignedUrl(path, 3600);
    if (signedError) throw signedError;
    return res.json({ success: true, path, signedUrl: signed.signedUrl });
  } catch (error) { console.error('Upload API error:', error); return res.status(500).json({ success: false, error: 'อัปโหลดไฟล์ไม่สำเร็จ' }); }
};
