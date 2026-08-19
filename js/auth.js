window.PAKJAI_API_BASE_URL = window.location.port === '5500' ? 'http://localhost:3000' : '';

document.addEventListener('DOMContentLoaded', () => {
    setupAuthTabs();
    setupAuthForms();
    checkExistingSession();
});

function setupAuthTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.auth-form');
    const savedTab = sessionStorage.getItem('pakjaiAuthTab') || 'login';

    function switchTab(tabName, shouldFocus = false) {
        tabs.forEach(btn => {
            const isActive = btn.dataset.tab === tabName;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', String(isActive));
        });

        forms.forEach(form => {
            const isActive = form.id === `${tabName}Form`;
            form.classList.toggle('active', isActive);
            form.hidden = !isActive;
        });

        sessionStorage.setItem('pakjaiAuthTab', tabName);
        clearMessage();

        if (shouldFocus) {
            const activeForm = document.getElementById(`${tabName}Form`);
            activeForm?.querySelector('input')?.focus();
        }
    }

    tabs.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab, true));
    });

    switchTab(savedTab);
}

function setupAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;

            if (!username || !password) {
                return showMessage('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'error');
            }

            setLoading(loginForm, true, 'กำลังเข้าสู่ระบบ...');
            await submitAuth({ action: 'login', username, password }, 'เข้าสู่ระบบสำเร็จ 🍃 กำลังพาคุณไปที่หน้าหลัก...');
            setLoading(loginForm, false, 'เข้าสู่ระบบ');
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signupUsername').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupPasswordConfirm').value;

            if (username.length < 3) {
                return showMessage('ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร', 'error');
            }
            if (password.length < 6) {
                return showMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'error');
            }
            if (password !== confirmPassword) {
                return showMessage('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน', 'error');
            }

            setLoading(signupForm, true, 'กำลังสร้างบัญชี...');
            await submitAuth({ action: 'signup', username, email, password }, 'สมัครสมาชิกสำเร็จ 🌲 ยินดีต้อนรับสู่ Pakjai!');
            setLoading(signupForm, false, 'สมัครสมาชิก');
        });
    }
}

async function submitAuth(payload, successMessage) {
    try {
        const response = await fetch(`${window.PAKJAI_API_BASE_URL}/api/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        });

        const contentType = response.headers.get('content-type') || '';
        let result = {};
        if (contentType.includes('application/json')) {
            result = await response.json();
        }

        if (result.emailConfirmationRequired) return showMessage(result.message, 'success');
        if (!response.ok || !result.success || !result.user) return showMessage(result.error || `การดำเนินการไม่สำเร็จ (${response.status})`, 'error');

        Storage.setCurrentUser(result.user);
        showMessage(successMessage, 'success');
        setTimeout(() => window.location.assign('/pakjai/dashboard.html'), 600);
    } catch (error) {
        console.error('Supabase Auth API unavailable:', error);
        showMessage('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง', 'error');
    }
}

function handleOfflineAuth(payload) {
    const { action, username, email } = payload;
    const users = Storage.getUsers();

    if (action === 'login') {
        const user = users.find(u =>
            u.username.toLowerCase() === username.toLowerCase() ||
            u.email?.toLowerCase() === username.toLowerCase()
        );
        if (user) return user;
        // Auto create demo user if local dev
        const newUser = {
            id: 'u-' + Date.now(),
            username,
            nickname: username,
            nicknameColor: '#2e8b68',
            email: `${username}@local.test`,
            bio: 'สมาชิกใหม่แห่งพื้นที่พักใจ 🍃',
            pet: '🐱',
            tree: '🌳',
            followers: [],
            following: ['user-nature-guide'],
            posts: []
        };
        Storage.saveUser(newUser);
        return newUser;
    }

    if (action === 'signup') {
        const newUser = {
            id: 'u-' + Date.now(),
            username,
            nickname: username,
            nicknameColor: '#2e8b68',
            email,
            bio: 'สมาชิกใหม่แห่งพื้นที่พักใจ 🍃',
            pet: '🐱',
            tree: '🌳',
            followers: [],
            following: ['user-nature-guide'],
            posts: []
        };
        Storage.saveUser(newUser);
        return newUser;
    }

    return null;
}

function showMessage(text, type) {
    const messageEl = document.getElementById('authMessage');
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `auth-message ${type} show`;
}

function clearMessage() {
    const messageEl = document.getElementById('authMessage');
    if (!messageEl) return;
    messageEl.textContent = '';
    messageEl.className = 'auth-message';
}

function setLoading(form, isLoading, text) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = isLoading;
    btn.textContent = text;
}

async function checkExistingSession() {
    try {
        const currentUser = await Storage.getServerSession();
        if (currentUser && currentUser.username) {
            window.location.assign('/pakjai/dashboard.html');
        }
    } catch (error) {
        console.warn('Session verification error:', error);
    }
}