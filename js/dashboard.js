let currentUser = null;
let allPosts = [];
let currentFilter = 'all';
let currentCommentingPostId = null;
let editingPostId = null;
let deletingPostId = null;
let sendingPostId = null;
let cameraStream = null;
let cameraFacingMode = 'user';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (!currentUser) return;
    loadUserInfo();
    await loadPosts();
    await loadTrendingSidebar();
    setupEventListeners();
});

// Check authentication
async function checkAuth() {
    currentUser = await Storage.getServerSession().catch(() => Storage.getCurrentUser());
    if (!currentUser || !currentUser.username) {
        window.location.href = '/pakjai/index.html';
        return;
    }
}

// Load user info to sidebar
function loadUserInfo() {
    const user = Storage.getUser(currentUser.username) || currentUser;
    if (user) {
        const sidebarUsername = document.getElementById('sidebarUsername');
        sidebarUsername.dataset.profileUsername = user.username;
        sidebarUsername.textContent = user.nickname || user.username;
        sidebarUsername.style.color = user.nicknameColor || '#2e8b68';
        sidebarUsername.classList.add('nickname-display');
        document.getElementById('sidebarBio').textContent = user.bio || 'ยังไม่มีประวัติส่วนตัว';
        document.getElementById('followersCount').textContent = user.followers?.length || 0;
        document.getElementById('followingCount').textContent = user.following?.length || 0;

        const avatarSrc = user.profileImage || generateAvatar(user.username);
        const sidebarImg = document.getElementById('sidebarProfileImg');
        const createPostImg = document.getElementById('createPostImg');

        if (sidebarImg) {
            sidebarImg.src = avatarSrc;
            sidebarImg.dataset.profileUsername = user.username;
        }
        if (createPostImg) {
            createPostImg.src = avatarSrc;
        }
    }
}

// Load trending tags for sidebar
async function loadTrendingSidebar() {
    const trendingList = document.getElementById('trendingList');
    if (!trendingList) return;

    const posts = (await Storage.getPosts()).filter(post =>
        post.visibility !== 'private' ||
        String(post.userId) === String(currentUser.id) ||
        post.username === currentUser.username
    );
    const tagMap = {};

    posts.forEach(post => {
        const matches = (post.caption || '').match(/#[ก-๙a-zA-Z0-9_]+/g);
        if (matches) {
            matches.forEach(tag => {
                tagMap[tag] = (tagMap[tag] || 0) + 1;
            });
        }
    });

    const trending = Object.entries(tagMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    trendingList.innerHTML = '';
    if (trending.length === 0) {
        trendingList.innerHTML = '<p style="color: var(--text-light); font-size: 0.85rem; text-align: center;">ยังไม่มีแฮชแท็ก 🍃</p>';
        return;
    }

    trending.forEach(([tag, count]) => {
        const item = document.createElement('div');
        item.className = 'trending-item';
        item.innerHTML = `
            <span class="trending-tag">${escapeHtml(tag)}</span>
            <span class="trending-count">${count} โพสต์</span>
        `;
        item.addEventListener('click', () => {
            window.location.href = `/pakjai/search.html?q=${encodeURIComponent(tag)}`;
        });
        trendingList.appendChild(item);
    });
}

// Generate avatar from username
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

// Setup event listeners
function setupEventListeners() {
    // Create post
    document.getElementById('createPostBtn').addEventListener('click', createPost);
    document.getElementById('visibilityBtn').addEventListener('click', togglePostVisibility);
    setupEmojiPicker();
    document.getElementById('postImage').addEventListener('change', previewImage);
    document.getElementById('postAudio').addEventListener('change', previewAudio);
    document.getElementById('openCameraBtn').addEventListener('click', openCamera);
    document.getElementById('closeCameraBtn').addEventListener('click', closeCamera);
    document.getElementById('capturePhotoBtn').addEventListener('click', capturePhoto);
    document.getElementById('switchCameraBtn').addEventListener('click', switchCamera);

    // Edit Post Modal Listeners
    document.getElementById('saveEditPostBtn')?.addEventListener('click', saveEditedPost);
    document.getElementById('cancelEditBtn')?.addEventListener('click', closeAllModals);

    // Delete Post Modal Listeners
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDeletePost);
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeAllModals);

    // Camera Modal
    const cameraModal = document.getElementById('cameraModal');
    cameraModal?.addEventListener('click', (e) => {
        if (e.target === cameraModal) closeCamera();
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await Storage.logout();
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

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAllModals();
        });
    });

    // Submit comment
    document.getElementById('submitCommentBtn').addEventListener('click', submitComment);
}

