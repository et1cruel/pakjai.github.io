let currentUser = null;
let profileUser = null;
let viewingOtherProfile = false;
let editingPostId = null;
let deletingPostId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (!currentUser) return;
    await loadProfile();
    setupEventListeners();
});

async function getStoredUsers() {
    try { return await Storage.getUsersFromServer(); } catch (error) { console.warn('อ่านข้อมูลผู้ใช้จาก API ไม่สำเร็จ:', error); return []; }
}

function getProfileFromLocation() {
    const requestedUsername = new URLSearchParams(window.location.search).get('username');
    const users = getStoredUsers();
    const identifier = requestedUsername || currentUser?.username || currentUser?.id;
    const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
    const foundUser = users.find(user =>
        String(user.username || '').toLowerCase() === normalizedIdentifier ||
        String(user.id || '').toLowerCase() === normalizedIdentifier ||
        String(user.email || '').toLowerCase() === normalizedIdentifier
    );
    const currentUserMatches = currentUser && (
        String(currentUser.username || '').toLowerCase() === normalizedIdentifier ||
        String(currentUser.id || '').toLowerCase() === normalizedIdentifier ||
        String(currentUser.email || '').toLowerCase() === normalizedIdentifier
    );
    return {
        requestedUsername,
        user: foundUser || (currentUserMatches ? currentUser : (!requestedUsername ? currentUser : null))
    };
}

// Check authentication
async function checkAuth() {
    currentUser = await Storage.getServerSession().catch(() => Storage.getCurrentUser());
    if (!currentUser || !currentUser.username) {
        window.location.href = '/pakjai/index.html';
        return;
    }
}

// Load profile data
async function loadProfile() {
    const requestedUsername = new URLSearchParams(window.location.search).get('username');
    try { profileUser = (await Storage.getProfile(requestedUsername || currentUser.id)).user; } catch (error) { console.error(error); profileUser = currentUser; }

    if (!profileUser) {
        document.getElementById('profileUsername').textContent = 'ไม่พบโปรไฟล์นี้';
        document.getElementById('profileHandle').textContent = requestedUsername ? `@${requestedUsername}` : '';
        document.getElementById('profileBio').textContent = 'ไม่พบข้อมูลผู้ใช้ หรือข้อมูลยังไม่พร้อมใช้งาน';
        document.getElementById('editProfileBtn')?.setAttribute('disabled', 'true');
        return;
    }

    viewingOtherProfile = Boolean(
        requestedUsername &&
        String(profileUser.id || profileUser.username).toLowerCase() !== String(currentUser.id || currentUser.username).toLowerCase()
    );

    if (profileUser) {
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) {
            editBtn.style.display = viewingOtherProfile ? 'none' : '';
        }
        await displayProfileInfo();
        await loadUserPosts();
        await loadTabs();
    }
}

// Display profile information
async function displayProfileInfo() {
    if (!profileUser) return;
    const profileName = document.getElementById('profileUsername');
    profileName.textContent = profileUser.nickname || profileUser.username;
    profileName.style.color = profileUser.nicknameColor || '#2e8b68';
    profileName.classList.add('nickname-display');

    document.getElementById('profileHandle').textContent = '@' + profileUser.username;
    document.getElementById('profileBio').textContent = profileUser.bio || 'ยังไม่มีประวัติส่วนตัว';

    const petText = profileUser.pet ? `สัตว์ประจำตัว: ${profileUser.pet}` : 'ยังไม่มีสัตว์ประจำตัว';
    const treeText = profileUser.tree ? `ต้นไม้ประจำตัว: ${profileUser.tree}` : 'ยังไม่มีต้นไม้ประจำตัว';
    document.getElementById('profilePet').textContent = `${petText}   |   ${treeText}`;

    // Zodiac badge
    const zodiacEl = document.getElementById('profileZodiac');
    if (profileUser.zodiac) {
        zodiacEl.textContent = `⭐ นักษัตร: ${profileUser.zodiac}`;
        zodiacEl.classList.add('visible');
    } else {
        zodiacEl.textContent = '';
        zodiacEl.classList.remove('visible');
    }

    const avatar = profileUser.profileImage || generateAvatar(profileUser.username);
    document.getElementById('profileImage').src = avatar;

    const profileBg = document.querySelector('.profile-bg');
    if (profileUser.coverImage) {
        profileBg.style.backgroundImage = `url("${profileUser.coverImage}")`;
        profileBg.classList.add('has-cover-image');
    } else {
        profileBg.style.backgroundImage = '';
        profileBg.classList.remove('has-cover-image');
    }

    const allPosts = await Storage.getPosts();
    const canViewPrivate = !viewingOtherProfile || profileUser.username === currentUser.username;
    const userPosts = allPosts.filter(p =>
        (p.username === profileUser.username || p.userId === profileUser.id) &&
        (p.visibility !== 'private' || canViewPrivate)
    );

    document.getElementById('postsCount').textContent = userPosts.length;
    document.getElementById('followersCount').textContent = profileUser.followers?.length || 0;
    document.getElementById('followingCount').textContent = profileUser.following?.length || 0;
}

