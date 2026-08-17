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

// Login: credentials are verified by the server; passwords never enter localStorage.
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    await submitAuth({ action: 'login', username, password }, 'เข้าสู่ระบบสำเร็จ ✓');
});

// Signup: the API persists the user in Supabase (Vercel instances are stateless).
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupPasswordConfirm').value;

    if (username.length < 3) return showMessage('ชื่อผู้ใช้ต้องมากกว่า 3 ตัวอักษร', 'error');
    if (password.length < 6) return showMessage('รหัสผ่านต้องมากกว่า 6 ตัวอักษร', 'error');
    if (password !== confirmPassword) return showMessage('รหัสผ่านไม่ตรงกัน', 'error');
    await submitAuth({ action: 'signup', username, email, password }, 'สมัครสมาชิกสำเร็จ ✓');
});

async function submitAuth(payload, successMessage) {
    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        });
        const contentType = response.headers.get('content-type') || '';
        const result = contentType.includes('application/json') ? await response.json() : {};
        if (!response.ok || !result.success || !result.user) {
            return showMessage(result.error || `เซิร์ฟเวอร์ตอบกลับผิดพลาด (${response.status})`, 'error');
        }
        Storage.setCurrentUser(result.user);
        showMessage(successMessage, 'success');
        window.setTimeout(() => { window.location.assign('/pakjai/dashboard.html'); }, 500);
    } catch (error) {
        console.error('Authentication request failed:', error);
        showMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง', 'error');
    }
}

function showMessage(text, type) {
    const messageEl = document.getElementById('authMessage');
    messageEl.textContent = text;
    messageEl.className = `auth-message ${type}`;
}

// Check if already logged in
window.addEventListener('load', async () => {
    try {
        const currentUser = await Storage.getServerSession();
        if (currentUser) window.location.assign('/pakjai/dashboard.html');
    } catch (error) {
        console.warn('Session check failed:', error);
    }
});