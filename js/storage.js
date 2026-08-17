// LocalStorage helper functions
const Storage = {
    // Users data
    saveUser(user) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const index = users.findIndex(existing => existing.id === user.id || existing.username === user.username);
        if (index >= 0) users[index] = { ...users[index], ...user };
        else users.push(user);
        localStorage.setItem('users', JSON.stringify(users));
    },

    getUser(username) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const currentUser = this.getCurrentUser();
        return users.find(u => u.username === username || u.email === username)
            || (currentUser && (currentUser.username === username || currentUser.email === username) ? currentUser : null);
    },

    getCurrentUser() {
        try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
    },

    async getServerSession() {
        const response = await fetch('/api/auth', { credentials: 'include', headers: { Accept: 'application/json' } });
        const result = await response.json();
        if (!response.ok || !result.success) return null;
        this.setCurrentUser(result.user);
        return result.user;
    },

    setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.saveUser(user);
    },

    async logout() {
        try { await fetch('/api/auth', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }); } finally {
            localStorage.removeItem('currentUser');
        }
    },

    userExists(username, email) {
        let users = JSON.parse(localStorage.getItem('users')) || [];
        return users.some(u => u.username === username || u.email === email);
    }
};

// Export for Node.js (unit tests); no-op in the browser.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}