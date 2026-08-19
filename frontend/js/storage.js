const API_BASE_URL = window.PAKJAI_API_BASE_URL ?? (['5500', '5501'].includes(window.location.port) ? 'http://localhost:3000' : '');

const DEFAULT_USERS = [
    {
        id: 'user-nature-guide',
        username: 'pakjai_official',
        nickname: '🌲 พี่ต้นไม้ พักใจ',
        nicknameColor: '#2e8b68',
        email: 'hello@pakjai.app',
        bio: 'ยินดีต้อนรับสู่พื้นที่พักใจ 🍃 หายใจเข้าลึกๆ แล้วพักผ่อนไปด้วยกันนะ',
        pet: '🦉',
        tree: '🌳',
        profileImage: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=200&q=80',
        coverImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
        followers: ['user-somying', 'user-earth'],
        following: ['user-somying', 'user-earth'],
        posts: []
    },
    {
        id: 'user-somying',
        username: 'somying_green',
        nickname: '🌿 สมหญิง ชวนปลูก',
        nicknameColor: '#34a887',
        email: 'somying@example.com',
        bio: 'รักต้นไม้ รักแมว และชอบฟังเสียงฝนตก 🌧️🐱',
        pet: '🐱',
        tree: '🌱',
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        coverImage: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1200&q=80',
        followers: ['user-nature-guide'],
        following: ['user-nature-guide'],
        posts: []
    },
    {
        id: 'user-earth',
        username: 'peaceful_mind',
        nickname: '☕ ภูผา สบายใจ',
        nicknameColor: '#458588',
        email: 'earth@example.com',
        bio: 'วันนี้เหนื่อยไหม แวะมาจิบชากันก่อนนะ 🫖',
        pet: '🐼',
        tree: '🎋',
        profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        coverImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
        followers: ['user-nature-guide'],
        following: ['user-nature-guide'],
        posts: []
    }
];

const DEFAULT_POSTS = [
    {
        id: 'post-welcome-1',
        userId: 'user-nature-guide',
        username: 'pakjai_official',
        caption: 'สูดอากาศบริสุทธิ์ให้เต็มปอด 🌲 วันนี้ไม่ว่าคุณจะเจอเรื่องอะไรมา ขอให้รู้ว่าตรงนี้มีพื้นที่ให้คุณได้วางความเหนื่อยล้าลงเสมอครับ 💚 #พักใจ #ธรรมชาติบำบัด #กำลังใจ',
        image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=80',
        audio: '',
        visibility: 'public',
        timestamp: '2026-08-15T08:51:25.000Z',
        likes: ['user-somying', 'user-earth'],
        thanks: ['user-somying'],
        hugs: ['user-earth'],
        savedBy: [],
        comments: [
            {
                id: 'c1',
                userId: 'user-somying',
                username: 'somying_green',
                text: 'เห็นภาพแล้วรู้สึกสงบใจขึ้นเยอะเลยค่ะ ขอบคุณนะคะ 🌸',
                timestamp: '2026-08-15T09:51:25.000Z'
            }
        ]
    },
    {
        id: 'post-welcome-2',
        userId: 'user-somying',
        username: 'somying_green',
        caption: 'ต้นอ่อนกระบองเพชรที่เพิ่งแตกหน่อใหม่วันนี้ 🌵 ชีวิตเล็กๆ ที่กำลังเติบโตอย่างใจเย็น #ต้นไม้ของฉัน #สุขใจ #แมวและต้นไม้',
        image: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=1000&q=80',
        audio: '',
        visibility: 'public',
        timestamp: '2026-08-15T05:51:25.000Z',
        likes: ['user-nature-guide'],
        thanks: [],
        hugs: ['user-nature-guide'],
        savedBy: [],
        comments: []
    }
];

// LocalStorage helper functions
const matchesIdentifier = (user, identifier) =>
    user.id === identifier ||
    user.username?.toLowerCase() === identifier.toLowerCase() ||
    user.email?.toLowerCase() === identifier.toLowerCase();