// Load user's posts
async function loadUserPosts() {
    const allPosts = await Storage.getPosts();
    const canViewPrivate = !viewingOtherProfile || profileUser.username === currentUser.username;
    const posts = allPosts.filter(p =>
        (p.username === profileUser.username || p.userId === profileUser.id) &&
        (p.visibility !== 'private' || canViewPrivate)
    );
    const container = document.getElementById('postsContainer');
    container.innerHTML = '';

    if (posts.length === 0) {
        document.getElementById('noPostsMsg').style.display = 'block';
        return;
    }

    document.getElementById('noPostsMsg').style.display = 'none';

    posts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'grid-post';
        const imgDisplay = post.image
            ? `<img src="${post.image}" alt="Post">`
            : `<div style="padding: 24px; background: #e8f5ef; height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; color: #2e8b68; font-size: 0.9rem;">${escapeHtml(post.caption || 'โพสต์ข้อความ')}</div>`;

        div.innerHTML = `
            ${imgDisplay}
            <div class="grid-post-author">${escapeHtml(profileUser.nickname || profileUser.username)}</div>
            <div class="grid-post-overlay">
                <div class="grid-post-stat">❤️ ${post.likes?.length || 0}</div>
                <div class="grid-post-stat">💬 ${post.comments?.length || 0}</div>
            </div>
        `;
        div.addEventListener('click', () => viewPostDetail(post.id));
        container.appendChild(div);
    });
}

// Load media tab
async function loadTabs() {
    const mediaContainer = document.getElementById('mediaContainer');
    mediaContainer.innerHTML = '';
    const allPosts = await Storage.getPosts();
    const canViewPrivate = !viewingOtherProfile || profileUser.username === currentUser.username;
    const mediaPosts = allPosts.filter(p =>
        (p.username === profileUser.username || p.userId === profileUser.id) &&
        p.image && (p.visibility !== 'private' || canViewPrivate)
    );

    if (mediaPosts.length === 0) {
        mediaContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px; grid-column: 1/-1;">ยังไม่มีรูปภาพ 🖼️</p>';
    } else {
        mediaPosts.forEach(post => {
            const div = document.createElement('div');
            div.className = 'media-item';
            div.innerHTML = `<img src="${post.image}" alt="Media">`;
            div.addEventListener('click', () => viewPostDetail(post.id));
            mediaContainer.appendChild(div);
        });
    }

    await loadFollowersList();
}

// Load followers list
async function loadFollowersList() {
    const followersList = document.getElementById('followersList');
    followersList.innerHTML = '';

    const followers = profileUser.followers || [];
    if (followers.length === 0) {
        followersList.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px; grid-column: 1/-1;">ยังไม่มีผู้ติดตาม 👥</p>';
        return;
    }

    const allUsers = await Storage.getUsersFromServer();
    followers.forEach(followerId => {
        const user = allUsers.find(u => u.id === followerId || u.username === followerId);
        if (user) {
            const card = createFollowerCard(user);
            followersList.appendChild(card);
        }
    });
}

