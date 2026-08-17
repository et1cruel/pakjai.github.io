let currentUser = null;
let allPosts = [];
let currentFilter = 'all';
let currentCommentingPostId = null;
let cameraStream = null;
let cameraFacingMode = 'user';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadUserInfo();
    loadPosts();
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    currentUser = Storage.getCurrentUser();
    if (!currentUser) {
        window.location.href = '/pakjai/index.html';
        return;
    }
}

// Load user info to sidebar
function loadUserInfo() {
    const user = Storage.getUser(currentUser.username);
    if (user) {
        const sidebarUsername = document.getElementById('sidebarUsername');
        sidebarUsername.textContent = user.nickname || user.username;
        sidebarUsername.style.color = user.nicknameColor || '#34a887';
        sidebarUsername.classList.add('nickname-display');
        document.getElementById('sidebarBio').textContent = user.bio || 'ยังไม่มีประวัติส่วนตัว';
        document.getElementById('followersCount').textContent = user.followers.length;
        document.getElementById('followingCount').textContent = user.following.length;

        if (user.profileImage) {
            const sidebarImg = document.getElementById('sidebarProfileImg');
            const createPostImg = document.getElementById('createPostImg');
            sidebarImg.src = user.profileImage;
            createPostImg.src = user.profileImage;
        } else {
            const avatar = generateAvatar(user.username);
            document.getElementById('sidebarProfileImg').src = avatar;
            document.getElementById('createPostImg').src = avatar;
        }
    }
}

// Generate avatar from username
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

// Setup event listeners
function setupEventListeners() {
    // Create post
    document.getElementById('createPostBtn').addEventListener('click', createPost);
    document.getElementById('postImage').addEventListener('change', previewImage);
    document.getElementById('openCameraBtn').addEventListener('click', openCamera);
    document.getElementById('closeCameraBtn').addEventListener('click', closeCamera);
    document.getElementById('capturePhotoBtn').addEventListener('click', capturePhoto);
    document.getElementById('switchCameraBtn').addEventListener('click', switchCamera);
    document.getElementById('cameraModal').addEventListener('click', (e) => {
        if (e.target.id === 'cameraModal') closeCamera();
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        Storage.logout();
        window.location.href = '/pakjai/index.html';
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            displayPosts();
        });
    });

    // Modal close
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('commentModal').addEventListener('click', (e) => {
        if (e.target.id === 'commentModal') closeModal();
    });

    // Submit comment
    document.getElementById('submitCommentBtn').addEventListener('click', submitComment);
}

// Preview image before uploading
function previewImage(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `
                <img src="${event.target.result}" alt="Preview">
                <button class="remove-preview">✕</button>
            `;
            preview.querySelector('.remove-preview').addEventListener('click', () => {
                preview.innerHTML = '';
                document.getElementById('postImage').value = '';
            });
            const imageData = document.getElementById('postImageData');
            if (imageData) imageData.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Open the device camera (front camera by default)
async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
        alert('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องโดยตรง กรุณาใช้ HTTPS หรือ localhost');
        return;
    }

    document.getElementById('cameraModal').classList.add('active');
    await startCamera();
}

async function startCamera() {
    stopCameraStream();
    const message = document.getElementById('cameraMessage');
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: cameraFacingMode },
            audio: false
        });
        const video = document.getElementById('cameraVideo');
        video.srcObject = cameraStream;
        message.textContent = cameraFacingMode === 'user' ? 'กล้องหน้า พร้อมถ่ายรูปแล้ว' : 'กล้องหลัง พร้อมถ่ายรูปแล้ว';
    } catch (error) {
        message.textContent = 'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้งานกล้อง';
        console.error('Camera error:', error);
    }
}

function stopCameraStream() {
    if (!cameraStream) return;
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
}

function closeCamera() {
    stopCameraStream();
    document.getElementById('cameraVideo').srcObject = null;
    document.getElementById('cameraModal').classList.remove('active');
}

async function switchCamera() {
    cameraFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    await startCamera();
}

