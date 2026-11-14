const Auth = {
  KEY: 'rr_session',

  current() {
    try { return JSON.parse(sessionStorage.getItem(this.KEY)); } catch { return null; }
  },
  async login(username, password) {
    const user = await Api.login(username, password);
    sessionStorage.setItem(this.KEY, JSON.stringify(user));
    return user;
  },
  logout() {
    sessionStorage.removeItem(this.KEY);
    UI.flash('您已成功登出', 'success');
    location.href = 'index.html';
  },
  can(perm) {
    const u = this.current();
    return !!u && u.active !== false && (u.permissions || []).includes(perm);
  },
  // 頁面守衛：沒登入導向登入頁，沒權限導回首頁
  guard(perm) {
    const u = this.current();
    if (!u) {
      UI.flash('請先登入後再使用此功能', 'info');
      location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html'));
      return false;
    }
    if (perm && !this.can(perm)) {
      UI.flash('您沒有使用此功能的權限', 'error');
      location.replace('index.html');
      return false;
    }
    return true;
  }
};

