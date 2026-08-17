let currentUser = null;
let recentSearches = [];
let currentSearchTerm = '';
let currentFilter = 'all';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadRecentSearches();
    setupEventListeners();
    loadTrendingData();
});

// Check authentication
function checkAuth() {
    currentUser = Storage.getCurrentUser();
    if (!currentUser) {
        window.location.href = '/pakjai/index.html';
        return;
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    document.getElementById('searchBtn').addEventListener('click', performSearch);

    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;

            if (currentSearchTerm) {
                displayResults();
            }
        });
    });

    // Modal close
    document.querySelector('.modal-close').addEventListener('click', () => {
        document.getElementById('userModal').classList.remove('active');
    });

    document.getElementById('userModal').addEventListener('click', (e) => {
        if (e.target.id === 'userModal') {
            document.getElementById('userModal').classList.remove('active');
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        Storage.logout();
        window.location.href = '/pakjai/index.html';
    });
}

// Perform search
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim();

    if (!searchTerm) {
        return;
    }

    currentSearchTerm = searchTerm;

    // Add to recent searches
    addToRecentSearches(searchTerm);

    // Show results
    document.getElementById('recentSearchesContainer').classList.remove('active');
    document.getElementById('resultsContainer').classList.add('active');

    displayResults();
}

// Display search results
function displayResults() {
    const results = searchItems(currentSearchTerm);

    // Users
    displayUserResults(results.users);

    // Posts
    displayPostResults(results.posts);

    // Tags
    displayTagResults(results.tags);

    if (results.users.length === 0 && results.posts.length === 0 && results.tags.length === 0) {
        document.getElementById('noResults').style.display = 'block';
        document.getElementById('usersResults').style.display = 'none';
        document.getElementById('postsResults').style.display = 'none';
        document.getElementById('tagsResults').style.display = 'none';
    } else {
        document.getElementById('noResults').style.display = 'none';

        if (results.users.length > 0) {
            document.getElementById('usersResults').style.display = 'block';
        } else {
            document.getElementById('usersResults').style.display = 'none';
        }

        if (results.posts.length > 0) {
            document.getElementById('postsResults').style.display = 'block';
        } else {
            document.getElementById('postsResults').style.display = 'none';
        }

        if (results.tags.length > 0) {
            document.getElementById('tagsResults').style.display = 'block';
        } else {
            document.getElementById('tagsResults').style.display = 'none';
        }
    }
}

