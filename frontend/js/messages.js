let currentUser = null;
let currentChatUserId = null;
let currentChatUser = null;
let conversations = [];
let allMessages = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (!currentUser) return;
    await loadConversations();
    setupEventListeners();
    await checkDirectChatParam();
});

// Check authentication
async function checkAuth() {
    currentUser = await Storage.getServerSession().catch(() => Storage.getCurrentUser());
    if (!currentUser || !currentUser.username) {
        window.location.href = '/pakjai/index.html';
        return;
    }
}

// Check direct chat param (?user=...)
async function checkDirectChatParam() {
    const targetUsername = new URLSearchParams(window.location.search).get('user');
    if (targetUsername) {
        const targetUser = await Storage.getProfile(targetUsername).then(r => r.user).catch(() => null);
        if (targetUser && targetUser.username !== currentUser.username) {
            openChat(targetUser.id || targetUser.username, targetUser);
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    document.getElementById('newChatBtn').addEventListener('click', openNewChatModal);
    document.getElementById('conversationSearch').addEventListener('input', (e) => {
        filterConversations(e.target.value);
    });
    document.getElementById('newChatSearchInput').addEventListener('input', (e) => {
        filterNewChatUsers(e.target.value);
    });

    document.getElementById('closeChat').addEventListener('click', closeChat);

    // Modal close
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('newChatModal').classList.remove('active');
        });
    });

    const newChatModal = document.getElementById('newChatModal');
    newChatModal.addEventListener('click', (e) => {
        if (e.target === newChatModal) newChatModal.classList.remove('active');
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await Storage.logout();
        window.location.href = '/pakjai/index.html';
    });
}

// Load conversations
async function loadConversations() {
    try { allMessages = await Storage.getMessages(''); } catch (error) { console.error(error); allMessages = []; }
    const conversationMap = {};

    allMessages.forEach(msg => {
        const p1 = String(msg.senderId);
        const p2 = String(msg.receiverId);
        const myId = String(currentUser.id);
        const myUname = currentUser.username;

        if (p1 === myId || p1 === myUname || p2 === myId || p2 === myUname) {
            const other = (p1 === myId || p1 === myUname) ? p2 : p1;
            const key = [myId, other].sort().join('_');

            if (!conversationMap[key]) {
                conversationMap[key] = {
                    otherIdentifier: other,
                    lastMessage: msg,
                    messages: []
                };
            }
            conversationMap[key].messages.push(msg);
            if (new Date(msg.timestamp) > new Date(conversationMap[key].lastMessage.timestamp)) {
                conversationMap[key].lastMessage = msg;
            }
        }
    });

    conversations = Object.values(conversationMap).sort((a, b) =>
        new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
    );

    displayConversations();
}

// Display conversations
function displayConversations() {
    const container = document.getElementById('conversationsList');
    container.innerHTML = '';

    if (conversations.length === 0) {
        document.getElementById('emptyConversations').style.display = 'flex';
        return;
    }

    document.getElementById('emptyConversations').style.display = 'none';

    conversations.forEach(async conv => {
        const otherUser = await Storage.getProfile(conv.otherIdentifier).then(r => r.user).catch(() => null);
        const otherUsername = otherUser ? (otherUser.nickname || otherUser.username) : conv.otherIdentifier;
        const otherAvatar = otherUser?.profileImage || generateAvatar(otherUsername);

        const item = document.createElement('div');
        const isActive = currentChatUserId && (currentChatUserId === conv.otherIdentifier || (otherUser && currentChatUserId === otherUser.id));
        item.className = `conversation-item ${isActive ? 'active' : ''}`;

        const previewText = conv.lastMessage.text || '';
        const preview = previewText.substring(0, 32) + (previewText.length > 32 ? '...' : '');

        item.innerHTML = `
            <img class="conversation-avatar" src="${otherAvatar}" alt="Avatar">
            <div class="conversation-info">
                <div class="conversation-name">${escapeHtml(otherUsername)}</div>
                <div class="conversation-preview">${escapeHtml(preview)}</div>
            </div>
        `;

        item.addEventListener('click', () => {
            openChat(conv.otherIdentifier, otherUser || { id: conv.otherIdentifier, username: conv.otherIdentifier });
        });

        container.appendChild(item);
    });
}

// Open chat
function openChat(userId, user) {
    currentChatUserId = userId;
    currentChatUser = user;

    document.getElementById('noChatSelected').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'flex';

    const displayName = user.nickname || user.username;
    document.getElementById('chatUserAvatar').src = user.profileImage || generateAvatar(user.username);
    document.getElementById('chatUserName').textContent = displayName;

    displayConversations();
    loadMessages();
}

