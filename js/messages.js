let currentUser = null;
let currentChatUserId = null;
let conversations = [];
let allMessages = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (!currentUser) return;
    loadConversations();
    setupEventListeners();
});

// Check authentication
async function checkAuth() {
    currentUser = await Storage.getServerSession().catch(() => Storage.getCurrentUser());
    if (!currentUser) {
        window.location.href = '/pakjai/index.html';
        return;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Send message
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // New chat button
    document.getElementById('newChatBtn').addEventListener('click', openNewChatModal);

    // Search conversations
    document.getElementById('conversationSearch').addEventListener('input', (e) => {
        filterConversations(e.target.value);
    });

    // Search for new chat users
    document.getElementById('newChatSearchInput').addEventListener('input', (e) => {
        filterNewChatUsers(e.target.value);
    });

    // Close chat button
    document.getElementById('closeChat').addEventListener('click', closeChat);

    // Modal close
    document.querySelector('.modal-close').addEventListener('click', () => {
        document.getElementById('newChatModal').classList.remove('active');
    });

    document.getElementById('newChatModal').addEventListener('click', (e) => {
        if (e.target.id === 'newChatModal') {
            document.getElementById('newChatModal').classList.remove('active');
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        Storage.logout();
        window.location.href = '/pakjai/index.html';
    });
}

// Load conversations
function loadConversations() {
    allMessages = JSON.parse(localStorage.getItem('messages')) || [];
    const conversationMap = {};

    allMessages.forEach(msg => {
        const key = [msg.senderId, msg.receiverId].sort().join('_');
        if (!conversationMap[key]) {
            conversationMap[key] = {
                participants: {
                    senderId: msg.senderId,
                    receiverId: msg.receiverId
                },
                lastMessage: msg,
                messages: []
            };
        }
        conversationMap[key].messages.push(msg);
        conversationMap[key].lastMessage = msg;
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
        document.getElementById('emptyConversations').style.display = 'block';
        return;
    }

    document.getElementById('emptyConversations').style.display = 'none';

    conversations.forEach(conv => {
        const otherUserId = conv.participants.senderId === currentUser.id
            ? conv.participants.receiverId
            : conv.participants.senderId;

        const otherUser = JSON.parse(localStorage.getItem('users') || '[]')
            .find(u => u.id === otherUserId);

        if (otherUser) {
            const item = document.createElement('div');
            item.className = `conversation-item ${currentChatUserId === otherUserId ? 'active' : ''}`;

            const preview = conv.lastMessage.text.substring(0, 30) +
                (conv.lastMessage.text.length > 30 ? '...' : '');

            item.innerHTML = `
                <img class="conversation-avatar" src="${otherUser.profileImage || generateAvatar(otherUser.username)}" alt="Avatar">
                <div class="conversation-info">
                    <div class="conversation-name">${otherUser.username}</div>
                    <div class="conversation-preview">${escapeHtml(preview)}</div>
                </div>
            `;

            item.addEventListener('click', () => {
                openChat(otherUserId, otherUser);
            });

            container.appendChild(item);
        }
    });
}

// Open chat
function openChat(userId, user) {
    currentChatUserId = userId;

    // Update UI
    document.getElementById('noChatSelected').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'flex';

    document.getElementById('chatUserAvatar').src = user.profileImage || generateAvatar(user.username);
    document.getElementById('chatUserName').textContent = user.username;

    displayConversations();
    loadMessages(userId);
}

// Close chat
function closeChat() {
    currentChatUserId = null;
    document.getElementById('noChatSelected').style.display = 'flex';
    document.getElementById('chatContainer').style.display = 'none';
    displayConversations();
}

// Load messages for current chat
function loadMessages(userId) {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.innerHTML = '';

    const chatMessages = allMessages.filter(msg =>
        (msg.senderId === currentUser.id && msg.receiverId === userId) ||
        (msg.senderId === userId && msg.receiverId === currentUser.id)
    );

    chatMessages.forEach(msg => {
        const messageEl = createMessageElement(msg);
        messagesArea.appendChild(messageEl);
    });

    // Scroll to bottom
    setTimeout(() => {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }, 100);
}

// Create message element
function createMessageElement(msg) {
    const div = document.createElement('div');
    const isSent = msg.senderId === currentUser.id;
    div.className = `message ${isSent ? 'sent' : 'received'}`;

    const senderUser = JSON.parse(localStorage.getItem('users') || '[]')
        .find(u => u.id === msg.senderId);

    div.innerHTML = `
        ${!isSent ? `<img class="message-avatar" src="${senderUser?.profileImage || generateAvatar(senderUser?.username)}" alt="Avatar">` : ''}
        <div class="message-content">
            <div class="message-text">${escapeHtml(msg.text)}</div>
            <div class="message-time">${formatTime(msg.timestamp)}</div>
        </div>
    `;

    return div;
}

// Send message
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text || !currentChatUserId) return;

    const message = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        receiverId: currentChatUserId,
        text,
        timestamp: new Date().toISOString(),
        read: false
    };

    allMessages.push(message);
    localStorage.setItem('messages', JSON.stringify(allMessages));

    input.value = '';
    input.focus();

    loadMessages(currentChatUserId);
}