// Create follower card
function createFollowerCard(user) {
    const currentUserData = currentUser;
    const isFollowing = currentUserData.following?.includes(user.id) || currentUserData.following?.includes(user.username);

    const div = document.createElement('div');
    div.className = 'follower-card';
    div.dataset.profileUsername = user.username;
    div.innerHTML = `
        <img class="follower-avatar" src="${user.profileImage || generateAvatar(user.username)}" alt="Avatar" data-profile-username="${user.username}">
        <div class="follower-name" data-profile-username="${user.username}">${escapeHtml(user.nickname || user.username)}</div>
        <div class="follower-handle">@${escapeHtml(user.username)}</div>
        <div class="follower-bio">${escapeHtml(user.bio || 'ไม่มีประวัติส่วนตัว')}</div>
        ${user.username !== currentUser.username ? `
            <button type="button" class="follower-btn ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${user.id || user.username}')">
                ${isFollowing ? '✓ กำลังติดตาม' : '+ ติดตาม'}
            </button>
        ` : ''}
    `;
    return div;
}

// Setup event listeners
function setupEventListeners() {
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) editBtn.addEventListener('click', openEditModal);

    // Tab switching
    document.querySelectorAll('.profile-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.profile-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(tab + 'Tab')?.classList.add('active');
        });
    });

    // Edit form
    document.getElementById('editForm')?.addEventListener('submit', saveProfile);
    document.getElementById('profilePhotoInput')?.addEventListener('change', previewProfilePhoto);
    document.getElementById('coverPhotoInput')?.addEventListener('change', previewCoverPhoto);
    document.getElementById('editBio')?.addEventListener('input', updateBioCount);
    document.getElementById('editNickname')?.addEventListener('input', updateNicknameStatus);

    // Edit Post Modal Listeners
    document.getElementById('saveEditPostBtn')?.addEventListener('click', saveEditedPost);
    document.getElementById('cancelEditBtn')?.addEventListener('click', closeAllModals);

    // Delete Post Modal Listeners
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDeletePost);
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeAllModals);

    // Modal close
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAllModals();
        });
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await Storage.logout();
        window.location.href = '/pakjai/index.html';
    });
}

function openEditModal() {
    if (!profileUser || viewingOtherProfile) return;
    document.getElementById('editUsername').value = profileUser.username;
    document.getElementById('editEmail').value = profileUser.email || '';
    document.getElementById('editNickname').value = profileUser.nickname || profileUser.username;
    document.getElementById('nicknameColor').value = profileUser.nicknameColor || '#2e8b68';
    updateNicknameStatus();
    document.getElementById('editBio').value = profileUser.bio || '';
    document.getElementById('editPet').value = profileUser.pet || '🐱';
    document.getElementById('editTree').value = profileUser.tree || '🌳';

    const previewImg = document.getElementById('previewProfileImg');
    previewImg.src = profileUser.profileImage || generateAvatar(profileUser.username);

    const previewCover = document.getElementById('previewCoverImg');
    previewCover.style.backgroundImage = profileUser.coverImage ? `url("${profileUser.coverImage}")` : '';

    // Pre-select zodiac radio
    const savedZodiac = profileUser.zodiac || '';
    document.querySelectorAll('input[name="zodiac"]').forEach(radio => {
        radio.checked = radio.value === savedZodiac;
    });

    updateBioCount();
    document.getElementById('editModal').classList.add('active');
}

function previewProfilePhoto(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('previewProfileImg').src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function previewCoverPhoto(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('previewCoverImg').style.backgroundImage = `url("${event.target.result}")`;
        };
        reader.readAsDataURL(file);
    }
}

function updateBioCount() {
    const bio = document.getElementById('editBio').value;
    document.getElementById('bioCount').textContent = `${bio.length}/150`;
}

