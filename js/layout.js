const Layout = {
  injectStyle() {
    if (document.getElementById('logo-style')) return;
    const css = `
      /* ===== 固定頂部（sticky 要設在外層容器 #site-header 上才有效） ===== */
      #site-header { position: sticky; top: 0; z-index: 900; }
      .site-header { background: #fff; transition: box-shadow .3s; }
      .site-header.scrolled { box-shadow: 0 4px 16px rgba(0, 0, 0, .18); }

      /* ===== Logo（校徽 + 系統名稱） ===== */
      .brand { display: inline-flex; align-items: center; gap: 14px; text-decoration: none; }
      .brand-mark { width: 68px; height: 68px; flex: none; display: block; object-fit: contain; transition: width .25s, height .25s, transform .3s; }
      .brand:hover .brand-mark { transform: scale(1.05); }
      .brand-text { display: flex; flex-direction: column; line-height: 1.2; padding-left: 14px; border-left: 2px solid #d5deea; }
      .brand-text b { font-size: 1.5rem; letter-spacing: .14em; color: #1c3f73; transition: font-size .25s; }
      .brand-text small { font-size: .85rem; letter-spacing: .1em; color: #2a9bd0; font-weight: 700; transition: font-size .25s; }
      .site-header.scrolled .brand-mark { width: 50px; height: 50px; }
      .site-header.scrolled .brand-text b { font-size: 1.2rem; }
      .site-header.scrolled .brand-text small { font-size: .75rem; }

      .top-links a { color: #555; }
      .top-links a:hover { color: #1f6fc5; }
      .nav-toggle { color: #1c3f73; }

      html { scroll-behavior: smooth; scroll-padding-top: var(--header-h, 130px); }

      /* ===== 回頂部按鈕 ===== */
      .to-top {
        position: fixed; right: 24px; bottom: 28px; z-index: 800;
        width: 48px; height: 48px; border: 0; border-radius: 50%;
        background: linear-gradient(135deg, #1f6fc5, #6f4fb8); color: #fff;
        font-size: 1.4rem; line-height: 1; cursor: pointer;
        box-shadow: 0 8px 20px rgba(31, 60, 140, .35);
        opacity: 0; visibility: hidden; transform: translateY(16px);
        transition: opacity .3s, transform .3s, visibility .3s, box-shadow .2s;
      }
      .to-top.show { opacity: 1; visibility: visible; transform: none; }
      .to-top:hover { transform: translateY(-4px); box-shadow: 0 12px 26px rgba(31, 60, 140, .45); }
      .to-top:focus-visible { outline: 3px solid #7ee0ff; outline-offset: 2px; }

      @media (max-width: 720px) {
        .brand { gap: 10px; }
        .brand-mark { width: 52px; height: 52px; }
        .brand-text { padding-left: 10px; }
        .brand-text b { font-size: 1.05rem; letter-spacing: .08em; }
        .brand-text small { font-size: .7rem; }
        .site-header.scrolled .brand-mark { width: 42px; height: 42px; }
        .site-header.scrolled .brand-text b { font-size: .95rem; }
        .site-header.scrolled .brand-text small { font-size: .65rem; }
        .to-top { right: 16px; bottom: 20px; width: 44px; height: 44px; }
      }
      @media (prefers-reduced-motion: reduce) {
        html { scroll-behavior: auto; }
        .to-top, .brand-mark, .brand-text b, .brand-text small { transition: none; }
      }
    `;
    const style = document.createElement('style');
    style.id = 'logo-style';
    style.textContent = css;
    document.head.appendChild(style);
  },

  // 分頁標籤的小圖示（自動套用到所有頁面，不用逐頁加）
  injectFavicon() {
    if (document.querySelector('link[rel="icon"]')) return;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = 'assets/logo.jpg';
    document.head.appendChild(link);
  },

  initScroll() {
    const header = document.querySelector('.site-header');
    const wrap = document.getElementById('site-header');

    let btn = document.getElementById('toTop');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'toTop';
      btn.className = 'to-top';
      btn.type = 'button';
      btn.setAttribute('aria-label', '回到頁面頂部');
      btn.title = '回到頂部';
      btn.textContent = '↑';
      document.body.appendChild(btn);
      btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    const measure = () => {
      if (wrap) document.documentElement.style.setProperty('--header-h', wrap.offsetHeight + 12 + 'px');
    };

    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      if (header) header.classList.toggle('scrolled', y > 40);
      btn.classList.toggle('show', y > 320);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    const nav = document.getElementById('navToggle');
    if (nav) nav.addEventListener('click', () => setTimeout(measure, 50));
    measure();
    onScroll();
  },

  render() {
    this.injectStyle();
    this.injectFavicon();

    const page = document.body.dataset.page;
    const user = Auth.current();

    const links = [
      { href: 'index.html', key: 'index', text: '首頁' },
      { href: 'rules.html', key: 'rules', text: '使用規範' },
      { href: 'booking.html', key: 'booking', text: '預約管理', perm: 'booking' },
      { href: 'slots.html', key: 'slots', text: '時段管理', perm: 'slots' },
      { href: 'accounts.html', key: 'accounts', text: '帳號管理', perm: 'accounts' },
      { href: 'announcements.html', key: 'announcements', text: '公告管理', perm: 'announcements' }
    ].filter(l => !l.perm || Auth.can(l.perm));

    // 所有登入者（教師、管理者）都能編輯自己的個人資料   ← 新增
    if (user) links.push({ href: 'profile.html', key: 'profile', text: '個人資料' });

    const navHtml = links.map(l => `<a href="${l.href}" class="${l.key === page ? 'active' : ''}">${l.text}</a>`).join('');
    const userHtml = user
      ? `<span class="nav-spacer"></span>
         <span class="nav-user">👤 ${UI.esc(user.name)}（${user.role === 'admin' ? '管理者' : '教師'}）</span>
         <a href="#" id="logoutBtn">登出</a>`
      : `<span class="nav-spacer"></span><a href="login.html" class="${page === 'login' ? 'active' : ''}">教師／管理者登入</a>`;

    const header = document.getElementById('site-header');
    if (header) {
      header.innerHTML = `
      <header class="site-header">
        <div class="container header-top">
          <a class="brand" href="index.html" aria-label="輔仁大學 琴房借用系統，回首頁">
            <img class="brand-mark" src="assets/logo.jpg" alt="輔仁大學校徽">
            <span class="brand-text">
              <b>琴房借用系統</b>
              <small>PIANO ROOM BOOKING</small>
            </span>
          </a>
          <div class="top-links">
            <a href="rules.html#faq">常見問題</a>
            <a href="rules.html">使用規範</a>
            <a href="rules.html#contact">聯絡我們</a>
            <a href="index.html">回首頁</a>
          </div>
          <button class="nav-toggle" id="navToggle" aria-label="開關選單">☰</button>
        </div>
        <div class="header-bar">
          <nav class="container main-nav" id="mainNav">${navHtml}${userHtml}</nav>
        </div>
      </header>`;

      document.getElementById('navToggle').onclick = () => document.getElementById('mainNav').classList.toggle('open');
      const out = document.getElementById('logoutBtn');
      if (out) out.onclick = e => { e.preventDefault(); Auth.logout(); };
    }

    const footer = document.getElementById('site-footer');
    if (footer) {
      footer.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          Copyright © Fu Jen Catholic University
          <small>建議使用 Edge、Firefox、Chrome 最新版本瀏覽・課程作業練習版</small>
        </div>
      </footer>`;
    }

    this.initScroll();
    UI.showFlash();
  }
};
Layout.render();