// Preview image before uploading
function previewImage(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        preview.innerHTML = `
            <img src="${event.target.result}" alt="Preview">
            <button type="button" class="remove-preview" title="ลบรูป">✕</button>
        `;
        preview.querySelector('.remove-preview').addEventListener('click', () => {
            preview.innerHTML = '';
            document.getElementById('postImage').value = '';
        });
    };
    reader.readAsDataURL(file);
}

function previewAudio(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('audioPreview');
    preview.innerHTML = '';
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
        showToast('ไฟล์เสียงต้องมีขนาดไม่เกิน 8MB', 'error');
        e.target.value = '';
        return;
    }
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = URL.createObjectURL(file);
    audio.addEventListener('loadend', () => URL.revokeObjectURL(audio.src), { once: true });
    preview.appendChild(audio);
}

// Camera features
async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
        showToast('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องโดยตรง กรุณาใช้งานผ่าน HTTPS หรือ localhost', 'error');
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
        message.textContent = cameraFacingMode === 'user' ? 'กล้องหน้า พร้อมถ่ายรูปแล้ว 📸' : 'กล้องหลัง พร้อมถ่ายรูปแล้ว 📸';
    } catch (error) {
        message.textContent = 'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์';
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
    const video = document.getElementById('cameraVideo');
    if (video) video.srcObject = null;
    document.getElementById('cameraModal').classList.remove('active');
}

async function switchCamera() {
    cameraFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    await startCamera();
}

function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    if (!cameraStream || !video.videoWidth) {
        showToast('กล้องยังไม่พร้อม กรุณารอสักครู่', 'info');
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
        showToast('ถ่ายรูปสำเร็จ 📸', 'success');
    }, 'image/jpeg', 0.9);
}

const EMOJI_CATEGORIES = {
    'ล่าสุด': ['😭', '🤟', '✨', '💖', '🎉', '😌', '🙏', '🥹', '🌿', '🌸', '☕', '🫶'],
    'พักใจ': ['😌', '😊', '🥰', '😇', '🙂', '🙃', '☺️', '🤍', '💚', '💛', '💙', '💜', '❤️', '🩷', '🧡', '🤎', '🫶', '🤗', '🙏', '✨', '🌈', '☁️', '🫧', '🕊️', '🛌', '💤'],
    'ธรรมชาติ': ['🌿', '🍃', '🌱', '🌲', '🌳', '🌴', '🎋', '🌵', '🌾', '🍀', '☘️', '🍁', '🍂', '🌸', '🌼', '🌻', '🌷', '🪻', '🌺', '🍄', '🌊', '🏞️', '🏔️', '🌅', '🌄', '☀️', '🌤️', '⛅', '🌙', '⭐', '🌧️', '🌦️', '⛈️', '❄️', '💧', '🔥'],
    'สัตว์และแมลง': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🦉', '🦋', '🐝', '🐞', '🐢', '🐳', '🐬', '🐟', '🦜', '🦌', '🦔', '🦥', '🐿️', '🦢', '🐸'],
    'กิจกรรม': ['🧘', '🧘‍♀️', '🧘‍♂️', '🚶', '🚶‍♀️', '🚶‍♂️', '🏃', '🚴', '🏊', '🧗', '🏕️', '⛺', '🥾', '🪴', '🌿', '📖', '✍️', '🎨', '🎵', '🎶', '📷', '☕', '🍵', '🫖', '🍳', '🧺', '🛋️', '🛀', '🧹', '🧩', '🎮', '⚽', '🏸'],
    'ผู้คน': ['😀', '😄', '😁', '😂', '🤣', '🥹', '😢', '😭', '😮', '😲', '😴', '😋', '😎', '🤩', '🥳', '😅', '🤔', '🙌', '👏', '💪', '👋', '🤝', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '💅'],
    'อาหารและเครื่องดื่ม': ['🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥑', '🥕', '🌽', '🍅', '🍞', '🧀', '🍪', '🍰', '🍫', '🍯', '☕', '🍵', '🫖', '🥤', '🧃', '🍲', '🍜', '🍚'],
    'ความรู้สึก': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧'],
    'สิ่งของและสัญลักษณ์': ['✅', '❌', '❗', '❓', '‼️', '⁉️', '💡', '🔔', '📌', '📍', '🔒', '🔖', '💬', '💌', '🎁', '🎈', '🎀', '🎵', '🎶', '🎸', '🎹', '📚', '📝', '📷', '📱', '💻', '🏠', '🛏️', '🕯️', '🧸', '💎', '🌟', '💫', '💯', '🎊', '🎉']
};