// Filter conversations
function filterConversations(searchTerm) {
    const items = document.querySelectorAll('.conversation-item');
    const lowerTerm = searchTerm.toLowerCase();

    items.forEach(item => {
        const name = item.querySelector('.conversation-name').textContent.toLowerCase();
        if (name.includes(lowerTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Open new chat modal
function openNewChatModal() {
    document.getElementById('newChatModal').classList.add('active');
    loadNewChatUsers();
}

// Load users for new chat
function loadNewChatUsers() {
    const container = document.getElementById('newChatUsersList');
    container.innerHTML = '';

    const allUsers = JSON.parse(localStorage.getItem('users')) || [];
    const currentUserData = allUsers.find(u => u.id === currentUser.id);

    const availableUsers = allUsers.filter(u => u.id !== currentUser.id);

    if (availableUsers.length === 0) {
        container.innerHTML = '<div class="no-users-message">ไม่พบผู้ใช้อื่น</div>';
        return;
    }

    availableUsers.forEach(user => {
        const item = document.createElement('div');
        item.className = 'new-chat-user-item';
        item.innerHTML = `
            <img class="new-chat-user-avatar" src="${user.profileImage || generateAvatar(user.username)}" alt="Avatar">
            <div class="new-chat-user-info">
                <div class="new-chat-user-name">${user.username}</div>
                <div class="new-chat-user-bio">${user.bio || 'ไม่มีประวัติส่วนตัว'}</div>
            </div>
        `;

        item.addEventListener('click', () => {
            openChat(user.id, user);
            document.getElementById('newChatModal').classList.remove('active');
        });

        container.appendChild(item);
    });
}

// Filter new chat users
function filterNewChatUsers(searchTerm) {
    const items = document.querySelectorAll('.new-chat-user-item');
    const lowerTerm = searchTerm.toLowerCase();

    items.forEach(item => {
        const name = item.querySelector('.new-chat-user-name').textContent.toLowerCase();
        if (name.includes(lowerTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Utilities
function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'เมื่อสักครู่';
    if (diff < 3600) return Math.floor(diff / 60) + ' นาทีที่แล้ว';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ชั่วโมงที่แล้ว';

    return date.toLocaleDateString('th-TH');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateAvatar(username) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    const color = colors[username.charCodeAt(0) % colors.length];
    const svg = `<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
        <rect width="50" height="50" fill="${color}"/>
        <text x="25" y="25" font-size="24" font-weight="bold" fill="white"
              text-anchor="middle" dominant-baseline="central">${username[0].toUpperCase()}</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}