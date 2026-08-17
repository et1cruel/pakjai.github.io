// LocalStorage helper functions
const Storage = {
    // Users data
    saveUser(user) {
        let users = JSON.parse(localStorage.getItem('users')) || [];
        users.push(user);
        localStorage.setItem('users', JSON.stringify(users));
    },

    getUser(username) {
        let users = JSON.parse(localStorage.getItem('users')) || [];
        return users.find(u => u.username === username || u.email === username);
    },

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('currentUser'));
    },

    setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
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