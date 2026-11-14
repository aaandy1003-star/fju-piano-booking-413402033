(async () => {
  if (!Auth.guard('accounts')) return;

  const $ = id => document.getElementById(id);
  const list = $('accountList');
  const PERMS = [
    { key: 'booking', text: '預約管理' },
    { key: 'slots', text: '時段管理' },
    { key: 'accounts', text: '帳號管理' }
  ];
  const permText = k => (PERMS.find(p => p.key === k) || {}).text || k;
  let all = [];

  async function load() {
    list.innerHTML = UI.skeleton(4);
    try { all = await Api.listAccounts(); render(); }
    catch (e) { list.innerHTML = ''; UI.toast(e.message, 'error'); }
  }

  function render() {
    const q = $('searchBox').value.trim().toLowerCase();
    const data = all.filter(a => !q || a.username.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
    if (!data.length) {
      list.innerHTML = '<div class="empty"><b>🔍</b>找不到符合的帳號</div>';
      return;
    }
    const me = Auth.current();
    list.innerHTML = `
      <table class="table">
        <thead><tr><th>帳號</th><th>姓名</th><th>角色</th><th>功能權限</th><th>狀態</th><th>操作</th></tr></thead>
        <tbody>
          ${data.map((a, i) => `
            <tr style="--i:${i}">
              <td><strong>${UI.esc(a.username)}</strong>${a.id === me.id ? ' <span class="chip">目前登入</span>' : ''}</td>
              <td>${UI.esc(a.name)}</td>
              <td><span class="badge ${a.role === 'admin' ? 'badge-admin' : 'badge-teacher'}">${a.role === 'admin' ? '管理者' : '教師'}</span></td>
              <td>${a.permissions.map(p => `<span class="chip">${permText(p)}</span>`).join('') || '<span style="color:#aaa">—</span>'}</td>
              <td><span class="badge ${a.active ? 'badge-on' : 'badge-off'}">${a.active ? '啟用' : '停用'}</span></td>
              <td class="actions">
                <button class="btn btn-ghost btn-sm" data-edit="${a.id}">修改</button>
                <button class="btn btn-ghost btn-sm" data-del="${a.id}" ${a.id === me.id ? 'disabled' : ''}>刪除</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function formHtml(a = {}) {
    const isEdit = !!a.id;
    const perms = a.permissions || ['booking'];
    return `
      <input type="hidden" name="id" value="${a.id || ''}">
      <div class="form-row">
        <div class="field"><label>帳號</label><input type="text" name="username" value="${UI.esc(a.username || '')}" ${isEdit ? 'readonly' : ''} required></div>
        <div class="field"><label>姓名</label><input type="text" name="name" value="${UI.esc(a.name || '')}" required></div>
      </div>
      <div class="form-row">
        <div class="field"><label>密碼${isEdit ? '（留空表示不變更）' : ''}</label><input type="password" name="password" autocomplete="new-password" ${isEdit ? '' : 'required'}></div>
        <div class="field"><label>角色</label>
          <select name="role">
            <option value="teacher" ${a.role !== 'admin' ? 'selected' : ''}>教師</option>
            <option value="admin" ${a.role === 'admin' ? 'selected' : ''}>管理者</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>功能權限</label>
        <div class="check-group">
          ${PERMS.map(p => `<label class="check"><input type="checkbox" name="permissions" value="${p.key}" ${perms.includes(p.key) ? 'checked' : ''}> ${p.text}</label>`).join('')}
        </div>
      </div>
      <label class="check" style="margin-bottom:10px"><input type="checkbox" name="active" ${a.active !== false ? 'checked' : ''}> 啟用此帳號</label>`;
  }

  function openForm(acc) {
    const m = UI.openModal({
      title: acc ? '修改帳號' : '新增帳號',
      submitText: '儲存',
      content: formHtml(acc),
      onSubmit: async form => {
        const fd = new FormData(form);
        await Api.saveAccount({
          id: fd.get('id') ? Number(fd.get('id')) : null,
          username: (fd.get('username') || '').trim(),
          name: fd.get('name'),
          password: fd.get('password'),
          role: fd.get('role'),
          permissions: fd.getAll('permissions'),
          active: form.elements.active.checked
        });
        UI.toast(acc ? '帳號已更新' : '帳號已新增', 'success');
        load();
      }
    });
    // 選「管理者」時自動勾選全部權限（之後仍可手動調整）
    m.form.elements.role.addEventListener('change', e => {
      if (e.target.value === 'admin') m.form.querySelectorAll('[name=permissions]').forEach(c => { c.checked = true; });
    });
  }

  list.addEventListener('click', async e => {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (edit) openForm(all.find(a => a.id === Number(edit.dataset.edit)));
    if (del) {
      const a = all.find(x => x.id === Number(del.dataset.del));
      if (!await UI.confirm(`確定要刪除帳號「${UI.esc(a.username)}」嗎？該帳號建立的預約也會一併刪除。`)) return;
      try {
        await Api.deleteAccount(a.id);
        await UI.removeRow(del.closest('tr'));
        UI.toast('帳號已刪除', 'success');
        load();
      } catch (ex) { UI.toast(ex.message, 'error'); }
    }
  });

  $('newBtn').onclick = () => openForm(null);
  $('searchBox').oninput = render;
  load();
})();