function setupEmojiPicker() {
    const emojiButton = document.getElementById('emojiBtn');
    const picker = document.getElementById('emojiPicker');
    const categories = document.getElementById('emojiCategories');
    const options = document.getElementById('emojiOptions');
    const searchInput = document.getElementById('emojiSearch');
    if (!emojiButton || !picker || !categories || !options) return;

    let activeCategory = Object.keys(EMOJI_CATEGORIES)[0];
    const renderOptions = () => {
        const query = searchInput?.value.trim().toLowerCase() || '';
        const emojis = EMOJI_CATEGORIES[activeCategory].filter(emoji => !query || emoji.includes(query));
        options.innerHTML = emojis.length ? emojis.map(emoji =>
            `<button type="button" class="emoji-option" data-emoji="${emoji}" aria-label="เลือก ${emoji}">${emoji}</button>`
        ).join('') : '<span class="emoji-empty">ไม่พบอีโมจิในหมวดนี้</span>';
        options.querySelectorAll('.emoji-option').forEach(option => {
            option.addEventListener('click', () => insertEmoji(option.dataset.emoji));
        });
    };
    categories.innerHTML = Object.keys(EMOJI_CATEGORIES).map((category, index) =>
        `<button type="button" class="emoji-category ${index === 0 ? 'active' : ''}" data-category="${category}" role="tab" aria-selected="${index === 0}">${category}</button>`
    ).join('');
    categories.querySelectorAll('.emoji-category').forEach(button => {
        button.addEventListener('click', () => {
            activeCategory = button.dataset.category;
            categories.querySelectorAll('.emoji-category').forEach(item => {
                const isActive = item === button;
                item.classList.toggle('active', isActive);
                item.setAttribute('aria-selected', String(isActive));
            });
            renderOptions();
        });
    });
    renderOptions();
    searchInput?.addEventListener('input', renderOptions);

    emojiButton.addEventListener('click', () => {
        const isOpen = !picker.hidden;
        picker.hidden = isOpen;
        emojiButton.setAttribute('aria-expanded', String(!isOpen));
    });

    function insertEmoji(emoji) {
        const caption = document.getElementById('postCaption');
        const start = caption.selectionStart ?? caption.value.length;
        const end = caption.selectionEnd ?? caption.value.length;
        caption.value = `${caption.value.slice(0, start)}${emoji}${caption.value.slice(end)}`;
        caption.focus();
        const cursorPosition = start + emoji.length;
        caption.setSelectionRange(cursorPosition, cursorPosition);
    }
}

