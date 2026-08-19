const { userFromRequest, supabase, publicProfile } = require('./auth');

async function requireUser(req, res) {
  const user = await userFromRequest(req);
  if (!user) { res.status(401).json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }); return null; }
  return user;
}
async function signedMedia(client, bucket, path) {
  if (!path) return '';
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
async function profileWithSocial(client, profile, viewerId) {
  if (!profile) return null;
  const [{ data: followers }, { data: following }] = await Promise.all([
    client.from('follows').select('follower_id').eq('following_id', profile.id),
    client.from('follows').select('following_id').eq('follower_id', profile.id)
  ]);
  return { ...publicProfile(profile), profileImage: await signedMedia(client, 'avatars', profile.avatar_path), coverImage: await signedMedia(client, 'covers', profile.cover_path), followers: (followers || []).map(x => x.follower_id), following: (following || []).map(x => x.following_id) };
}

function normalizePost(post, comments = [], reactions = []) {
  const grouped = { like: [], thanks: [], hug: [] };
  reactions.forEach(r => grouped[r.reaction_type]?.push(r.user_id));
  return { ...post, userId: post.author_id, image: post.image_path || '', audio: post.audio_path || '', timestamp: post.created_at, likes: grouped.like, thanks: grouped.thanks, hugs: grouped.hug, comments: comments.map(c => ({ ...c, userId: c.author_id, text: c.body, timestamp: c.created_at })) };
}
async function getPosts(client, query = {}) {
  let request = client.from('posts').select('*').order('created_at', { ascending: false });
  if (query.author_id) request = request.eq('author_id', query.author_id);
  if (query.id) request = request.eq('id', query.id);
  const { data: posts, error } = await request;
  if (error) throw error;
  const visiblePosts = (posts || []).filter(post => post.visibility === 'public' || post.author_id === query.viewer_id);
  return Promise.all(visiblePosts.map(async post => {
    const [{ data: comments }, { data: reactions }] = await Promise.all([
      client.from('comments').select('*').eq('post_id', post.id).order('created_at'),
      client.from('post_reactions').select('*').eq('post_id', post.id)
    ]);
    const { data: author } = await client.from('profiles').select('username,nickname,nickname_color,avatar_path').eq('id', post.author_id).maybeSingle();
    const normalized = normalizePost(post, comments || [], reactions || []);
    normalized.image = await signedMedia(client, 'posts', post.image_path);
    normalized.audio = await signedMedia(client, 'posts', post.audio_path);
    return { ...normalized, username: author?.username || '', nickname: author?.nickname || '', profileImage: await signedMedia(client, 'avatars', author?.avatar_path), nicknameColor: author?.nickname_color || '#2e8b68' };
  }));
}
module.exports = async function handler(req, res) {
  try {
    const client = supabase();
    const user = await requireUser(req, res); if (!user) return;
    const action = req.query.action || req.body?.action;
    if (req.method === 'GET' && action === 'profile') {
      const identifier = String(req.query.username || req.query.id || '');
      const { data: profile } = await client.from('profiles').select('*').or(`id.eq.${identifier},username.eq.${identifier}`).maybeSingle();
      if (!profile) return res.status(404).json({ success: false, error: 'ไม่พบโปรไฟล์' });
      const posts = await getPosts(client, { author_id: profile.id, viewer_id: user.id });
      return res.json({ success: true, user: await profileWithSocial(client, profile, user.id), posts });
    }
    if (req.method === 'GET' && action === 'posts') {
      let posts = await getPosts(client, { viewer_id: user.id });
      if (req.query.q) { const term = String(req.query.q).toLowerCase(); posts = posts.filter(p => String(p.caption || '').toLowerCase().includes(term)); }
      return res.json({ success: true, posts });
    }
    if (req.method === 'GET' && action === 'users') {
      const { data } = await client.from('profiles').select('*').order('username');
      return res.json({ success: true, users: await Promise.all((data || []).map(profile => profileWithSocial(client, profile, user.id))) });
    }
    if (req.method === 'GET' && action === 'messages') {
      const other = req.query.user;
      const { data, error } = await client.from('messages').select('*').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at');
      if (error) throw error;
      const messages = (data || []).filter(m => !other || ((m.sender_id === other || m.recipient_id === other) && (m.sender_id === user.id || m.recipient_id === user.id)));
      return res.json({ success: true, messages: messages.map(m => ({ ...m, senderId: m.sender_id, receiverId: m.recipient_id, text: m.body, timestamp: m.created_at })) });
    }
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const body = req.body || {};
    if (action === 'profile') {
      const allowed = {}; ['nickname','nickname_color','bio','pet','tree','zodiac','avatar_path','cover_path'].forEach(k => { if (body[k] !== undefined) allowed[k] = body[k]; });
      const { data, error } = await client.from('profiles').update(allowed).eq('id', user.id).select().single(); if (error) throw error;
      return res.json({ success: true, user: await profileWithSocial(client, data, user.id) });
    }
    if (action === 'post') {
      if (body.operation === 'delete') { const { error } = await client.from('posts').delete().eq('id', body.id).eq('author_id', user.id); if (error) throw error; return res.json({ success: true }); }
      if (body.operation === 'update') { const updates = { caption: String(body.caption || '') }; if (body.image_path !== undefined) updates.image_path = body.image_path || null; if (body.audio_path !== undefined) updates.audio_path = body.audio_path || null; const { data, error } = await client.from('posts').update(updates).eq('id', body.id).eq('author_id', user.id).select().single(); if (error) throw error; return res.json({ success: true, post: normalizePost(data) }); }
      const { data, error } = await client.from('posts').insert({ author_id: user.id, caption: String(body.caption || ''), image_path: body.image_path || null, audio_path: body.audio_path || null, visibility: body.visibility || 'public' }).select().single(); if (error) throw error;
      return res.status(201).json({ success: true, post: normalizePost(data) });
    }
    if (action === 'comment') { const { data, error } = await client.from('comments').insert({ post_id: body.post_id, author_id: user.id, body: String(body.text || '') }).select().single(); if (error) throw error; return res.status(201).json({ success: true, comment: data }); }
    if (action === 'reaction') { const type = body.reaction_type; const { error: removeError } = await client.from('post_reactions').delete().eq('post_id', body.post_id).eq('user_id', user.id).eq('reaction_type', type); if (removeError) throw removeError; if (body.active) { const { error } = await client.from('post_reactions').insert({ post_id: body.post_id, user_id: user.id, reaction_type: type }); if (error) throw error; } return res.json({ success: true }); }
    if (action === 'follow') { if (body.following_id === user.id) return res.status(400).json({ success: false, error: 'ไม่สามารถติดตามตัวเองได้' }); const { error } = body.active ? await client.from('follows').upsert({ follower_id: user.id, following_id: body.following_id }) : await client.from('follows').delete().eq('follower_id', user.id).eq('following_id', body.following_id); if (error) throw error; return res.json({ success: true }); }
    if (action === 'message') { if (body.recipient_id === user.id) return res.status(400).json({ success: false, error: 'ไม่สามารถส่งข้อความหาตัวเองได้' }); const { data, error } = await client.from('messages').insert({ sender_id: user.id, recipient_id: body.recipient_id, body: String(body.text || '') }).select().single(); if (error) throw error; return res.status(201).json({ success: true, message: data }); }
    return res.status(400).json({ success: false, error: 'คำสั่งไม่ถูกต้อง' });
  } catch (error) { console.error('Data API error:', error); return res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' }); }
};
