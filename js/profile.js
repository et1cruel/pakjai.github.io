let currentUser = null;
let profileUser = null;
let viewingOtherProfile = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (!currentUser) return;
    loadProfile();
    setupEventListeners();
});

// Check authentication
async function checkAuth() {
    currentUser = await Storage.getServerSession().catch(() => Storage.getCurrentUser());
    if (!currentUser) {
        window.location.href = '/index.html';
        return;
    }
}

// Load current user's profile
function loadProfile() {
    const requestedUsername = new URLSearchParams(window.location.search).get('username');
    profileUser = Storage.getUser(requestedUsername || currentUser.username);
    viewingOtherProfile = Boolean(requestedUsername && requestedUsername !== currentUser.username);
    if (profileUser) {
        document.getElementById('editProfileBtn').style.display = viewingOtherProfile ? 'none' : '';
        displayProfileInfo();
        loadUserPosts();
        loadTabs();
    }
}

// Display profile information
function displayProfileInfo() {
    const profileName = document.getElementById('profileUsername');
    profileName.textContent = profileUser.nickname || profileUser.username;
    profileName.style.color = profileUser.nicknameColor || '#34a887';
    profileName.classList.add('nickname-display');
    document.getElementById('profileHandle').textContent = '@' + profileUser.username;
    document.getElementById('profileBio').textContent = profileUser.bio || 'ยังไม่มีประวัติส่วนตัว';

    if (profileUser.profileImage) {
        document.getElementById('profileImage').src = profileUser.profileImage;
    } else {
        document.getElementById('profileImage').src = generateAvatar(profileUser.username);
    }

    const profileBg = document.querySelector('.profile-bg');
    profileBg.style.backgroundImage = profileUser.coverImage
        ? `url("${profileUser.coverImage}")`
        : '';
    profileBg.classList.toggle('has-cover-image', Boolean(profileUser.coverImage));

    document.getElementById('postsCount').textContent = profileUser.posts?.length || 0;
    document.getElementById('followersCount').textContent = profileUser.followers?.length || 0;
    document.getElementById('followingCount').textContent = profileUser.following?.length || 0;
}

// Load user's posts
function loadUserPosts() {
    const posts = profileUser.posts || [];
    const container = document.getElementById('postsContainer');
    container.innerHTML = '';

    if (posts.length === 0) {
        document.getElementById('noPostsMsg').style.display = 'block';
        return;
    }

    document.getElementById('noPostsMsg').style.display = 'none';

    posts.reverse().forEach(post => {
        if (post.image) {
            const div = document.createElement('div');
            div.className = 'grid-post';
            const postAuthor = Storage.getUser(post.username);
            div.innerHTML = `
                <img src="${post.image}" alt="Post">
                <div class="grid-post-author">${postAuthor?.nickname || post.username}</div>
                <div class="grid-post-overlay">
                    <div class="grid-post-stat">❤️ ${post.likes?.length || 0}</div>
                    <div class="grid-post-stat">💬 ${post.comments?.length || 0}</div>
                </div>
            `;
            div.addEventListener('click', () => viewPost(post.id));
            container.appendChild(div);
        }
    });
}

// Load media tab
function loadTabs() {
    // Media Tab
    const mediaContainer = document.getElementById('mediaContainer');
    mediaContainer.innerHTML = '';
    const posts = profileUser.posts || [];
    posts.forEach(post => {
        if (post.image) {
            const div = document.createElement('div');
            div.className = 'media-item';
            div.innerHTML = `<img src="${post.image}" alt="Media">`;
            div.addEventListener('click', () => viewPost(post.id));
            mediaContainer.appendChild(div);
        }
    });

    // Followers Tab
    loadFollowersList();
}

// Load followers list
function loadFollowersList() {
    const followersList = document.getElementById('followersList');
    followersList.innerHTML = '';

    const followers = profileUser.followers || [];
    if (followers.length === 0) {
        followersList.innerHTML = '<p style="text-align: center; padding: 40px;">ยังไม่มีผู้ติดตาม</p>';
        return;
    }

    const allUsers = JSON.parse(localStorage.getItem('users')) || [];
    followers.forEach(followerId => {
        const user = allUsers.find(u => u.id === followerId);
        if (user) {
            const card = createFollowerCard(user);
            followersList.appendChild(card);
        }
    });
}

// Create follower card
function createFollowerCard(user) {
    const isFollowing = profileUser.following.includes(user.id);

    const div = document.createElement('div');
    div.className = 'follower-card';
    div.dataset.profileUsername = user.username;
    div.innerHTML = `
            <img class="follower-avatar" src="${user.profileImage || generateAvatar(user.username)}" alt="Avatar" data-profile-username="${user.username}">
        <div class="follower-name" data-profile-username="${user.username}">${user.nickname || user.username}</div>
        <div class="follower-handle">@${user.username}</div>
        <div class="follower-bio">${user.bio || 'ไม่มีประวัติส่วนตัว'}</div>
        <button class="follower-btn ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${user.id}')">
            ${isFollowing ? 'กำลังติดตาม' : 'ติดตาม'}
        </button>
    `;
    return div;
}