function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    if (!cameraStream || !video.videoWidth) {
        alert('กล้องยังไม่พร้อม กรุณารอสักครู่');
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const postImage = document.getElementById('postImage');
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        postImage.files = dataTransfer.files;
        previewImage({ target: postImage });
        closeCamera();
    }, 'image/jpeg', 0.9);
}

// Create new post
function createPost() {
    const caption = document.getElementById('postCaption').value.trim();
    const imageInput = document.getElementById('postImage');

    if (!caption && !imageInput.files[0]) {
        alert('กรุณาเขียนข้อความหรือเพิ่มรูป');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const post = {
            id: Date.now().toString(),
            userId: currentUser.id,
            username: currentUser.username,
            caption,
            image: e.target.result || '',
            timestamp: new Date().toISOString(),
            likes: [],
            comments: [],
            newsSentiment: 'positive'
        };

        // Save to user's posts
        const user = Storage.getUser(currentUser.username);
        if (!user.posts) user.posts = [];
        user.posts.push(post);

        // Save all posts
        let allPostsData = JSON.parse(localStorage.getItem('posts')) || [];
        allPostsData.push(post);
        localStorage.setItem('posts', JSON.stringify(allPostsData));

        // Update user in storage
        let users = JSON.parse(localStorage.getItem('users')) || [];
        users = users.map(u => u.id === user.id ? user : u);
        localStorage.setItem('users', JSON.stringify(users));

        // Clear form
        document.getElementById('postCaption').value = '';
        document.getElementById('postImage').value = '';
        document.getElementById('imagePreview').innerHTML = '';

        loadPosts();
        showPostSuccessMessage();
        showHeartBurst();
    };

    if (imageInput.files[0]) {
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        reader.onload({ target: { result: '' } });
    }
}

// Show a burst of small hearts when a post is published
function showHeartBurst() {
    const burst = document.createElement('div');
    burst.className = 'heart-burst';

    for (let i = 0; i < 14; i += 1) {
        const heart = document.createElement('span');
        heart.className = 'floating-heart';
        heart.textContent = '♥';
        heart.style.setProperty('--heart-x', `${Math.round(Math.random() * 260 - 130)}px`);
        heart.style.setProperty('--heart-y', `${Math.round(Math.random() * -220 - 80)}px`);
        heart.style.setProperty('--heart-rotate', `${Math.round(Math.random() * 80 - 40)}deg`);
        heart.style.setProperty('--heart-delay', `${(Math.random() * 0.25).toFixed(2)}s`);
        heart.style.fontSize = `${Math.round(Math.random() * 10 + 16)}px`;
        burst.appendChild(heart);
    }

    document.body.appendChild(burst);
    window.setTimeout(() => burst.remove(), 1900);
}

// Show a friendly confirmation after a post is published
function showPostSuccessMessage() {
    const message = document.getElementById('postSuccessMessage');
    if (!message) return;

    message.classList.remove('show');
    void message.offsetWidth;
    message.classList.add('show');
    window.setTimeout(() => message.classList.remove('show'), 4000);
}

// Load posts
function loadPosts() {
    allPosts = JSON.parse(localStorage.getItem('posts')) || [];
    allPosts.forEach(post => {
        if (!Array.isArray(post.thanks)) post.thanks = [];
        if (!Array.isArray(post.hugs)) post.hugs = [];
        if (!Array.isArray(post.savedBy)) post.savedBy = [];
        if (!Array.isArray(post.likes)) post.likes = [];
        if (!Array.isArray(post.comments)) post.comments = [];
    });
    allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    displayPosts();
}

// Display posts with filter
function displayPosts() {
    const container = document.getElementById('feedContainer');
    container.innerHTML = '';

    let filteredPosts = allPosts;

    if (currentFilter === 'following') {
        const user = Storage.getUser(currentUser.username);
        filteredPosts = allPosts.filter(p => user.following.includes(p.userId));
    } else if (currentFilter === 'liked') {
        filteredPosts = allPosts.filter(p => p.likes.includes(currentUser.id));
    } else if (currentFilter === 'saved') {
        filteredPosts = allPosts.filter(p => p.savedBy.includes(currentUser.id));
    }

    if (filteredPosts.length === 0) {
        document.getElementById('noPostsMessage').style.display = 'block';
        return;
    }

    document.getElementById('noPostsMessage').style.display = 'none';

    filteredPosts.forEach(post => {
        const postEl = createPostElement(post);
        container.appendChild(postEl);
    });
}