const Storage = {
    init() {
        // Legacy cache is intentionally retained during migration; Supabase/API is authoritative.
    },

    async request(action, options = {}) {
        const params = new URLSearchParams({ action, ...(options.query || {}) });
        const response = await fetch(`${API_BASE_URL}/api/data?${params}`, {
            method: options.method || 'GET', credentials: 'include',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'API request failed');
        return result;
    },

    async getPosts(query = {}) { return (await this.request('posts', { query })).posts || []; },
    async getUsersFromServer() { return (await this.request('users')).users || []; },
    async getProfile(identifier) { return this.request('profile', { query: { username: identifier } }); },
    async saveProfile(profile) { return this.request('profile', { method: 'POST', body: profile }); },
    async createPost(post) { return this.request('post', { method: 'POST', body: post }); },
    async updatePost(post) { return this.request('post', { method: 'POST', body: { ...post, operation: 'update' } }); },
    async deletePost(id) { return this.request('post', { method: 'POST', body: { id, operation: 'delete' } }); },
    async addComment(post_id, text) { return this.request('comment', { method: 'POST', body: { post_id, text } }); },
    async react(post_id, reaction_type, active) { return this.request('reaction', { method: 'POST', body: { post_id, reaction_type, active } }); },
    async follow(following_id, active) { return this.request('follow', { method: 'POST', body: { following_id, active } }); },
    async getMessages(user) { return (await this.request('messages', { query: { user } })).messages || []; },
    async sendMessage(recipient_id, text) { return this.request('message', { method: 'POST', body: { recipient_id, text } }); },
    async uploadFile(bucket, file, path) {
        const body = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
        const response = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bucket, path, contentType: file.type, body }) });
        const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Upload failed'); return result;
    },

    // Users data
    getUsers() {
        try {
            return JSON.parse(localStorage.getItem('users')) || [];
        } catch {
            localStorage.setItem('users', JSON.stringify(DEFAULT_USERS));
            return DEFAULT_USERS;
        }
    },

    saveUser(user) {
        const users = this.getUsers();
        const index = user.id ? users.findIndex(u => u.id === user.id) : -1;
        if (index >= 0) {
            users[index] = { ...users[index], ...user };
        } else {
            if (this.userExists(user.username, user.email)) {
                throw new Error('A user with this username or email already exists');
            }
            users.push(user);
        }
        localStorage.setItem('users', JSON.stringify(users));
    },

    getUser(identifier) {
        if (!identifier) return null;
        const users = this.getUsers();
        const currentUser = this.getCurrentUser();
        const target = users.find(u => matchesIdentifier(u, identifier));
        if (target) return target;
        if (currentUser && matchesIdentifier(currentUser, identifier)) {
            return currentUser;
        }
        return null;
    },

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('currentUser'));
        } catch {
            return null;
        }
    },

    async getServerSession() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth`, {
                credentials: 'include',
                headers: { Accept: 'application/json' }
            });
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) return null;
            const result = await response.json();
            if (!response.ok || !result.success || !result.user) {
                localStorage.removeItem('currentUser');
                return null;
            }
            this.setCurrentUser(result.user);
            return result.user;
        } catch (err) {
            return null;
        }
    },

    setCurrentUser(user) {
        if (!user) return;
        // Keep only a short-lived display cache; database/API remains authoritative.
        localStorage.setItem('currentUser', JSON.stringify(user));
    },

    async logout() {
        try {
            await fetch(`${API_BASE_URL}/api/auth`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            });
        } catch (e) {
            console.warn('Logout API failed or offline:', e);
        } finally {
            localStorage.removeItem('currentUser');
        }
    },

    userExists(username, email) {
        const users = this.getUsers();
        const normUser = (username || '').trim().toLowerCase();
        const normEmail = (email || '').trim().toLowerCase();
        return users.some(u =>
            (normUser && u.username?.toLowerCase() === normUser) ||
            (normEmail && u.email?.toLowerCase() === normEmail)
        );
    }
};

// Auto initialize on load
if (typeof localStorage !== 'undefined') Storage.init();

// Export for Node.js (unit tests); no-op in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}