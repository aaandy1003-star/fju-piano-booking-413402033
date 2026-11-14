(async () => {
  const me = Auth.current();
  if (!me) { location.href = 'login.html'; return; }

  const $ = id => document.getElementById(id);
  const form = $('profileForm');

  // 把新資料同步回登入資訊，避免重新整理後又變回舊姓名
  function syncSession(u) {
    try {
      const raw = sessionStorage.getItem('rr_session');
      const s = raw && JSON.parse(raw);
      if (!s || typeof s !== 'object') return;
      const target = (s.user && typeof s.user === 'object') ? s.user : s;
      Object.assign(target, { name: u.name, email: u.email, phone: u.phone });
      sessionStorage.setItem('rr_session', JSON.stringify(s));
    } catch (e) { /* 格式不符就略過 */ }
    const navUser = document.querySelector('.nav-user');
    if (navUser) navUser.textContent = `👤 ${u.name}（${u.role === 'admin' ? '管理者' : '教師'}）`;
  }

  function fill(p) {
    $('pUsername').value = p.username;
    $('pRole').value = p.role === 'admin' ? '管理者' : '教師';
    $('pName').value = p.name || '';
    $('pPhone').value = p.phone || '';
    $('pEmail').value = p.email || '';
  }

  try { fill(await Api.getProfile()); }
  catch (e) { UI.toast(e.message, 'error'); return; }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const newPw = fd.get('newPassword') || '';
    if (newPw && newPw !== fd.get('confirmPassword')) {
      UI.toast('兩次輸入的新密碼不一致', 'error');
      return;
    }
    const btn = $('saveBtn');
    btn.disabled = true;
    try {
      const updated = await Api.updateProfile({
        name: fd.get('name'),
        phone: fd.get('phone'),
        email: fd.get('email'),
        oldPassword: fd.get('oldPassword'),
        newPassword: newPw
      });
      syncSession(updated);
      fill(updated);
      ['oldPassword', 'newPassword', 'confirmPassword'].forEach(n => { form.elements[n].value = ''; });
      UI.toast('個人資料已更新', 'success');
    } catch (ex) {
      UI.toast(ex.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
})();
