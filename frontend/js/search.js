let currentUser = null;
let recentSearches = [];
let currentSearchTerm = '';
let currentFilter = 'all';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (!currentUser) return;
    loadRecentSearches();
    setupEventListeners();
    await loadTrendingData();
    checkQueryParam();
});

// Check authentication
async function checkAuth() {
    currentUser = await Storage.getServerSession().catch(() => Storage.getCurrentUser());
    if (!currentUser || !currentUser.username) {
        window.location.href = '/pakjai/index.html';
        return;
    }
}

// Auto search from URL (?q=...)
function checkQueryParam() {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) {
        document.getElementById('searchInput').value = q;
        performSearch();
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performSearch();
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
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('userModal').classList.remove('active');
        });
    });

    const userModal = document.getElementById('userModal');
    userModal.addEventListener('click', (e) => {
        if (e.target === userModal) userModal.classList.remove('active');
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await Storage.logout();
        window.location.href = '/pakjai/index.html';
    });
}

// Perform search
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (!searchTerm) {
        document.getElementById('recentSearchesContainer').classList.add('active');
        document.getElementById('resultsContainer').classList.remove('active');
        return;
    }

    currentSearchTerm = searchTerm;
    addToRecentSearches(searchTerm);

    document.getElementById('recentSearchesContainer').classList.remove('active');
    document.getElementById('resultsContainer').classList.add('active');

    displayResults();
}

// Display search results
async function displayResults() {
    const results = await searchItems(currentSearchTerm);

    const showUsers = currentFilter === 'all' || currentFilter === 'users';
    const showPosts = currentFilter === 'all' || currentFilter === 'posts';
    const showTags = currentFilter === 'all' || currentFilter === 'tags';

    const usersMatch = showUsers ? results.users : [];
    const postsMatch = showPosts ? results.posts : [];
    const tagsMatch = showTags ? results.tags : [];

    await displayUserResults(usersMatch);
    displayPostResults(postsMatch);
    await displayTagResults(tagsMatch);

    const hasAnyResults = usersMatch.length > 0 || postsMatch.length > 0 || tagsMatch.length > 0;
    document.getElementById('noResults').style.display = hasAnyResults ? 'none' : 'block';
    document.getElementById('usersResults').style.display = usersMatch.length > 0 ? 'block' : 'none';
    document.getElementById('postsResults').style.display = postsMatch.length > 0 ? 'block' : 'none';
    document.getElementById('tagsResults').style.display = tagsMatch.length > 0 ? 'block' : 'none';
}

// Search items
async function searchItems(term) {
    const lowerTerm = term.toLowerCase().replace(/^#/, '');
    const users = [];
    const posts = [];
    const tags = new Set();

    // Search users
    const allUsers = await Storage.getUsersFromServer().catch(() => Storage.getUsers());
    allUsers.forEach(user => {
        if (
            user.username.toLowerCase().includes(lowerTerm) ||
            (user.nickname && user.nickname.toLowerCase().includes(lowerTerm)) ||
            (user.bio && user.bio.toLowerCase().includes(lowerTerm))
        ) {
            users.push(user);
        }
    });

    // Search posts & tags
    const allPosts = (await Storage.getPosts()).filter(post =>
        post.visibility !== 'private' ||
        post.username === currentUser.username ||
        post.userId === currentUser.id
    );
    allPosts.forEach(post => {
        const captionLower = (post.caption || '').toLowerCase();
        if (captionLower.includes(lowerTerm)) {
            posts.push(post);
        }

        const hashtagMatches = (post.caption || '').match(/#[ก-๙a-zA-Z0-9_]+/g);
        if (hashtagMatches) {
            hashtagMatches.forEach(tag => {
                if (tag.toLowerCase().includes(lowerTerm)) {
                    tags.add(tag);
                }
            });
        }
    });

    return { users, posts, tags: Array.from(tags) };
}

// Display user results
async function displayUserResults(users) {
    const container = document.getElementById('usersList');
    container.innerHTML = '';

    const currentUserData = currentUser;

    const allPosts = await Storage.getPosts();
    users.slice(0, 9).forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-result-card';

        const isFollowing = currentUserData.following?.includes(user.id) || currentUserData.following?.includes(user.username);
        const userPostCount = allPosts.filter(p => p.username === user.username || p.userId === user.id).length;

        card.innerHTML = `
            <img class="user-result-avatar" src="${user.profileImage || generateAvatar(user.username)}" alt="Avatar" data-profile-username="${escapeHtml(user.username)}">
            <div class="user-result-name" data-profile-username="${escapeHtml(user.username)}" style="color: ${user.nicknameColor || '#2e8b68'}">${escapeHtml(user.nickname || user.username)}</div>
            <div class="user-result-handle">@${escapeHtml(user.username)}</div>
            <div class="user-result-bio">${escapeHtml(user.bio || 'ไม่มีประวัติส่วนตัว')}</div>

            <div class="user-result-stats">
                <div class="user-stat">
                    <div class="user-stat-num">${userPostCount}</div>
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

            ${user.username !== currentUser.username ? `
                <button type="button" class="user-result-btn ${isFollowing ? 'following' : ''}" onclick="toggleFollowUser('${user.id || user.username}')">
                    ${isFollowing ? '✓ กำลังติดตาม' : '+ ติดตาม'}
                </button>
            ` : ''}
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('user-result-btn')) {
                window.location.href = `/pakjai/profile.html?username=${encodeURIComponent(user.username)}`;
            }
        });

        container.appendChild(card);
    });
}

// Display post results
function displayPostResults(posts) {
    const container = document.getElementById('postsList');
    container.innerHTML = '';

    posts.slice(0, 8).forEach(post => {
        const postUser = post;
        const card = document.createElement('div');
        card.className = 'post-result-card';

        card.innerHTML = `
            <div class="post-result-header">
                <img class="post-result-avatar" src="${postUser?.profileImage || generateAvatar(post.username)}" alt="Avatar">
                <div class="post-result-user-info">
                    <div class="post-result-username" style="color: ${postUser?.nicknameColor || '#2e8b68'}">${escapeHtml(postUser?.nickname || post.username)}</div>
                    <div class="post-result-time">${formatTime(post.timestamp)}</div>
                </div>
            </div>

            ${post.image ? `<img class="post-result-image" src="${post.image}" alt="Post Image">` : ''}

            <div class="post-result-content">
                <div class="post-result-caption">${escapeHtml(post.caption)}</div>
                <div class="post-result-stats">
                    <span>❤️ ${post.likes?.length || 0}</span>
                    <span>💬 ${post.comments?.length || 0}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            window.location.href = `/pakjai/dashboard.html`;
        });

        container.appendChild(card);
    });
}