async function saveProfile(e) {
    e.preventDefault();

    const email = document.getElementById('editEmail').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const nickname = document.getElementById('editNickname').value.trim();
    const nicknameColor = document.getElementById('nicknameColor').value;
    const pet = document.getElementById('editPet').value;
    const tree = document.getElementById('editTree').value;
    const zodiacChecked = document.querySelector('input[name="zodiac"]:checked');
    const zodiac = zodiacChecked ? zodiacChecked.value : (profileUser.zodiac || '');

    if (!nickname || nickname.length < 2) {
        showToast('กรุณาตั้งชื่อเล่นอย่างน้อย 2 ตัวอักษร', 'error');
        return;
    }

    const photoInput = document.getElementById('profilePhotoInput');
    const coverInput = document.getElementById('coverPhotoInput');

    const profileUpdate = { nickname, nickname_color: nicknameColor, bio, pet, tree, zodiac };
    if (photoInput.files[0]) {
        const upload = await Storage.uploadFile('avatars', photoInput.files[0], `${currentUser.id}/avatar-${Date.now()}`);
        profileUpdate.avatar_path = upload.path;
    }
    if (coverInput.files[0]) {
        const upload = await Storage.uploadFile('covers', coverInput.files[0], `${currentUser.id}/cover-${Date.now()}`);
        profileUpdate.cover_path = upload.path;
    }
    const result = await Storage.saveProfile(profileUpdate);
    profileUser = result.user;
    currentUser = result.user;
    Storage.setCurrentUser(result.user);
    await displayProfileInfo();
    document.getElementById('editModal').classList.remove('active');
    showToast('บันทึกการเปลี่ยนแปลงโปรไฟล์สำเร็จ ✓', 'success');
    return;

    const readCover = () => {
        if (!coverInput.files[0]) return Promise.resolve();
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = event => {
                profileUser.coverImage = event.target.result;
                resolve();
            };
            reader.readAsDataURL(coverInput.files[0]);
        });
    };

    if (photoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
            profileUser.profileImage = event.target.result;
            readCover().then(finalizeSave);
        };
        reader.readAsDataURL(photoInput.files[0]);
    } else {
        readCover().then(finalizeSave);
    }
}

function updateNicknameStatus() {
    const status = document.getElementById('nicknameStatus');
    if (status) {
        status.textContent = 'สามารถปรับเปลี่ยนชื่อเล่นและเลือกสีประจำตัวได้ตามต้องการ';
    }
}

async function toggleFollow(userId) {
    const currentUserData = currentUser;
    if (!Array.isArray(currentUserData.following)) currentUserData.following = [];

    const index = currentUserData.following.indexOf(userId);
    if (index > -1) {
        currentUserData.following.splice(index, 1);
        showToast('เลิกติดตามแล้ว', 'info');
    } else {
        currentUserData.following.push(userId);
        showToast('ติดตามเรียบร้อยแล้ว ✓', 'success');
    }

    await Storage.follow(userId, index === -1);
    await loadFollowersList();
}

