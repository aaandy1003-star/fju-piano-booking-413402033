(() => {
  if (Auth.current()) { location.replace('index.html'); return; }

  const form = document.getElementById('loginForm');
  const err = document.getElementById('loginError');
  const btn = form.querySelector('button[type=submit]');
  const card = form;

  // 點擊展示帳號自動填入
  document.querySelectorAll('.chip-btn').forEach(b => {
    b.onclick = () => {
      form.username.value = b.dataset.u;
      form.password.value = b.dataset.p;
      form.password.focus();
    };
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.hidden = true;
    if (!form.username.value.trim() || !form.password.value) {
      err.textContent = '請輸入帳號與密碼';
      err.hidden = false;
      return;
    }
    btn.disabled = true;
    try {
      await Auth.login(form.username.value, form.password.value);
      const next = new URLSearchParams(location.search).get('next');
      // 只允許導向站內的 .html 頁面，避免被利用導去外部網站
      const safe = next && /^[\w-]+\.html$/.test(next) ? next : 'index.html';
      UI.flash('登入成功，歡迎回來！', 'success');
      location.href = safe;
    } catch (ex) {
      err.textContent = ex.message || '登入失敗';
      err.hidden = false;
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      form.password.select();
    } finally {
      btn.disabled = false;
    }
  });
})();
