(() => {
    const preview = document.createElement('aside');
    preview.className = 'profile-hover-card';
    preview.setAttribute('role', 'tooltip');
    preview.hidden = true;
    document.body.appendChild(preview);

    let activeUser = null;
    let hideTimer;

    function escapeHtml(value) {
        const node = document.createElement('span');
        node.textContent = value == null ? '' : String(value);
        return node.innerHTML;
    }

    async function findUser(target) {
        const username = target.closest('[data-profile-username]')?.dataset.profileUsername;
        if (!username) return null;
        try { return (await Storage.getProfile(username)).user; } catch { return null; }
    }

    async function render(user) {
        activeUser = user;
        const avatar = user.profileImage || (typeof generateAvatar === 'function' ? generateAvatar(user.username) : '');
        let userPostCount = 0;
        try { userPostCount = (await Storage.getProfile(user.username)).posts?.length || 0; } catch {}
        const zodiacLine = user.zodiac ? `<small style="color:#7c3aed;">⭐ ${escapeHtml(user.zodiac)}</small>` : '';

        preview.innerHTML = `
            <img src="${avatar}" alt="รูปโปรไฟล์ของ ${escapeHtml(user.username)}">
            <div class="profile-hover-card-body">
                <strong style="color: ${user.nicknameColor || '#2e8b68'}">${escapeHtml(user.nickname || user.username)}</strong>
                <span>@${escapeHtml(user.username)}</span>
                ${zodiacLine}
                <p>${escapeHtml(user.bio || 'ไม่มีประวัติส่วนตัว')}</p>
                <small>โพสต์ ${userPostCount} · ผู้ติดตาม ${user.followers?.length || 0}</small>
            </div>
        `;
    }

    function position(target) {
        const rect = target.getBoundingClientRect();
        preview.style.left = `${Math.min(Math.max(8, rect.left), window.innerWidth - preview.offsetWidth - 8)}px`;
        preview.style.top = `${Math.min(window.innerHeight - preview.offsetHeight - 8, rect.bottom + 8)}px`;
    }

    async function show(target) {
        const user = await findUser(target);
        if (!user) return;
        clearTimeout(hideTimer);
        await render(user);
        preview.hidden = false;
        position(target);
    }

    function hide() {
        hideTimer = window.setTimeout(() => {
            if (!preview.matches(':hover')) preview.hidden = true;
        }, 180);
    }

    document.addEventListener('mouseover', async event => {
        const target = event.target.closest('[data-profile-username]');
        if (target) await show(target);
    });

    document.addEventListener('mouseout', event => {
        if (event.target.closest('[data-profile-username]')) hide();
    });

    preview.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    preview.addEventListener('mouseleave', hide);

    preview.addEventListener('click', () => {
        if (activeUser) {
            window.location.assign(`/pakjai/profile.html?username=${encodeURIComponent(activeUser.username)}`);
        }
    });
})();