async function viewPostDetail(postId) {
    const allPosts = await Storage.getPosts();
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    const isOwner = String(post.userId) === String(currentUser.id) || post.username === currentUser.username;
    if (post.visibility === 'private' && !isOwner) return;
    const modalBody = document.getElementById('postModalBody');
    modalBody.innerHTML = `
        <div class="post-header" style="padding: 0 0 12px;">
            <img class="post-avatar" src="${profileUser.profileImage || generateAvatar(profileUser.username)}" alt="Avatar">
            <div class="post-user-info">
                <div class="post-username" style="color: ${profileUser.nicknameColor || '#2e8b68'}">${escapeHtml(profileUser.nickname || profileUser.username)}</div>
                <div class="post-timestamp">${formatTime(post.timestamp)}</div>
            </div>
            ${isOwner ? `
                <div class="post-owner-actions">
                    <button type="button" class="post-owner-btn" onclick="openEditPostModal('${post.id}')" title="แก้ไข">✏️ แก้ไข</button>
                    <button type="button" class="post-owner-btn delete" onclick="openDeletePostModal('${post.id}')" title="ลบ">🗑️ ลบ</button>
                </div>
            ` : ''}
        </div>
        ${post.image ? `<img class="post-image" src="${post.image}" style="border-radius: 12px; margin-bottom: 12px; max-height: 400px; width: 100%; object-fit: cover;">` : ''}
        ${post.audio ? `<audio class="post-audio" controls preload="metadata" src="${post.audio}" style="width: 100%; margin-bottom: 12px;"></audio>` : ''}
        <div class="post-caption" style="font-size: 1rem; line-height: 1.6; margin-bottom: 14px;">${escapeHtml(post.caption)}</div>
        ${post.visibility === 'private' ? '<div class="post-privacy-badge private">🔒 ส่วนตัว</div>' : '<div class="post-privacy-badge public">🌍 สาธารณะ</div>'}
        <div style="display: flex; gap: 14px; color: var(--text-muted); font-size: 0.9rem; border-top: 1px solid #f0f5f2; padding-top: 12px;">
            <span>❤️ ${post.likes?.length || 0} ถูกใจ</span>
            <span>💬 ${post.comments?.length || 0} ความเห็น</span>
        </div>
    `;

    document.getElementById('postModal').classList.add('active');
}

// ----------------------------------------------------
// EDIT POST IN PROFILE
// ----------------------------------------------------
async function openEditPostModal(postId) {
    const allPosts = await Storage.getPosts();
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

    // Close postModal if open
    document.getElementById('postModal')?.classList.remove('active');
    modal.classList.add('active');
    setTimeout(() => captionTextarea.focus(), 150);
}

async function saveEditedPost() {
    if (!editingPostId) return;
    const allPosts = await Storage.getPosts();
    const post = allPosts.find(p => String(p.id) === String(editingPostId));
    if (!post) return;

    const newCaption = document.getElementById('editPostCaption').value.trim();
    if (!newCaption && !post.image && !post.audio) {
        showToast('โพสต์ต้องมีข้อความ รูปภาพ หรือเสียง', 'error');
        return;
    }

    await Storage.updatePost({ id: editingPostId, caption: newCaption });
    post.caption = newCaption;
    await loadUserPosts();
    closeAllModals();
    showToast('แก้ไขโพสต์เรียบร้อยแล้ว 🍃', 'success');
}

// ----------------------------------------------------
// DELETE POST IN PROFILE
// ----------------------------------------------------
async function openDeletePostModal(postId) {
    const allPosts = await Storage.getPosts();
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) return;

    deletingPostId = postId;
    const modal = document.getElementById('deletePostModal');
    const snippetEl = document.getElementById('deletePostSnippet');

    const snippet = post.caption
        ? `"${post.caption.length > 90 ? post.caption.substring(0, 90) + '...' : post.caption}"`
        : (post.image ? '📷 โพสต์รูปภาพ' : '🎵 โพสต์ไฟล์เสียง');

    snippetEl.textContent = snippet;
    document.getElementById('postModal')?.classList.remove('active');
    modal.classList.add('active');
}

async function confirmDeletePost() {
    if (!deletingPostId) return;

    await Storage.deletePost(deletingPostId);

    loadUserPosts();
    displayProfileInfo();
    closeAllModals();
    showToast('ลบโพสต์เรียบร้อยแล้ว 🗑️', 'info');
    deletingPostId = null;
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    editingPostId = null;
    deletingPostId = null;
}

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

function generateAvatar(username) {
    if (!username) username = 'User';
    const colors = ['#2e8b68', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#6366f1'];
    const color = colors[username.charCodeAt(0) % colors.length];
    const initial = username[0].toUpperCase();
    const svg = `<svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="150" fill="${color}"/>
        <text x="75" y="75" font-size="65" font-family="sans-serif" font-weight="bold" fill="white"
              text-anchor="middle" dominant-baseline="central">${initial}</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}