// Search items
function searchItems(term) {
    const lowerTerm = term.toLowerCase();
    const users = [];
    const posts = [];
    const tags = new Set();

    // Search users
    const allUsers = JSON.parse(localStorage.getItem('users')) || [];
    allUsers.forEach(user => {
        if (user.username.toLowerCase().includes(lowerTerm) ||
            user.bio?.toLowerCase().includes(lowerTerm) ||
            user.email.toLowerCase().includes(lowerTerm)) {
            users.push(user);
        }
    });

    // Search posts & tags
    const allPosts = JSON.parse(localStorage.getItem('posts')) || [];
    allPosts.forEach(post => {
        if (post.caption.toLowerCase().includes(lowerTerm)) {
            posts.push(post);

            // Extract hashtags
            const hashtagMatches = post.caption.match(/#[ก-๙a-zA-Z0-9]+/g);
            if (hashtagMatches) {
                hashtagMatches.forEach(tag => tags.add(tag));
            }
        }
    });

    // Add hashtag results
    const tagsArray = Array.from(tags).filter(tag =>
        tag.toLowerCase().includes(lowerTerm)
    );

    return { users, posts, tags: tagsArray };
}

// Display user results
function displayUserResults(users) {
    const container = document.getElementById('usersList');
    container.innerHTML = '';

    users.slice(0, 9).forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-result-card';

        const isFollowing = currentUser.id &&
            JSON.parse(localStorage.getItem('users')).find(u => u.id === currentUser.id)?.following.includes(user.id);

        card.innerHTML = `
            <img class="user-result-avatar" src="${user.profileImage || generateAvatar(user.username)}" alt="Avatar">
            <div class="user-result-name">${user.nickname || user.username}</div>
            <div class="user-result-handle">@${user.username}</div>
            <div class="user-result-bio">${user.bio || 'ไม่มีประวัติส่วนตัว'}</div>

            <div class="user-result-stats">
                <div class="user-stat">
                    <div class="user-stat-num">${user.posts?.length || 0}</div>
                    <div class="user-stat-label">โพสต์</div>
                </div>
                <div class="user-stat">
                    <div class="user-stat-num">${user.followers?.length || 0}</div>
                    <div class="user-stat-label">ผู้ติดตาม</div>
                </div>
                <div class="user-stat">
                    <div class="user-stat-num">${user.following?.length || 0}</div>
                    <div class="user-stat-label">ติดตาม</div>
                </div>
            </div>

            <button class="user-result-btn ${isFollowing ? 'following' : ''}" onclick="toggleFollowUser('${user.id}')">
                ${isFollowing ? '✓ กำลังติดตาม' : '+ ติดตาม'}
            </button>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('user-result-btn')) {
                showUserModal(user);
            }
        });

        container.appendChild(card);
    });
}

// Display post results
function displayPostResults(posts) {
    const container = document.getElementById('postsList');
    container.innerHTML = '';

    posts.slice(0, 6).forEach(post => {
        const postUser = Storage.getUser(post.username);
        const card = document.createElement('div');
        card.className = 'post-result-card';

        card.innerHTML = `
            <div class="post-result-header">
                <img class="post-result-avatar" src="${postUser?.profileImage || generateAvatar(post.username)}" alt="Avatar">
                <div class="post-result-user-info">
                    <div class="post-result-username">${postUser?.nickname || post.username}</div>
                    <div class="post-result-time">${formatTime(post.timestamp)}</div>
                </div>
            </div>

            ${post.image ? `<img class="post-result-image" src="${post.image}" alt="Post">` : ''}

            <div class="post-result-content">
                <div class="post-result-caption">${escapeHtml(post.caption)}</div>
                <div class="post-result-stats">
                    <span>❤️ ${post.likes?.length || 0}</span>
                    <span>💬 ${post.comments?.length || 0}</span>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Display tag results
function displayTagResults(tags) {
    const container = document.getElementById('tagsList');
    container.innerHTML = '';

    tags.slice(0, 12).forEach(tag => {
        const posts = JSON.parse(localStorage.getItem('posts')) || [];
        const tagPostCount = posts.filter(p =>
            p.caption.toLowerCase().includes(tag.toLowerCase())
        ).length;

        const card = document.createElement('div');
        card.className = 'tag-card';
        card.innerHTML = `
            <div class="tag-name">${tag}</div>
            <div class="tag-count">${tagPostCount} โพสต์</div>
        `;

        card.addEventListener('click', () => {
            document.getElementById('searchInput').value = tag;
            performSearch();
        });

        container.appendChild(card);
    });
}

// Show user modal
function showUserModal(user) {
    const modal = document.getElementById('userModal');
    const body = document.getElementById('userModalBody');

    const currentUserData = Storage.getUser(currentUser.username);
    const isFollowing = currentUserData.following.includes(user.id);

    body.innerHTML = `
        <img class="user-modal-avatar" src="${user.profileImage || generateAvatar(user.username)}" alt="Avatar">
        <div class="user-modal-name">${user.nickname || user.username}</div>
        <div class="user-modal-handle">@${user.username}</div>
        <div class="user-modal-bio">${user.bio || 'ไม่มีประวัติส่วนตัว'}</div>

        <div class="user-modal-stats">
            <div class="user-modal-stat">
                <div class="user-modal-stat-num">${user.posts?.length || 0}</div>
                <div class="user-modal-stat-label">โพสต์</div>
            </div>
            <div class="user-modal-stat">
                <div class="user-modal-stat-num">${user.followers?.length || 0}</div>
                <div class="user-modal-stat-label">ผู้ติดตาม</div>
            </div>
            <div class="user-modal-stat">
                <div class="user-modal-stat-num">${user.following?.length || 0}</div>
                <div class="user-modal-stat-label">ติดตาม</div>
            </div>
        </div>

        <button class="user-modal-btn ${isFollowing ? 'following' : ''}" onclick="toggleFollowUser('${user.id}')">
            ${isFollowing ? '✓ กำลังติดตาม' : '+ ติดตาม'}
        </button>
    `;

    modal.classList.add('active');
}

// Toggle follow user
function toggleFollowUser(userId) {
    const currentUserData = Storage.getUser(currentUser.username);
    const index = currentUserData.following.indexOf(userId);

    if (index > -1) {
        currentUserData.following.splice(index, 1);
    } else {
        currentUserData.following.push(userId);
    }

    // Update storage
    let users = JSON.parse(localStorage.getItem('users')) || [];
    users = users.map(u => u.id === currentUserData.id ? currentUserData : u);
    localStorage.setItem('users', JSON.stringify(users));

    // Refresh display
    if (currentSearchTerm) {
        displayResults();
    }
}

// Recent searches
function addToRecentSearches(term) {
    recentSearches = recentSearches.filter(s => s !== term);
    recentSearches.unshift(term);

    if (recentSearches.length > 10) {
        recentSearches.pop();
    }

    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    loadRecentSearches();
}

function loadRecentSearches() {
    recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
    const container = document.getElementById('recentSearchesList');
    container.innerHTML = '';

    if (recentSearches.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center;">ยังไม่มีประวัติการค้นหา</p>';
        return;
    }

    recentSearches.forEach(search => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = `
            <span class="search-item-text">${escapeHtml(search)}</span>
            <button class="remove-search" onclick="removeRecentSearch('${search}')">✕</button>
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-search')) {
                document.getElementById('searchInput').value = search;
                performSearch();
            }
        });

        container.appendChild(item);
    });
}

function removeRecentSearch(term) {
    recentSearches = recentSearches.filter(s => s !== term);
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    loadRecentSearches();
}

// Load trending data
function loadTrendingData() {
    const allPosts = JSON.parse(localStorage.getItem('posts')) || [];
    const tagMap = {};

    allPosts.forEach(post => {
        const matches = post.caption.match(/#[ก-๙a-zA-Z0-9]+/g);
        if (matches) {
            matches.forEach(tag => {
                tagMap[tag] = (tagMap[tag] || 0) + 1;
            });
        }
    });

    const trending = Object.entries(tagMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const container = document.getElementById('trendingList');
    container.innerHTML = '';

    if (trending.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center;">ยังไม่มีแฮชแท็ก</p>';
        return;
    }

    trending.forEach(([tag, count]) => {
        const item = document.createElement('div');
        item.className = 'trending-item';
        item.innerHTML = `
            <span class="trending-tag">${tag}</span>
            <span class="trending-count">${count} โพสต์</span>
        `;

        item.addEventListener('click', () => {
            document.getElementById('searchInput').value = tag;
            performSearch();
        });

        container.appendChild(item);
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
    if (diff < 604800) return Math.floor(diff / 86400) + ' วันที่แล้ว';

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
    const svg = `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" fill="${color}"/>
        <text x="40" y="40" font-size="36" font-weight="bold" fill="white"
              text-anchor="middle" dominant-baseline="central">${username[0].toUpperCase()}</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}