// Close chat
function closeChat() {
    currentChatUserId = null;
    currentChatUser = null;
    document.getElementById('noChatSelected').style.display = 'flex';
    document.getElementById('chatContainer').style.display = 'none';
    displayConversations();
}

// Load messages for current chat
async function loadMessages() {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.innerHTML = '';

    try { allMessages = await Storage.getMessages(currentChatUser?.id || currentChatUserId); } catch (error) { console.error(error); allMessages = []; }

    const myId = String(currentUser.id);
    const myUname = currentUser.username;
    const otherId = String(currentChatUser?.id || currentChatUserId);
    const otherUname = currentChatUser?.username;

    const chatMessages = allMessages.filter(msg => {
        const s = String(msg.senderId);
        const r = String(msg.receiverId);
        return (
            ((s === myId || s === myUname) && (r === otherId || r === otherUname)) ||
            ((s === otherId || s === otherUname) && (r === myId || r === myUname))
        );
    });

    if (chatMessages.length === 0) {
        messagesArea.innerHTML = '<div style="text-align: center; color: var(--text-light); margin: auto; font-size: 0.9rem;">เริ่มต้นบทสนทนาที่อบอุ่นด้วยกันนะครับ 🍃</div>';
    } else {
        chatMessages.forEach(msg => {
            const isSent = (String(msg.senderId) === myId || msg.senderId === myUname);
            const div = document.createElement('div');
            div.className = `message ${isSent ? 'sent' : 'received'}`;

            const senderUser = isSent ? currentUser : currentChatUser;
            div.innerHTML = `
                ${!isSent ? `<img class="message-avatar" src="${senderUser?.profileImage || generateAvatar(senderUser?.username)}" alt="Avatar">` : ''}
                <div class="message-content">
                    <div class="message-text">${escapeHtml(msg.text)}</div>
                    <div class="message-time">${formatTime(msg.timestamp)}</div>
                </div>
            `;
            messagesArea.appendChild(div);
        });
    }

    setTimeout(() => {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }, 50);
}

// Send message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text || !currentChatUserId) return;

    try {
        await Storage.sendMessage(currentChatUser?.id || currentChatUserId, text);
    } catch (error) {
        console.error(error);
        return;
    }

    input.value = '';
    input.focus();

    loadMessages();
    loadConversations();
}

function filterConversations(searchTerm) {
    const items = document.querySelectorAll('.conversation-item');
    const lowerTerm = (searchTerm || '').toLowerCase();

    items.forEach(item => {
        const name = item.querySelector('.conversation-name')?.textContent.toLowerCase() || '';
        item.style.display = name.includes(lowerTerm) ? '' : 'none';
    });
}

function openNewChatModal() {
    document.getElementById('newChatModal').classList.add('active');
    loadNewChatUsers();
}

async function loadNewChatUsers() {
    const container = document.getElementById('newChatUsersList');
    container.innerHTML = '';

    const allUsers = await Storage.getUsersFromServer();
    const availableUsers = allUsers.filter(u => u.username !== currentUser.username && u.id !== currentUser.id);

    if (availableUsers.length === 0) {
        container.innerHTML = '<div class="no-users-message">ยังไม่มีผู้ใช้อื่นในระบบ</div>';
        return;
    }

    availableUsers.forEach(user => {
        const item = document.createElement('div');
        item.className = 'new-chat-user-item';
        item.innerHTML = `
            <img class="new-chat-user-avatar" src="${user.profileImage || generateAvatar(user.username)}" alt="Avatar">
            <div class="new-chat-user-info">
                <div class="new-chat-user-name">${escapeHtml(user.nickname || user.username)}</div>
                <div class="new-chat-user-bio">${escapeHtml(user.bio || 'ไม่มีประวัติส่วนตัว')}</div>
            </div>
        `;

        item.addEventListener('click', () => {
            openChat(user.id || user.username, user);
            document.getElementById('newChatModal').classList.remove('active');
        });

        container.appendChild(item);
    });
}

function filterNewChatUsers(searchTerm) {
    const items = document.querySelectorAll('.new-chat-user-item');
    const lowerTerm = (searchTerm || '').toLowerCase();

    items.forEach(item => {
        const name = item.querySelector('.new-chat-user-name')?.textContent.toLowerCase() || '';
        item.style.display = name.includes(lowerTerm) ? '' : 'none';
    });
}

function generateAvatar(username) {
    if (!username) username = 'User';
    const colors = ['#2e8b68', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#6366f1'];
    const color = colors[username.charCodeAt(0) % colors.length];
    const initial = username[0].toUpperCase();
    const svg = `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" fill="${color}" rx="40"/>
        <text x="40" y="40" font-size="34" font-family="sans-serif" font-weight="bold" fill="white"
              text-anchor="middle" dominant-baseline="central">${initial}</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}