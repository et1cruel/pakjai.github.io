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
        return JSON.parse(localStorage.getItem('currentUser'));
    },

    setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.saveUser(user);
    },

    logout() {
        localStorage.removeItem('currentUser');
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