// Toggle post visibility before publishing
function togglePostVisibility() {
    const button = document.getElementById('visibilityBtn');
    const isPrivate = button.dataset.visibility === 'private';
    const visibility = isPrivate ? 'public' : 'private';
    button.dataset.visibility = visibility;
    button.classList.toggle('private', visibility === 'private');
    button.classList.toggle('public', visibility === 'public');
    button.setAttribute('aria-pressed', String(visibility === 'private'));
    button.querySelector('.visibility-icon').textContent = visibility === 'private' ? '🔒' : '🌍';
    button.querySelector('.visibility-label').textContent = visibility === 'private' ? 'ส่วนตัว' : 'สาธารณะ';
}

async function createPost() {
    const caption = document.getElementById('postCaption').value.trim();
    const visibility = document.getElementById('visibilityBtn').dataset.visibility || 'public';
    const imageFile = document.getElementById('postImage').files[0];
    const audioFile = document.getElementById('postAudio').files[0];

    if (audioFile && audioFile.size > 8 * 1024 * 1024) {
        showToast('ไฟล์เสียงต้องมีขนาดไม่เกิน 8MB', 'error');
        return;
    }
    if (!caption && !imageFile && !audioFile) {
        showToast('กรุณาเขียนข้อความ แนบรูปภาพ หรือไฟล์เสียงเพื่อแบ่งปัน', 'info');
        return;
    }

    const readFile = file => file ? new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    }) : Promise.resolve('');

    try {
        const postId = crypto.randomUUID ? crypto.randomUUID() : `post-${Date.now()}`;
        let imagePath = null;
        let audioPath = null;
        if (imageFile) imagePath = (await Storage.uploadFile('posts', imageFile, `${currentUser.id}/${postId}/image-${Date.now()}`)).path;
        if (audioFile) audioPath = (await Storage.uploadFile('posts', audioFile, `${currentUser.id}/${postId}/audio-${Date.now()}`)).path;
        const post = { caption, image_path: imagePath, audio_path: audioPath, visibility };
        const result = await Storage.createPost(post);
        const savedPost = result.post || post;

        allPosts.unshift(savedPost);

        // Reset form
        document.getElementById('postCaption').value = '';
        document.getElementById('postImage').value = '';
        document.getElementById('postAudio').value = '';
        const visibilityBtn = document.getElementById('visibilityBtn');
        visibilityBtn.dataset.visibility = 'public';
        visibilityBtn.className = 'visibility-btn public';
        visibilityBtn.setAttribute('aria-pressed', 'false');
        visibilityBtn.querySelector('.visibility-icon').textContent = '🌍';
        visibilityBtn.querySelector('.visibility-label').textContent = 'สาธารณะ';
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('audioPreview').innerHTML = '';

        displayPosts();
        loadTrendingSidebar();
        showPostSuccessMessage();
        showHeartBurst();
        showToast('แชร์เรื่องราวความสบายใจเรียบร้อยแล้ว 🍃', 'success');
    } catch (error) {
        console.error('Post file read failed:', error);
        showToast('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง', 'error');
    }
}