// Create post element
function createPostElement(post) {
    const postUser = Storage.getUser(post.username);
    const postDisplayName = postUser?.nickname || post.username;
    const currentReaction = getCurrentReaction(post);
    const isLiked = currentReaction === 'like';
    const isThanked = currentReaction === 'thanks';
    const isHugged = currentReaction === 'hugs';
    const isSaved = post.savedBy.includes(currentUser.id);
    const reactionTitle = currentReaction
        ? 'เปลี่ยนความรู้สึกของคุณได้ โดยยังนับเป็น 1 ครั้ง'
        : 'เลือกความรู้สึกได้ 1 อย่างต่อโพสต์';

    const div = document.createElement('div');
    div.className = 'post-card';
    div.innerHTML = `
        <div class="post-header">
            <img class="post-avatar" src="${postUser?.profileImage || generateAvatar(post.username)}" alt="Avatar">
            <div class="post-user-info">
                <div class="post-username" style="color: ${postUser?.nicknameColor || '#34a887'}" class="nickname-display">${escapeHtml(postDisplayName)}</div>
                <div class="post-timestamp">${formatTime(post.timestamp)}</div>
            </div>
            ${String(post.userId) === String(currentUser.id) ? `
                <div class="post-owner-actions">
                    <button class="post-owner-btn" onclick="editPost('${post.id}')">แก้ไข</button>
                    <button class="post-owner-btn delete" onclick="deletePost('${post.id}')">ลบ</button>
                </div>
            ` : ''}
        </div>

        ${post.image ? `<img class="post-image" src="${post.image}" alt="Post">` : ''}

        <div class="post-content">
            <div class="post-caption">${escapeHtml(post.caption)}</div>

            <div class="post-actions">
                <button class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')" title="${reactionTitle}">
                    ${isLiked ? '❤️' : '🤍'} <span>${post.likes.length}</span>
                </button>
                <button class="post-action-btn" onclick="openCommentModal('${post.id}')">
                    💬 <span>${post.comments.length}</span>
                </button>
                <button class="post-action-btn thank-btn ${isThanked ? 'thanked' : ''}" onclick="toggleThanks('${post.id}')" title="${reactionTitle}">
                    🙏 ขอบคุณ <span>${post.thanks.length}</span>
                </button>
                <button class="post-action-btn hug-btn ${isHugged ? 'hugged' : ''}" onclick="toggleHugs('${post.id}')" title="${reactionTitle}">
                    🤗 กอด <span>${post.hugs.length}</span>
                </button>
                <button class="post-action-btn share-btn" onclick="sharePost('${post.id}')">
                    📤 ส่งต่อ
                </button>
                <button class="post-action-btn send-btn" onclick="sendPostToFriend('${post.id}')">
                    💌 ส่งให้
                </button>
                <button class="post-action-btn save-btn ${isSaved ? 'saved' : ''}" onclick="toggleSavePost('${post.id}')">
                    🔖 บันทึก
                </button>
            </div>
            ${post.comments.length ? `
                <div class="post-comments-preview">
                    ${post.comments.slice(-3).map(comment => `
                        <div class="post-comment-preview">
                            <strong>${escapeHtml(comment.username)}</strong>
                            <span>${escapeHtml(comment.text)}</span>
                        </div>
                    `).join('')}
                    ${post.comments.length > 3 ? `<button class="view-comments-btn" onclick="openCommentModal('${post.id}')">ดูความคิดเห็นทั้งหมด (${post.comments.length})</button>` : ''}
                </div>
            ` : ''}
            <div class="inline-comment-section">
                <input class="inline-comment-input" id="comment-${post.id}" type="text" placeholder="เขียนความคิดเห็น..." maxlength="500" onkeydown="if(event.key === 'Enter') submitInlineComment('${post.id}')">
                <button class="inline-comment-btn" onclick="submitInlineComment('${post.id}')">ส่ง</button>
            </div>
        </div>
    `;

    return div;
}

