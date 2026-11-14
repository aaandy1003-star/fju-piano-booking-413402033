/**
 * 所有頁面都只透過 Api 取得資料。
 * 期中：USE_MOCK = true → 使用 localStorage 模擬後端。
 * 期末：USE_MOCK = false → 每個函式會 POST 到 php/<action>.php，
 *       PHP 回傳格式固定為 { ok: true, data: ... } 或 { ok: false, message: '...' }
 */
const Api = (() => {
  const VER = '4';   // 資料結構版本；改版時調高，會自動清除舊的假資料
  const K = n => CONFIG.STORAGE_PREFIX + n;
  const read = n => JSON.parse(localStorage.getItem(K(n)) || '[]');
  const write = (n, v) => localStorage.setItem(K(n), JSON.stringify(v));
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const nextId = arr => arr.reduce((m, x) => Math.max(m, x.id), 0) + 1;
  const safe = a => { const { password, ...rest } = a; return rest; };
  const timeOk = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

  function seed() {
    if (localStorage.getItem(K('ver')) === VER) return;
    Object.keys(localStorage).filter(k => k.startsWith(CONFIG.STORAGE_PREFIX)).forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem('rr_session');   // 舊登入資料權限可能不完整，重新登入即可

    const d = MOCK_DATA;
    write('rooms', d.rooms);
    write('slots', d.slots);
    write('accounts', d.accounts);
    write('announcements', d.announcements.map(a => ({
      id: a.id, title: a.title, content: a.content,
      date: Utils.fmtDate(Utils.addDays(new Date(), -a.daysAgo))
    })));

    const mon = Utils.startOfWeek(new Date());
    const f = n => Utils.fmtDate(Utils.addDays(mon, n));
    const today = Utils.fmtDate(new Date());
    // 琴房容量：A、B、C、E、F 為 2 人，D（團體練習室）為 6 人
    write('bookings', [
      { id: 1, roomId: 1, date: f(0), slotId: 2, userId: 2, purpose: '鋼琴個人練習', people: 1, note: '' },
      { id: 2, roomId: 1, date: f(2), slotId: 3, userId: 3, purpose: '四手聯彈練習', people: 2, note: '' },
      { id: 3, roomId: 1, date: f(4), slotId: 2, userId: 2, purpose: '期中考曲目練習', people: 1, note: '' },
      { id: 4, roomId: 2, date: f(1), slotId: 1, userId: 2, purpose: '學生個別指導', people: 2, note: '' },
      { id: 5, roomId: 3, date: f(3), slotId: 4, userId: 3, purpose: '電鋼琴錄音練習', people: 1, note: '需要使用耳機' },
      { id: 6, roomId: 1, date: f(7), slotId: 1, userId: 3, purpose: '下週曲目試彈', people: 2, note: '' },
      { id: 7, roomId: 2, date: today, slotId: 5, userId: 3, purpose: '晚間練習', people: 1, note: '' },
      { id: 8, roomId: 4, date: today, slotId: 5, userId: 2, purpose: '小組合奏排練', people: 4, note: '' },
      { id: 9, roomId: 5, date: f(1), slotId: 3, userId: 2, purpose: '鋼琴課輔導', people: 2, note: '' },
      { id: 10, roomId: 6, date: f(2), slotId: 1, userId: 3, purpose: '電鋼琴作曲練習', people: 1, note: '' }
    ]);
    localStorage.setItem(K('ver'), VER);
  }
  seed();

  async function call(action, payload, mock) {
    if (CONFIG.USE_MOCK) {
      await delay(CONFIG.MOCK_DELAY);
      return mock(payload || {});
    }
    const res = await fetch(CONFIG.API_BASE + action + '.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload || {})
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || '發生錯誤');
    return json.data;
  }

  const needLogin = () => { const u = Auth.current(); if (!u) throw new Error('請先登入'); return u; };
  const need = perm => { const u = needLogin(); if (!Auth.can(perm)) throw new Error('您沒有此功能的權限'); return u; };

  return {
    reset() { Object.keys(localStorage).filter(k => k.startsWith(CONFIG.STORAGE_PREFIX)).forEach(k => localStorage.removeItem(k)); location.reload(); },

    /* ---------- 登入 ---------- */
    login: (username, password) => call('login', { username, password }, ({ username, password }) => {
      const a = read('accounts').find(x => x.username === username.trim());
      if (!a || a.password !== password || !a.active) throw new Error('登入失敗');
      return safe(a);
    }),

    /* ---------- 琴房、時段、今日狀態（公開） ---------- */
    getRooms: () => call('get_rooms', {}, () => read('rooms')),
    getSlots: () => call('get_slots', {}, () => read('slots').sort((a, b) => a.start.localeCompare(b.start))),

    // 每間琴房「今日開放時段數」與「剩餘可預約數」（已過去或已被借用的不算剩餘）
    getStatus: () => call('get_status', {}, () => {
      const today = Utils.fmtDate(new Date());
      const wd = Utils.weekdayOf(new Date());
      const slots = read('slots').filter(s => s.days.includes(wd));
      const todays = read('bookings').filter(b => b.date === today);
      return read('rooms').map(r => ({
        roomId: r.id, name: r.name, type: r.type, floor: r.floor, capacity: r.capacity, equipment: r.equipment,
        total: slots.length,
        free: slots.filter(s => !Utils.isPast(today, s.end) && !todays.some(b => b.roomId === r.id && b.slotId === s.id)).length
      }));
    }),

    /* ---------- 公告 ---------- */
    getAnnouncements: () => call('get_announcements', {}, () =>
      read('announcements').sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)),

    saveAnnouncement: n => call('save_announcement', n, n => {
      need('announcements');
      if (!n.title || !n.title.trim()) throw new Error('請填寫公告標題');
      if (!n.date) throw new Error('請選擇公告日期');
      const list = read('announcements');
      const rec = { title: n.title.trim(), date: n.date, content: (n.content || '').trim() };
      if (n.id) {
        const i = list.findIndex(x => x.id === Number(n.id));
        if (i < 0) throw new Error('找不到這則公告');
        list[i] = { id: list[i].id, ...rec };
      } else {
        list.push({ id: nextId(list), ...rec });
      }
      write('announcements', list);
      return true;
    }),

    deleteAnnouncement: id => call('delete_announcement', { id }, ({ id }) => {
      need('announcements');
      write('announcements', read('announcements').filter(x => x.id !== Number(id)));
      return true;
    }),

    /* ---------- 預約 ---------- */
    getWeek: (roomId, weekStart) => call('get_week', { roomId, weekStart }, ({ roomId, weekStart }) => {
      const start = Utils.parseDate(weekStart);
      const dates = [...Array(7)].map((_, i) => Utils.fmtDate(Utils.addDays(start, i)));
      const acc = read('accounts');
      return read('bookings')
        .filter(b => b.roomId === Number(roomId) && dates.includes(b.date))
        .map(b => ({ ...b, userName: (acc.find(a => a.id === b.userId) || {}).name || '未知' }));
    }),

    listBookings: includePast => call('list_bookings', { includePast }, ({ includePast }) => {
      const u = need('booking');
      const rooms = read('rooms'), slots = read('slots'), acc = read('accounts');
      return read('bookings')
        .filter(b => u.role === 'admin' || b.userId === u.id)
        .map(b => {
          const s = slots.find(x => x.id === b.slotId) || { start: '--', end: '--' };
          return {
            ...b,
            roomName: (rooms.find(r => r.id === b.roomId) || {}).name || '已刪除',
            userName: (acc.find(a => a.id === b.userId) || {}).name || '未知',
            start: s.start, end: s.end
          };
        })
        .filter(b => includePast || !Utils.isPast(b.date, b.end === '--' ? '23:59' : b.end))
        .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    }),

    createBooking: data => call('create_booking', data, d => {
      const u = need('booking');
      const roomId = Number(d.roomId), slotId = Number(d.slotId), people = Number(d.people);
      const room = read('rooms').find(r => r.id === roomId);
      const slot = read('slots').find(s => s.id === slotId);
      if (!room) throw new Error('請選擇琴房');
      if (!d.date) throw new Error('請選擇日期');
      if (!slot) throw new Error('請選擇時段');
      if (!slot.days.includes(Utils.weekdayOf(Utils.parseDate(d.date)))) throw new Error('該時段在這天不開放預約');
      if (Utils.isPast(d.date, slot.end)) throw new Error('不能預約已過去的時段');
      if (!d.purpose || !d.purpose.trim()) throw new Error('請填寫使用用途');
      if (!people || people < 1) throw new Error('使用人數至少為 1 人');
      if (people > room.capacity) throw new Error(`此琴房最多容納 ${room.capacity} 人`);
      const bookings = read('bookings');
      if (bookings.some(b => b.roomId === roomId && b.date === d.date && b.slotId === slotId)) {
        throw new Error('這個時段已經被預約了，請選擇其他時段');
      }
      const nb = { id: nextId(bookings), roomId, date: d.date, slotId, userId: u.id, purpose: d.purpose.trim(), people, note: (d.note || '').trim() };
      bookings.push(nb);
      write('bookings', bookings);
      return nb;
    }),

    // 編輯預約：管理者可改全部，教師只能改自己的；衝突檢查會排除這筆預約本身
    updateBooking: data => call('update_booking', data, d => {
      const u = need('booking');
      const id = Number(d.id);
      const roomId = Number(d.roomId), slotId = Number(d.slotId), people = Number(d.people);
      const bookings = read('bookings');
      const i = bookings.findIndex(x => x.id === id);
      if (i < 0) throw new Error('找不到這筆預約');
      if (u.role !== 'admin' && bookings[i].userId !== u.id) throw new Error('只能編輯自己的預約');

      const room = read('rooms').find(r => r.id === roomId);
      const slot = read('slots').find(s => s.id === slotId);
      if (!room) throw new Error('請選擇琴房');
      if (!d.date) throw new Error('請選擇日期');
      if (!slot) throw new Error('請選擇時段');
      if (!slot.days.includes(Utils.weekdayOf(Utils.parseDate(d.date)))) throw new Error('該時段在這天不開放預約');
      if (Utils.isPast(d.date, slot.end)) throw new Error('不能預約已過去的時段');
      if (!d.purpose || !d.purpose.trim()) throw new Error('請填寫使用用途');
      if (!people || people < 1) throw new Error('使用人數至少為 1 人');
      if (people > room.capacity) throw new Error(`此琴房最多容納 ${room.capacity} 人`);
      if (bookings.some(b => b.id !== id && b.roomId === roomId && b.date === d.date && b.slotId === slotId)) {
        throw new Error('這個時段已經被預約了，請選擇其他時段');
      }

      // 預約者（userId）維持原本的，管理者編輯時不會變成自己
      bookings[i] = { ...bookings[i], roomId, date: d.date, slotId, purpose: d.purpose.trim(), people, note: (d.note || '').trim() };
      write('bookings', bookings);
      return bookings[i];
    }),

    deleteBooking: id => call('delete_booking', { id }, ({ id }) => {
      const u = need('booking');
      const bookings = read('bookings');
      const b = bookings.find(x => x.id === Number(id));
      if (!b) throw new Error('找不到這筆預約');
      if (u.role !== 'admin' && b.userId !== u.id) throw new Error('只能刪除自己的預約');
      write('bookings', bookings.filter(x => x.id !== b.id));
      return true;
    }),

    /* ---------- 時段管理 ---------- */
    saveSlot: s => call('save_slot', s, s => {
      need('slots');
      if (!timeOk(s.start) || !timeOk(s.end)) throw new Error('請輸入正確的開始與結束時間');
      if (s.end <= s.start) throw new Error('結束時間必須晚於開始時間');
      if (!s.days || !s.days.length) throw new Error('請至少選擇一個開放的星期');
      const slots = read('slots');
      const clash = slots.find(o => o.id !== Number(s.id) && o.days.some(d => s.days.includes(d)) && s.start < o.end && o.start < s.end);
      if (clash) throw new Error(`與既有時段 ${clash.start}–${clash.end} 重疊`);
      if (s.id) {
        const i = slots.findIndex(x => x.id === Number(s.id));
        if (i < 0) throw new Error('找不到這個時段');
        slots[i] = { id: slots[i].id, start: s.start, end: s.end, days: s.days };
      } else {
        slots.push({ id: nextId(slots), start: s.start, end: s.end, days: s.days });
      }
      write('slots', slots);
      return true;
    }),

    deleteSlot: id => call('delete_slot', { id }, ({ id }) => {
      need('slots');
      write('slots', read('slots').filter(s => s.id !== Number(id)));
      write('bookings', read('bookings').filter(b => b.slotId !== Number(id)));
      return true;
    }),

    /* ---------- 帳號管理 ---------- */
    listAccounts: () => call('list_accounts', {}, () => { need('accounts'); return read('accounts').map(safe); }),

    saveAccount: a => call('save_account', a, a => {
      const me = need('accounts');
      const list = read('accounts');
      if (!a.name || !a.name.trim()) throw new Error('請填寫姓名');
      if (!a.permissions) a.permissions = [];
      if (a.id) {
        const i = list.findIndex(x => x.id === Number(a.id));
        if (i < 0) throw new Error('找不到這個帳號');
        if (a.password && a.password.length < 6) throw new Error('密碼至少 6 個字元');
        if (list[i].id === me.id && !a.permissions.includes('accounts')) throw new Error('不能移除自己的帳號管理權限');
        if (list[i].id === me.id && !a.active) throw new Error('不能停用自己的帳號');
        list[i] = { ...list[i], name: a.name.trim(), role: a.role, permissions: a.permissions, active: a.active, password: a.password || list[i].password };
      } else {
        if (!/^[A-Za-z0-9_]{3,20}$/.test(a.username || '')) throw new Error('帳號需為 3–20 碼英數字或底線');
        if (list.some(x => x.username === a.username)) throw new Error('這個帳號已被使用');
        if (!a.password || a.password.length < 6) throw new Error('密碼至少 6 個字元');
        list.push({ id: nextId(list), username: a.username, password: a.password, name: a.name.trim(), role: a.role, permissions: a.permissions, active: a.active });
      }
      write('accounts', list);
      return true;
    }),

    deleteAccount: id => call('delete_account', { id }, ({ id }) => {
      const me = need('accounts');
      if (me.id === Number(id)) throw new Error('不能刪除自己目前登入的帳號');
      write('accounts', read('accounts').filter(a => a.id !== Number(id)));
      write('bookings', read('bookings').filter(b => b.userId !== Number(id)));
      return true;
    }),

    /* ---------- 個人資料（登入者只能操作自己） ---------- */
    getProfile: () => call('get_profile', {}, () => {
      const me = needLogin();
      const a = read('accounts').find(x => x.id === me.id);
      if (!a) throw new Error('找不到您的帳號');
      return safe(a);
    }),

    // 一律以登入者本人的 id 為準，不接受前端傳入的 id、role、permissions、active
    updateProfile: d => call('update_profile', d, d => {
      const me = needLogin();
      const list = read('accounts');
      const i = list.findIndex(x => x.id === me.id);
      if (i < 0) throw new Error('找不到您的帳號');

      const name = (d.name || '').trim();
      const email = (d.email || '').trim();
      const phone = (d.phone || '').trim();
      if (!name) throw new Error('請填寫姓名');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('電子信箱格式不正確');
      if (phone && !/^[0-9+\-#() ]{6,20}$/.test(phone)) throw new Error('聯絡電話格式不正確');

      let password = list[i].password;
      if (d.newPassword) {
        if (d.oldPassword !== list[i].password) throw new Error('舊密碼不正確');
        if (d.newPassword.length < 6) throw new Error('新密碼至少 6 個字元');
        password = d.newPassword;
      }

      list[i] = { ...list[i], name, email, phone, password };
      write('accounts', list);
      return safe(list[i]);
    })
  };
})();
