(async () => {
  if (!Auth.guard('booking')) return;

  const $ = id => document.getElementById(id);
  const list = $('bookingList');
  let rooms = [], slots = [], current = [];

  try {
    [rooms, slots] = await Promise.all([Api.getRooms(), Api.getSlots()]);
  } catch (e) { UI.toast(e.message, 'error'); return; }
  $('roomFilter').innerHTML += rooms.map(r => `<option value="${r.id}">${UI.esc(r.name)}</option>`).join('');

  async function load() {
    list.innerHTML = UI.skeleton(5);
    try {
      let data = await Api.listBookings($('showPast').checked);
      const rf = $('roomFilter').value;
      if (rf) data = data.filter(b => b.roomId === Number(rf));
      current = data;
      render(data);
    } catch (e) { list.innerHTML = ''; UI.toast(e.message, 'error'); }
  }

  function render(data) {
    if (!data.length) {
      list.innerHTML = '<div class="empty"><b>📭</b>目前沒有符合條件的預約</div>';
      return;
    }
    const me = Auth.current();
    const isAdmin = me.role === 'admin';
    list.innerHTML = `
      <table class="table">
        <thead><tr><th>日期</th><th>時段</th><th>琴房</th>${isAdmin ? '<th>預約者</th>' : ''}<th>用途</th><th>人數</th><th>操作</th></tr></thead>
        <tbody>
          ${data.map((b, i) => {
            const canEdit = (isAdmin || b.userId === me.id) && !Utils.isPast(b.date, b.end === '--' ? '23:59' : b.end);
            return `
            <tr style="--i:${i}" data-id="${b.id}">
              <td>${b.date}（週${Utils.DAY_NAMES[Utils.weekdayOf(Utils.parseDate(b.date)) - 1]}）</td>
              <td>${b.start}–${b.end}</td>
              <td>${UI.esc(b.roomName)}</td>
              ${isAdmin ? `<td>${UI.esc(b.userName)}</td>` : ''}
              <td>${UI.esc(b.purpose)}${b.note ? `<br><small style="color:#888">${UI.esc(b.note)}</small>` : ''}</td>
              <td>${b.people}</td>
              <td class="actions">
                ${canEdit ? `<button class="btn btn-ghost btn-sm" data-edit="${b.id}">編輯</button> ` : ''}<button class="btn btn-ghost btn-sm" data-del="${b.id}">刪除</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  list.addEventListener('click', async e => {
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      const b = current.find(x => x.id === Number(editBtn.dataset.edit));
      if (b) BookingForm.open({ booking: b, rooms, slots, onDone: load });
      return;
    }

    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    if (!await UI.confirm('確定要刪除這筆預約嗎？刪除後該時段會重新開放給其他人預約。')) return;
    try {
      await Api.deleteBooking(Number(btn.dataset.del));
      await UI.removeRow(btn.closest('tr'));
      UI.toast('已刪除預約', 'success');
      load();
    } catch (ex) { UI.toast(ex.message, 'error'); }
  });

  $('newBtn').onclick = () => BookingForm.open({ rooms, slots, onDone: load });
  $('showPast').onchange = load;
  $('roomFilter').onchange = load;
  load();
})();