// Share a post/profile using the device share menu or copy the profile link
function sharePost(postId) {
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;

    const profileUrl = `${window.location.origin}/pakjai/profile.html`;
    const shareText = `${post.username}: ${post.caption || 'โพสต์นี้'}`;
    if (navigator.share) {
        navigator.share({ title: `โพสต์ของ ${post.username}`, text: shareText, url: profileUrl })
            .catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(`${shareText} ${profileUrl}`)
            .then(() => alert('คัดลอกลิงก์โปรไฟล์แล้ว ✓'));
    } else {
        prompt('คัดลอกลิงก์โปรไฟล์นี้', profileUrl);
    }
}

// Send a post directly to a friend through chat
function sendPostToFriend(postId) {
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const currentUserData = users.find(user => String(user.id) === String(currentUser.id));
    const friendIds = currentUserData?.following || [];
    const friends = users.filter(user => friendIds.includes(user.id) && String(user.id) !== String(currentUser.id));
    if (!friends.length) {
        alert('ยังไม่มีเพื่อนในแชทที่สามารถส่งให้ได้');
        return;
    }

    const friendNames = friends.map(friend => friend.username).join(', ');
    const recipientName = prompt(`พิมพ์ชื่อเพื่อนที่ต้องการส่งให้\nเพื่อนในแชท: ${friendNames}`);
    if (recipientName === null) return;

    const recipient = friends.find(friend => friend.username.toLowerCase() === recipientName.trim().toLowerCase());
    if (!recipient) {
        alert('ไม่พบเพื่อนชื่อนี้ในแชท');
        return;
    }

    const profileUrl = `${window.location.origin}/pakjai/profile.html`;
    const messages = JSON.parse(localStorage.getItem('messages')) || [];
    messages.push({
        id: Date.now().toString(),
        senderId: currentUser.id,
        receiverId: recipient.id,
        text: `ส่งโพสต์ของ ${post.username} ให้คุณ: ${post.caption || 'โพสต์นี้'} ${profileUrl}`,
        timestamp: new Date().toISOString(),
        read: false
    });
    localStorage.setItem('messages', JSON.stringify(messages));
    alert(`ส่งให้ ${recipient.username} แล้ว ✓`);
}

// Toggle saving a post for the current user
function toggleSavePost(postId) {
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;
    if (!Array.isArray(post.savedBy)) post.savedBy = [];

    const savedIndex = post.savedBy.indexOf(currentUser.id);
    if (savedIndex > -1) {
        post.savedBy.splice(savedIndex, 1);
    } else {
        post.savedBy.push(currentUser.id);
    }

    localStorage.setItem('posts', JSON.stringify(allPosts));
    displayPosts();
}

// Return the one reaction selected by the current user for this post
function getCurrentReaction(post) {
    if (post.likes.includes(currentUser.id)) return 'like';
    if (post.thanks.includes(currentUser.id)) return 'thanks';
    if (post.hugs.includes(currentUser.id)) return 'hugs';
    return null;
}

// Change reaction without increasing the user's reaction count for this post
function setReaction(postId, reactionType) {
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;

    ['likes', 'thanks', 'hugs'].forEach(type => {
        if (!Array.isArray(post[type])) post[type] = [];
        post[type] = post[type].filter(userId => String(userId) !== String(currentUser.id));
    });

    post[reactionType].push(currentUser.id);
    localStorage.setItem('posts', JSON.stringify(allPosts));
    displayPosts();
}

// Select or change the thank-you reaction
function toggleThanks(postId) {
    setReaction(postId, 'thanks');
}

// Submit a comment directly from the post card
function submitInlineComment(postId) {
    const input = document.getElementById(`comment-${postId}`);
    const text = input?.value.trim();
    if (!text) return;

    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;
    if (!Array.isArray(post.comments)) post.comments = [];

    post.comments.push({
        id: Date.now().toString(),
        userId: currentUser.id,
        username: currentUser.username,
        text,
        timestamp: new Date().toISOString()
    });

    localStorage.setItem('posts', JSON.stringify(allPosts));
    displayPosts();
}