// Setup event listeners
function setupEventListeners() {
    // Edit profile button
    document.getElementById('editProfileBtn').addEventListener('click', openEditModal);

    // Tab switching
    document.querySelectorAll('.profile-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.profile-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(tab + 'Tab').classList.add('active');
        });
    });

    // Edit form
    document.getElementById('editForm').addEventListener('submit', saveProfile);
    document.getElementById('profilePhotoInput').addEventListener('change', previewProfilePhoto);
    document.getElementById('coverPhotoInput').addEventListener('change', previewCoverPhoto);
    document.getElementById('editBio').addEventListener('input', updateBioCount);
    document.getElementById('editNickname').addEventListener('input', updateNicknameStatus);

    // Modal close
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });

    // Close modal on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        Storage.logout();
        window.location.href = '/index.html';
    });
}

// Open edit modal
function openEditModal() {
    document.getElementById('editUsername').value = profileUser.username;
    document.getElementById('editEmail').value = profileUser.email;
    document.getElementById('editNickname').value = profileUser.nickname || '';
    document.getElementById('nicknameColor').value = profileUser.nicknameColor || '#34a887';
    updateNicknameStatus();
    document.getElementById('editBio').value = profileUser.bio || '';

    const previewImg = document.getElementById('previewProfileImg');
    previewImg.src = profileUser.profileImage || generateAvatar(profileUser.username);
    const previewCover = document.getElementById('previewCoverImg');
    previewCover.style.backgroundImage = profileUser.coverImage
        ? `url("${profileUser.coverImage}")`
        : '';

    updateBioCount();
    document.getElementById('editModal').classList.add('active');
}

// Preview profile photo
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

// Preview cover photo
function previewCoverPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('previewCoverImg').style.backgroundImage = `url("${event.target.result}")`;
    };
    reader.readAsDataURL(file);
}

// Update bio character count
function updateBioCount() {
    const bio = document.getElementById('editBio').value;
    document.getElementById('bioCount').textContent = bio.length + '/150';
}

// Save profile
function saveProfile(e) {
    e.preventDefault();

    const email = document.getElementById('editEmail').value;
    const bio = document.getElementById('editBio').value;
    const nickname = document.getElementById('editNickname').value.trim();
    const nicknameColor = document.getElementById('nicknameColor').value;
    const nicknameChanged = nickname !== (profileUser.nickname || '');

    if (!nickname || nickname.length < 2) {
        alert('กรุณาตั้งชื่อเล่นอย่างน้อย 2 ตัวอักษร');
        return;
    }

    if (nicknameChanged && !canChangeNickname()) {
        alert(`คุณสามารถเปลี่ยนชื่อเล่นได้อีกครั้งในวันที่ ${getNicknameChangeDate()}`);
        return;
    }
    const photoInput = document.getElementById('profilePhotoInput');
    const coverInput = document.getElementById('coverPhotoInput');

    // Update profile data
    profileUser.email = email;
    profileUser.bio = bio;
    profileUser.nicknameColor = nicknameColor;
    if (nicknameChanged) {
        profileUser.nickname = nickname;
        profileUser.nicknameChangedAt = new Date().toISOString();
    } else if (!profileUser.nickname) {
        profileUser.nickname = nickname;
    }

    const saveChanges = () => {
        updateUserStorage();
        displayProfileInfo();
        closeEditModal();
        alert('โปรไฟล์อัปเดตสำเร็จ! ✓');
    };

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
            readCover().then(saveChanges);
        };
        reader.readAsDataURL(photoInput.files[0]);
    } else {
        readCover().then(saveChanges);
    }
}

// Nickname can be changed once every seven days
function canChangeNickname() {
    if (!profileUser.nicknameChangedAt) return true;
    const sevenDays =7 * 24 * 60 * 60 * 1000;
    return Date.now() - new Date(profileUser.nicknameChangedAt).getTime() >= sevenDays;
}

function getNicknameChangeDate() {
    const nextChange = new Date(new Date(profileUser.nicknameChangedAt).getTime() + 7 * 24 * 60 * 60 * 1000);
    return nextChange.toLocaleDateString('th-TH');
}

function updateNicknameStatus() {
    const status = document.getElementById('nicknameStatus');
    if (!status) return;
    if (!profileUser.nicknameChangedAt || canChangeNickname()) {
        status.textContent = 'เปลี่ยนชื่อเล่นได้';
        status.classList.remove('nickname-locked');
    } else {
        status.textContent = `เปลี่ยนได้อีกครั้งวันที่ ${getNicknameChangeDate()}`;
        status.classList.add('nickname-locked');
    }
}

// Update user in storage
function updateUserStorage() {
    let users = JSON.parse(localStorage.getItem('users')) || [];
    users = users.map(u => u.id === profileUser.id ? profileUser : u);
    localStorage.setItem('users', JSON.stringify(users));
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

// Toggle follow user
function toggleFollow(userId) {
    const index = profileUser.following.indexOf(userId);
    if (index > -1) {
        profileUser.following.splice(index, 1);
    } else {
        profileUser.following.push(userId);
    }

    updateUserStorage();
    loadFollowersList();
}

// View post detail
function viewPost(postId) {
    const post = profileUser.posts.find(p => p.id === postId);
    if (post) {
        alert(`โพสต์:\n${post.caption}\n\nLikes: ${post.likes.length}\nComments: ${post.comments.length}`);
    }
}

// Generate avatar
function generateAvatar(username) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    const color = colors[username.charCodeAt(0) % colors.length];
    const svg = `<svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="150" fill="${color}"/>
        <text x="75" y="75" font-size="60" font-weight="bold" fill="white"
              text-anchor="middle" dominant-baseline="central">${username[0].toUpperCase()}</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}