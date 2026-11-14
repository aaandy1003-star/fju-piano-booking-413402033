(async () => {
  if (!Auth.guard('slots')) return;

  const $ = id => document.getElementById(id);
  const list = $('slotList');

  async function load() {
    list.innerHTML = UI.skeleton(4);
    try { render(await Api.getSlots()); }
    catch (e) { list.innerHTML = ''; UI.toast(e.message, 'error'); }
  }

  let current = [];
  function render(slots) {
    current = slots;
    if (!slots.length) {
      list.innerHTML = '<div class="empty"><b>🕘</b>尚未建立任何時段，請按「新增時段」</div>';
      return;
    }
    list.innerHTML = `
      <table class="table">
        <thead><tr><th>時段</th><th>開放星期</th><th>操作</th></tr></thead>
        <tbody>
          ${slots.map((s, i) => `
            <tr style="--i:${i}">
              <td><strong>${s.start} – ${s.end}</strong></td>
              <td>${s.days.map(d => `<span class="chip">週${Utils.DAY_NAMES[d - 1]}</span>`).join('')}</td>
              <td class="actions">
                <button class="btn btn-ghost btn-sm" data-edit="${s.id}">修改</button>
                <button class="btn btn-ghost btn-sm" data-del="${s.id}">刪除</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function formHtml(s = {}) {
    const days = s.days || [1, 2, 3, 4, 5];
    return `
      <input type="hidden" name="id" value="${s.id || ''}">
      <div class="form-row">
        <div class="field"><label>開始時間</label><input type="time" name="start" value="${s.start || '08:10'}" required></div>
        <div class="field"><label>結束時間</label><input type="time" name="end" value="${s.end || '10:00'}" required></div>
      </div>
      <div class="field">
        <label>開放星期</label>
        <div class="check-group">
          ${Utils.DAY_NAMES.map((n, i) => `<label class="check"><input type="checkbox" name="days" value="${i + 1}" ${days.includes(i + 1) ? 'checked' : ''}> 週${n}</label>`).join('')}
        </div>
      </div>`;
  }

  function openForm(slot) {
    UI.openModal({
      title: slot ? '修改時段' : '新增時段',
      submitText: '儲存',
      content: formHtml(slot),
      onSubmit: async form => {
        const fd = new FormData(form);
        await Api.saveSlot({
          id: fd.get('id') ? Number(fd.get('id')) : null,
          start: fd.get('start'),
          end: fd.get('end'),
          days: fd.getAll('days').map(Number)
        });
        UI.toast(slot ? '時段已更新' : '時段已新增', 'success');
        load();
      }
    });
  }

  list.addEventListener('click', async e => {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (edit) openForm(current.find(s => s.id === Number(edit.dataset.edit)));
    if (del) {
      if (!await UI.confirm('刪除時段後，<b>該時段下所有已建立的預約也會一併刪除</b>。確定要刪除嗎？')) return;
      try {
        await Api.deleteSlot(Number(del.dataset.del));
        await UI.removeRow(del.closest('tr'));
        UI.toast('時段已刪除', 'success');
        load();
      } catch (ex) { UI.toast(ex.message, 'error'); }
    }
  });

  $('newBtn').onclick = () => openForm(null);
  load();
})();