// Select or change the hug reaction
function toggleHugs(postId) {
    setReaction(postId, 'hugs');
}

// Edit a post owned by the current user
function editPost(postId) {
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post || String(post.userId) !== String(currentUser.id)) return;

    const caption = prompt('แก้ไขข้อความโพสต์', post.caption || '');
    if (caption === null) return;
    if (!caption.trim() && !post.image) {
        alert('โพสต์ต้องมีข้อความหรือรูปภาพ');
        return;
    }

    post.caption = caption.trim();
    localStorage.setItem('posts', JSON.stringify(allPosts));
    syncUserPosts();
    loadPosts();
}

// Delete a post owned by the current user
function deletePost(postId) {
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post || String(post.userId) !== String(currentUser.id)) return;
    if (!confirm('ต้องการลบโพสต์นี้ใช่หรือไม่?')) return;

    allPosts = allPosts.filter(p => String(p.id) !== String(postId));
    localStorage.setItem('posts', JSON.stringify(allPosts));
    syncUserPosts();
    displayPosts();
}

// Keep the current user's post list consistent with the feed
function syncUserPosts() {
    const user = Storage.getUser(currentUser.username);
    if (!user) return;
    user.posts = allPosts.filter(post => String(post.userId) === String(user.id));
    let users = JSON.parse(localStorage.getItem('users')) || [];
    users = users.map(u => u.id === user.id ? user : u);
    localStorage.setItem('users', JSON.stringify(users));
}

// Select or change the heart reaction
function toggleLike(postId) {
    setReaction(postId, 'likes');
}

// Comment modal
function openCommentModal(postId) {
    currentCommentingPostId = postId;
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    const postUser = Storage.getUser(post.username);
    const postDisplayName = postUser?.nickname || post.username;
    const detail = document.getElementById('modalPostDetail');
    detail.innerHTML = `
        <div class="post-header">
            <img class="post-avatar" src="${postUser?.profileImage || generateAvatar(post.username)}" alt="Avatar">
            <div class="post-user-info">
                <div class="post-username" style="color: ${postUser?.nicknameColor || '#34a887'}" class="nickname-display">${escapeHtml(postDisplayName)}</div>
                <div class="post-timestamp">${formatTime(post.timestamp)}</div>
            </div>
        </div>
        ${post.image ? `<img class="post-image" src="${post.image}" style="margin-top: 10px;">` : ''}
        <div style="margin-top: 10px;">
            <div class="post-caption">${escapeHtml(post.caption)}</div>
        </div>
    `;

    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';
    if (!post.comments.length) {
        commentsList.innerHTML = '<p class="no-comments">ยังไม่มีความคิดเห็น</p>';
    }
    post.comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment';
        commentEl.innerHTML = `
            <div class="comment-user">${comment.username}</div>
            <div class="comment-text">${escapeHtml(comment.text)}</div>
            <div class="comment-time">${formatTime(comment.timestamp)}</div>
        `;
        commentsList.appendChild(commentEl);
    });

    document.getElementById('commentModal').classList.add('active');
}

function closeModal() {
    document.getElementById('commentModal').classList.remove('active');
    currentCommentingPostId = null;
}

// Submit comment
function submitComment() {
    const text = document.getElementById('commentInput').value.trim();
    if (!text) return;

    const post = allPosts.find(p => p.id === currentCommentingPostId);
    if (!post) return;

    post.comments.push({
        id: Date.now().toString(),
        userId: currentUser.id,
        username: currentUser.username,
        text,
        timestamp: new Date().toISOString()
    });

    localStorage.setItem('posts', JSON.stringify(allPosts));
    document.getElementById('commentInput').value = '';
    openCommentModal(currentCommentingPostId);
}

// Utilities
function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'เมื่อสักครู่';
    if (diff < 3600) return Math.floor(diff / 60) + ' นาทีที่แล้ว';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ชั่วโมงที่แล้ว';
    if (diff < 604800) return Math.floor(diff / 86400) + ' วันที่แล้ว';

    return date.toLocaleDateString('th-TH');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}