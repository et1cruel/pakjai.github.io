// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active form
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(tab + 'Form').classList.add('active');
        
        // Clear message
        document.getElementById('authMessage').textContent = '';
        document.getElementById('authMessage').className = 'auth-message';
    });
});

// Login
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const messageEl = document.getElementById('authMessage');
    
    const user = Storage.getUser(username);
    
    if (!user) {
        showMessage('ไม่พบชื่อผู้ใช้นี้', 'error');
        return;
    }
    
    if (user.password !== password) {
        showMessage('รหัสผ่านไม่ถูกต้อง', 'error');
        return;
    }
    
    // Login success
    Storage.setCurrentUser({
        id: user.id,
        username: user.username,
        email: user.email
    });
    
    showMessage('เข้าสู่ระบบสำเร็จ ✓', 'success');
    setTimeout(() => {
        window.location.href = './dashboard.html';  // ← เปลี่ยนเป็นนี้
    }, 1500);
});

// Signup
document.getElementById('signupForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupPasswordConfirm').value;
    
    // Validation
    if (username.length < 3) {
        showMessage('ชื่อผู้ใช้ต้องมากกว่า 3 ตัวอักษร', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('รหัสผ่านต้องมากกว่า 6 ตัวอักษร', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('รหัสผ่านไม่ตรงกัน', 'error');
        return;
    }
    
    if (Storage.userExists(username, email)) {
        showMessage('ชื่อผู้ใช้หรือ Email นี้มีอยู่แล้ว', 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password,
        bio: '',
        profileImage: '',
        followers: [],
        following: [],
        posts: [],
        createdAt: new Date().toISOString()
    };
    
    Storage.saveUser(newUser);
    Storage.setCurrentUser({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
    });
    
    showMessage('สมัครสมาชิกสำเร็จ ✓', 'success');
    setTimeout(() => {
        window.location.href = './dashboard.html';  // ← เปลี่ยนเป็นนี้
    }, 1500);
});

function showMessage(text, type) {
    const messageEl = document.getElementById('authMessage');
    messageEl.textContent = text;
    messageEl.className = `auth-message ${type}`;
}

// Check if already logged in
window.addEventListener('load', () => {
    const currentUser = Storage.getCurrentUser();
    if (currentUser) {
        window.location.href = './dashboard.html';  // ← เปลี่ยนเป็นนี้
    }
});