// Display tag results
async function displayTagResults(tags) {
    const container = document.getElementById('tagsList');
    container.innerHTML = '';

    const posts = (await Storage.getPosts()).filter(post =>
        post.visibility !== 'private' ||
        post.username === currentUser.username ||
        post.userId === currentUser.id
    );

    tags.slice(0, 12).forEach(tag => {
        const tagPostCount = posts.filter(p =>
            (p.caption || '').toLowerCase().includes(tag.toLowerCase())
        ).length;

        const card = document.createElement('div');
        card.className = 'tag-card';
        card.innerHTML = `
            <div class="tag-name">${escapeHtml(tag)}</div>
            <div class="tag-count">${tagPostCount} โพสต์</div>
        `;

        card.addEventListener('click', () => {
            document.getElementById('searchInput').value = tag;
            performSearch();
        });

        container.appendChild(card);
    });
}

// Toggle follow user
async function toggleFollowUser(userId) {
    const currentUserData = currentUser;
    const isFollowing = currentUserData.following?.includes(userId) || currentUserData.following?.includes(currentUserData.username);
    const index = (currentUserData.following || []).indexOf(userId);
    if (index > -1) {
        currentUserData.following.splice(index, 1);
    } else {
        currentUserData.following.push(userId);
    }

    await Storage.follow(userId, !isFollowing);

    if (currentSearchTerm) {
        displayResults();
    }
}

// Recent searches
function addToRecentSearches(term) {
    recentSearches = recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase());
    recentSearches.unshift(term);

    if (recentSearches.length > 8) {
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
        container.innerHTML = '<p style="color: var(--text-light); font-size: 0.88rem; text-align: center; padding: 12px;">ยังไม่มีประวัติการค้นหา</p>';
        return;
    }

    recentSearches.forEach(search => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = `
            <span class="search-item-text">${escapeHtml(search)}</span>
            <button type="button" class="remove-search" title="ลบ">✕</button>
        `;

        item.querySelector('.remove-search').addEventListener('click', (e) => {
            e.stopPropagation();
            removeRecentSearch(search);
        });

        item.addEventListener('click', () => {
            document.getElementById('searchInput').value = search;
            performSearch();
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
async function loadTrendingData() {
    const allPosts = (await Storage.getPosts()).filter(post =>
        post.visibility !== 'private' ||
        post.username === currentUser.username ||
        post.userId === currentUser.id
    );
    const tagMap = {};

    allPosts.forEach(post => {
        const matches = (post.caption || '').match(/#[ก-๙a-zA-Z0-9_]+/g);
        if (matches) {
            matches.forEach(tag => {
                tagMap[tag] = (tagMap[tag] || 0) + 1;
            });
        }
    });

    const trending = Object.entries(tagMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    const container = document.getElementById('trendingList');
    container.innerHTML = '';

    if (trending.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light); font-size: 0.88rem; text-align: center; padding: 12px;">ยังไม่มีแฮชแท็ก</p>';
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
            document.getElementById('searchInput').value = tag;
            performSearch();
        });

        container.appendChild(item);
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
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}