// Show a burst of small hearts
function showHeartBurst() {
    const burst = document.createElement('div');
    burst.className = 'heart-burst';

    for (let i = 0; i < 14; i++) {
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
    setTimeout(() => burst.remove(), 1900);
}

// Confirmation banner
function showPostSuccessMessage() {
    const message = document.getElementById('postSuccessMessage');
    if (!message) return;
    message.classList.remove('show');
    void message.offsetWidth;
    message.classList.add('show');
    setTimeout(() => message.classList.remove('show'), 3800);
}

// Load posts from storage
async function loadPosts() {
    try {
        allPosts = await Storage.getPosts();
    } catch (error) {
        console.error('Posts API failed:', error);
        allPosts = [];
    }
    allPosts.forEach(post => {
        if (!Array.isArray(post.thanks)) post.thanks = [];
        if (!Array.isArray(post.hugs)) post.hugs = [];
        if (!Array.isArray(post.savedBy)) post.savedBy = [];
        if (!Array.isArray(post.likes)) post.likes = [];
        if (!Array.isArray(post.comments)) post.comments = [];
        if (!post.visibility) post.visibility = 'public';
    });
    allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    displayPosts();
}

// Display posts with filter
function displayPosts() {
    const container = document.getElementById('feedContainer');
    container.innerHTML = '';

    const user = Storage.getUser(currentUser.username) || currentUser;
    const visiblePosts = allPosts.filter(post =>
        post.visibility !== 'private' ||
        String(post.userId) === String(currentUser.id) ||
        post.username === currentUser.username
    );
    let filteredPosts = visiblePosts;

    if (currentFilter === 'following') {
        const followingList = user.following || [];
        filteredPosts = visiblePosts.filter(p => followingList.includes(p.userId) || followingList.includes(p.username));
    } else if (currentFilter === 'liked') {
        filteredPosts = visiblePosts.filter(p => p.likes.includes(currentUser.id) || p.likes.includes(currentUser.username));
    } else if (currentFilter === 'saved') {
        filteredPosts = visiblePosts.filter(p => p.savedBy.includes(currentUser.id) || p.savedBy.includes(currentUser.username));
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
    const postUser = { username: post.username, nickname: post.nickname, nicknameColor: post.nicknameColor, profileImage: post.profileImage };
    const postDisplayName = postUser?.nickname || post.username;
    const currentReaction = getCurrentReaction(post);
    const isLiked = currentReaction === 'like';
    const isThanked = currentReaction === 'thanks';
    const isHugged = currentReaction === 'hugs';
    const isSaved = post.savedBy?.includes(currentUser.id) || post.savedBy?.includes(currentUser.username);
    const isOwner = String(post.userId) === String(currentUser.id) || post.username === currentUser.username;

    const div = document.createElement('div');
    div.className = 'post-card';
    div.innerHTML = `
        <div class="post-header">
            <img class="post-avatar" src="${postUser?.profileImage || generateAvatar(post.username)}" alt="Avatar" data-profile-username="${escapeHtml(post.username)}">
            <div class="post-user-info">
                <div class="post-username" data-profile-username="${escapeHtml(post.username)}" style="color: ${postUser?.nicknameColor || '#2e8b68'}">${escapeHtml(postDisplayName)}</div>
                <div class="post-timestamp">${formatTime(post.timestamp)}</div>
            </div>
            ${isOwner ? `
                <div class="post-owner-actions">
                    <button type="button" class="post-owner-btn" onclick="openEditPostModal('${post.id}')" title="แก้ไขโพสต์">✏️ แก้ไข</button>
                    <button type="button" class="post-owner-btn delete" onclick="openDeletePostModal('${post.id}')" title="ลบโพสต์">🗑️ ลบ</button>
                </div>
            ` : ''}
        </div>

        ${post.image ? `<img class="post-image" src="${post.image}" alt="Post Image">` : ''}

        <div class="post-content">
            ${post.audio ? `<audio class="post-audio" controls preload="metadata" src="${post.audio}"></audio>` : ''}
            <div class="post-caption">${escapeHtml(post.caption)}</div>
            ${post.visibility === 'private' ? '<div class="post-privacy-badge private">🔒 ส่วนตัว</div>' : '<div class="post-privacy-badge public">🌍 สาธารณะ</div>'}

            <div class="post-actions">
                <button type="button" class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')" title="ส่งหัวใจ">
                    ${isLiked ? '❤️' : '🤍'} <span>${post.likes.length}</span>
                </button>
                <button type="button" class="post-action-btn ${isThanked ? 'thanked' : ''}" onclick="toggleThanks('${post.id}')" title="ขอบคุณ">
                    🙏 ขอบคุณ <span>${post.thanks.length}</span>
                </button>
                <button type="button" class="post-action-btn ${isHugged ? 'hugged' : ''}" onclick="toggleHugs('${post.id}')" title="กอด">
                    🤗 กอด <span>${post.hugs.length}</span>
                </button>
                <button type="button" class="post-action-btn" onclick="openCommentModal('${post.id}')">
                    💬 ความเห็น <span>${post.comments.length}</span>
                </button>
                <button type="button" class="post-action-btn share-btn" onclick="sharePost('${post.id}')">
                    📤 ส่งต่อ
                </button>
                <button type="button" class="post-action-btn send-btn" onclick="openSendPostModal('${post.id}')">
                    💌 ส่งให้
                </button>
                <button type="button" class="post-action-btn save-btn ${isSaved ? 'saved' : ''}" onclick="toggleSavePost('${post.id}')">
                    🔖 ${isSaved ? 'บันทึกแล้ว' : 'บันทึก'}
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
                    ${post.comments.length > 3 ? `<button type="button" class="view-comments-btn" onclick="openCommentModal('${post.id}')">ดูความคิดเห็นทั้งหมด (${post.comments.length})</button>` : ''}
                </div>
            ` : ''}

            <div class="inline-comment-section">
                <input class="inline-comment-input" id="comment-${post.id}" type="text" placeholder="เขียนความคิดเห็นอย่างสร้างสรรค์..." maxlength="500" onkeydown="if(event.key === 'Enter') submitInlineComment('${post.id}')">
                <button type="button" class="inline-comment-btn" onclick="submitInlineComment('${post.id}')">ส่ง</button>
            </div>
        </div>
    `;

    return div;
}

// Return active reaction
function getCurrentReaction(post) {
    const uid = currentUser.id;
    const uname = currentUser.username;
    if (post.likes.includes(uid) || post.likes.includes(uname)) return 'like';
    if (post.thanks.includes(uid) || post.thanks.includes(uname)) return 'thanks';
    if (post.hugs.includes(uid) || post.hugs.includes(uname)) return 'hugs';
    return null;
}

async function setReaction(postId, reactionType) {
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;

    const currentReaction = getCurrentReaction(post);
    const uid = currentUser.id;

    ['likes', 'thanks', 'hugs'].forEach(type => {
        if (!Array.isArray(post[type])) post[type] = [];
        post[type] = post[type].filter(id => String(id) !== String(uid) && id !== currentUser.username);
    });

    if (currentReaction !== reactionType) {
        post[reactionType].push(uid);
    }

    await Storage.react(postId, reactionType === 'hugs' ? 'hug' : reactionType, currentReaction !== reactionType);
    displayPosts();
}

function toggleLike(postId) { setReaction(postId, 'likes'); }
function toggleThanks(postId) { setReaction(postId, 'thanks'); }
function toggleHugs(postId) { setReaction(postId, 'hugs'); }

function toggleSavePost(postId) {
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;
    if (!Array.isArray(post.savedBy)) post.savedBy = [];

    const uid = currentUser.id;
    const index = post.savedBy.findIndex(id => id === uid || id === currentUser.username);
    if (index > -1) {
        post.savedBy.splice(index, 1);
        showToast('ยกเลิกการบันทึกโพสต์แล้ว', 'info');
    } else {
        post.savedBy.push(uid);
        showToast('บันทึกโพสต์ลงในรายการโปรดแล้ว 🔖', 'success');
    }

    displayPosts();
}

async function submitInlineComment(postId) {
    const input = document.getElementById(`comment-${postId}`);
    const text = input?.value.trim();
    if (!text) return;

    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;
    await Storage.addComment(postId, text);
    input.value = '';
    displayPosts();
    showToast('ส่งความคิดเห็นเรียบร้อยแล้ว 💬', 'success');
}

function sharePost(postId) {
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;

    const shareUrl = `${window.location.origin}/pakjai/profile.html?username=${encodeURIComponent(post.username)}`;
    const shareText = `🌲 โพสต์พักใจจาก ${post.username}: "${post.caption || 'มาพักใจด้วยกันนะ'}"`;

    if (navigator.share) {
        navigator.share({ title: 'Pakjai - พื้นที่พักใจ', text: shareText, url: shareUrl }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
            .then(() => showToast('คัดลอกลิงก์โพสต์เรียบร้อยแล้ว ✓', 'success'));
    } else {
        showToast('ลิงก์โปรไฟล์: ' + shareUrl, 'info');
    }
}

// ----------------------------------------------------
// EDIT POST (Custom Beautiful Modal)
// ----------------------------------------------------
function openEditPostModal(postId) {
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;

    editingPostId = postId;
    const modal = document.getElementById('editPostModal');
    const captionTextarea = document.getElementById('editPostCaption');
    const previewBox = document.getElementById('editPostPreview');

    captionTextarea.value = post.caption || '';

    if (post.image) {
        previewBox.style.display = 'block';
        previewBox.innerHTML = `<img src="${post.image}" alt="รูปภาพโพสต์">`;
    } else if (post.audio) {
        previewBox.style.display = 'block';
        previewBox.innerHTML = `<div style="padding: 12px;"><audio controls src="${post.audio}" style="width: 100%;"></audio></div>`;
    } else {
        previewBox.style.display = 'none';
        previewBox.innerHTML = '';
    }

    modal.classList.add('active');
    setTimeout(() => captionTextarea.focus(), 150);
}

async function saveEditedPost() {
    if (!editingPostId) return;
    const post = allPosts.find(p => String(p.id) === String(editingPostId));
    if (!post) return;

    const newCaption = document.getElementById('editPostCaption').value.trim();
    if (!newCaption && !post.image && !post.audio) {
        showToast('โพสต์ต้องมีข้อความ รูปภาพ หรือเสียง', 'error');
        return;
    }

    await Storage.updatePost({ id: editingPostId, caption: newCaption });
    post.caption = newCaption;
    displayPosts();
    loadTrendingSidebar();
    closeAllModals();
    showToast('แก้ไขข้อความโพสต์เรียบร้อยแล้ว 🍃', 'success');
}

// ----------------------------------------------------
// DELETE POST (Custom Beautiful Confirmation Modal)
// ----------------------------------------------------
function openDeletePostModal(postId) {
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;

    deletingPostId = postId;
    const modal = document.getElementById('deletePostModal');
    const snippetEl = document.getElementById('deletePostSnippet');

    const snippet = post.caption
        ? `"${post.caption.length > 90 ? post.caption.substring(0, 90) + '...' : post.caption}"`
        : (post.image ? '📷 โพสต์รูปภาพ' : '🎵 โพสต์ไฟล์เสียง');

    snippetEl.textContent = snippet;
    modal.classList.add('active');
}

async function confirmDeletePost() {
    if (!deletingPostId) return;

    await Storage.deletePost(deletingPostId);
    allPosts = allPosts.filter(p => String(p.id) !== String(deletingPostId));
    displayPosts();
    loadTrendingSidebar();
    closeAllModals();
    showToast('ลบโพสต์เรียบร้อยแล้ว 🗑️', 'info');
    deletingPostId = null;
}

// ----------------------------------------------------
// SEND POST TO FRIEND (Custom Modal)
// ----------------------------------------------------
async function openSendPostModal(postId) {
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;

    sendingPostId = postId;
    const modal = document.getElementById('sendPostModal');
    const listEl = document.getElementById('sendFriendList');
    listEl.innerHTML = '';

    const users = await Storage.getUsersFromServer();
    const currentUserData = currentUser;
    const friendIds = currentUserData.following || [];
    const friends = users.filter(u => (friendIds.includes(u.id) || friendIds.includes(u.username)) && u.username !== currentUser.username);

    if (!friends.length) {
        listEl.innerHTML = `
            <div style="text-align: center; color: var(--text-light); padding: 24px 0;">
                <p>คุณยังไม่ได้ติดตามเพื่อนในระบบ 👥</p>
                <a href="/pakjai/search.html" class="btn-secondary" style="margin-top: 12px; display: inline-block; width: auto; padding: 6px 18px;">ค้นหาเพื่อนใหม่</a>
            </div>
        `;
    } else {
        friends.forEach(friend => {
            const item = document.createElement('div');
            item.className = 'send-friend-item';
            item.innerHTML = `
                <div class="send-friend-user">
                    <img class="send-friend-avatar" src="${friend.profileImage || generateAvatar(friend.username)}" alt="Avatar">
                    <div>
                        <div style="font-weight: 600; font-size: 0.92rem;">${escapeHtml(friend.nickname || friend.username)}</div>
                        <div style="font-size: 0.78rem; color: var(--text-light);">@${escapeHtml(friend.username)}</div>
                    </div>
                </div>
                <button type="button" class="send-friend-btn" onclick="sendPostToSpecificFriend('${friend.id || friend.username}', '${escapeHtml(friend.nickname || friend.username)}')">ส่ง 💌</button>
            `;
            listEl.appendChild(item);
        });
    }

    modal.classList.add('active');
}

async function sendPostToSpecificFriend(recipientId, recipientName) {
    if (!sendingPostId) return;
    const post = allPosts.find(p => String(p.id) === String(sendingPostId));
    if (!post) return;

    await Storage.sendMessage(recipientId, `ส่งโพสต์ของ ${post.username} ให้คุณ: "${post.caption || 'ดูโพสต์นี้สิ'}"`);
    closeAllModals();
    showToast(`ส่งโพสต์ให้ ${recipientName} เรียบร้อยแล้ว 💌`, 'success');
}

function syncUserPosts() {
    // Posts are now persisted by the posts API; no client-side synchronization is needed.
}

function openCommentModal(postId) {
    currentCommentingPostId = postId;
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;

    const postUser = { username: post.username, nickname: post.nickname, nicknameColor: post.nicknameColor, profileImage: post.profileImage };
    const postDisplayName = postUser?.nickname || post.username;
    const detail = document.getElementById('modalPostDetail');

    detail.innerHTML = `
        <div class="post-header" style="padding: 0 0 10px;">
            <img class="post-avatar" src="${postUser?.profileImage || generateAvatar(post.username)}" alt="Avatar">
            <div class="post-user-info">
                <div class="post-username" style="color: ${postUser?.nicknameColor || '#2e8b68'}">${escapeHtml(postDisplayName)}</div>
                <div class="post-timestamp">${formatTime(post.timestamp)}</div>
            </div>
        </div>
        ${post.image ? `<img class="post-image" src="${post.image}" style="border-radius: 8px; margin: 8px 0;">` : ''}
        ${post.audio ? `<audio class="post-audio" controls preload="metadata" src="${post.audio}"></audio>` : ''}
        <div class="post-caption" style="margin-top: 8px;">${escapeHtml(post.caption)}</div>
    `;

    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';
    if (!post.comments.length) {
        commentsList.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 16px 0;">ยังไม่มีความคิดเห็น มาร่วมแสดงความคิดเห็นคนแรกกัน 💬</p>';
    } else {
        post.comments.forEach(c => {
            const el = document.createElement('div');
            el.className = 'comment';
            el.innerHTML = `
                <div class="comment-user">${escapeHtml(c.username)}</div>
                <div class="comment-text">${escapeHtml(c.text)}</div>
                <div class="comment-time">${formatTime(c.timestamp)}</div>
            `;
            commentsList.appendChild(el);
        });
    }

    document.getElementById('commentModal').classList.add('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    currentCommentingPostId = null;
    editingPostId = null;
    deletingPostId = null;
    sendingPostId = null;
}

async function submitComment() {
    const text = document.getElementById('commentInput').value.trim();
    if (!text || !currentCommentingPostId) return;

    const post = allPosts.find(p => String(p.id) === String(currentCommentingPostId));
    if (!post) return;
    await Storage.addComment(currentCommentingPostId, text);
    document.getElementById('commentInput').value = '';
    openCommentModal(currentCommentingPostId);
    displayPosts();
    showToast('ส่งความคิดเห็นสำเร็จ 💬', 'success');
}

// Global Toast Notification Helper
function showToast(message, type = 'success', duration = 3200) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'pakjai-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `pakjai-toast ${type}`;

    const iconMap = {
        success: '🌿',
        error: '⚠️',
        info: '✨'
    };

    toast.innerHTML = `
        <span>${iconMap[type] || '🍃'}</span>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'เมื่อสักครู่';
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} วันที่แล้ว`;

    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}