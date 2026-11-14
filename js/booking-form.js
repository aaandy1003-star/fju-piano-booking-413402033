const BookingForm = {
  async open({ booking, roomId, date, slotId, rooms, slots, onDone } = {}) {
    try {
      rooms = rooms || await Api.getRooms();
      slots = slots || await Api.getSlots();
    } catch (e) { UI.toast(e.message, 'error'); return; }

    const editing = !!booking;
    if (editing) {
      roomId = booking.roomId;
      date = booking.date;
      slotId = booking.slotId;
    }

    const today = Utils.fmtDate(new Date());
    date = date || today;
    roomId = roomId || rooms[0].id;

    const v = {
      people: editing ? booking.people : 1,
      purpose: editing ? booking.purpose : '',
      note: editing ? (booking.note || '') : ''
    };

    const roomOpts = rooms.map(r =>
      `<option value="${r.id}" ${r.id === roomId ? 'selected' : ''}>${UI.esc(r.name)}（${UI.esc(r.floor)}・${r.capacity} 人）</option>`).join('');

    const m = UI.openModal({
      title: editing ? '編輯琴房預約' : '新增琴房預約',
      submitText: editing ? '儲存變更' : '送出預約',
      content: `
        <div class="field"><label>琴房</label><select name="roomId">${roomOpts}</select></div>
        <div class="form-row">
          <div class="field"><label>日期</label><input type="text" name="date" value="${date}" autocomplete="off" required></div>
          <div class="field"><label>時段</label><select name="slotId"></select></div>
        </div>
        <div class="form-row">
          <div class="field"><label>使用人數</label><input type="number" name="people" min="1" value="${v.people}" required></div>
          <div class="field"><label>使用用途</label><input type="text" name="purpose" maxlength="30" value="${UI.esc(v.purpose)}" placeholder="例：鋼琴個人練習" required></div>
        </div>
        <div class="field"><label>備註（選填）</label><textarea name="note" maxlength="100" placeholder="例：需要使用耳機">${UI.esc(v.note)}</textarea></div>`,
      onSubmit: async form => {
        const data = Object.fromEntries(new FormData(form));
        if (editing) {
          await Api.updateBooking({ ...data, id: booking.id });
          UI.toast('預約已更新', 'success');
        } else {
          await Api.createBooking(data);
          UI.toast('預約成功 🎉', 'success');
        }
        onDone && onDone();
      }
    });

    const f = m.form;

    // 人數上限依所選琴房的容量自動調整
    const refreshCapacity = () => {
      const r = rooms.find(x => x.id === Number(f.elements.roomId.value));
      if (!r) return;
      f.elements.people.max = r.capacity;
      if (Number(f.elements.people.value) > r.capacity) f.elements.people.value = r.capacity;
    };
    f.elements.roomId.addEventListener('change', refreshCapacity);
    refreshCapacity();

    // 時段依所選日期的星期自動調整
    const refreshSlots = () => {
      const val = f.elements.date.value;
      const sel = f.elements.slotId;
      if (!val) { sel.innerHTML = '<option value="">請先選擇日期</option>'; return; }
      const wd = Utils.weekdayOf(Utils.parseDate(val));
      const opts = slots.filter(s => s.days.includes(wd));
      sel.innerHTML = opts.length
        ? opts.map(s => `<option value="${s.id}">${s.start}–${s.end}</option>`).join('')
        : '<option value="">這天沒有開放的時段</option>';
      if (slotId && opts.some(s => s.id === slotId)) sel.value = slotId;
    };
    refreshSlots();

    // 日期選擇器（flatpickr，換月標題會即時更新）
    flatpickr(f.elements.date, {
      locale: Object.assign({}, flatpickr.l10ns.zh_tw, { firstDayOfWeek: 1 }),
      dateFormat: 'Y-m-d',
      minDate: today,
      defaultDate: date,
      disableMobile: true,
      onChange: () => { slotId = null; refreshSlots(); }
    });
  }
};
