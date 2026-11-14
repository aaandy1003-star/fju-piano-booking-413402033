(async () => {
  if (!Auth.guard('announcements')) return;

  const $ = id => document.getElementById(id);
  const list = $('newsList');
  let current = [];

  async function load() {
    list.innerHTML = UI.skeleton(4);
    try { render(await Api.getAnnouncements()); }
    catch (e) { list.innerHTML = ''; UI.toast(e.message, 'error'); }
  }

  function render(data) {
    current = data;
    if (!data.length) { list.innerHTML = '<div class="empty"><b>📢</b>尚無公告，請按「新增公告」</div>'; return; }
    list.innerHTML = `
      <table class="table">
        <thead><tr><th>日期</th><th>標題</th><th>操作</th></tr></thead>
        <tbody>
          ${data.map((n, i) => `
            <tr style="--i:${i}">
              <td>${n.date}</td>
              <td><strong>${UI.esc(n.title)}</strong></td>
              <td class="actions">
                <button class="btn btn-ghost btn-sm" data-edit="${n.id}">修改</button>
                <button class="btn btn-ghost btn-sm" data-del="${n.id}">刪除</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function openForm(n) {
    UI.openModal({
      title: n ? '修改公告' : '新增公告',
      submitText: '儲存',
      content: `
        <input type="hidden" name="id" value="${n ? n.id : ''}">
        <div class="field"><label>標題</label><input type="text" name="title" maxlength="60" value="${UI.esc(n ? n.title : '')}" required></div>
        <div class="field"><label>公告日期</label><input type="date" name="date" value="${n ? n.date : Utils.fmtDate(new Date())}" required></div>
        <div class="field"><label>內容</label><textarea name="content" maxlength="500">${UI.esc(n ? n.content : '')}</textarea></div>`,
      onSubmit: async form => {
        const fd = new FormData(form);
        await Api.saveAnnouncement({
          id: fd.get('id') ? Number(fd.get('id')) : null,
          title: fd.get('title'), date: fd.get('date'), content: fd.get('content')
        });
        UI.toast(n ? '公告已更新' : '公告已發布', 'success');
        load();
      }
    });
  }

  list.addEventListener('click', async e => {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (edit) openForm(current.find(n => n.id === Number(edit.dataset.edit)));
    if (del) {
      if (!await UI.confirm('確定要刪除這則公告嗎？')) return;
      try {
        await Api.deleteAnnouncement(Number(del.dataset.del));
        await UI.removeRow(del.closest('tr'));
        UI.toast('公告已刪除', 'success');
        load();
      } catch (ex) { UI.toast(ex.message, 'error'); }
    }
  });

  $('newBtn').onclick = () => openForm(null);
  load();
})();
