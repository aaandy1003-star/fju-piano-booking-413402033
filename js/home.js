(async () => {
  const $ = id => document.getElementById(id);
  const user = Auth.current();
  const canBook = Auth.can('booking');
  const PAGE = 6;

  // 取出樓層裡的數字（例如「3 樓」→ 3），由小到大排序
  const floorNum = f => parseInt(String(f).replace(/[^\d]/g, ''), 10) || 0;
  const byFloor = (a, b) => floorNum(a) - floorNum(b);
  const sortedFloors = arr => [...new Set(arr)].sort(byFloor);

  const TONES = [['#4aa3e8', '#7b6fe0'], ['#2fc4b2', '#3f8fd8'], ['#f59e6b', '#e8648a'], ['#8a7be0', '#4aa3e8']];
  const ICONS = { '鋼琴琴房': '🎹', '電鋼琴琴房': '🎹', '團體練習室': '🎼' };
  const THEME = { '鋼琴琴房': 't-piano', '電鋼琴琴房': 't-staff', '團體練習室': 't-wave' };
  const NOTES = ['♪', '♫', '♩', '♬'];

  const state = {
    rooms: [], slots: [], status: [], roomId: null,
    weekStart: Utils.startOfWeek(new Date()), bookings: [], seq: 0,
    type: '', floor: '', statFloor: '', page: 0
  };
  let jumpFp = null;   // 日期選擇器實例（初始化前為 null）

  /* ---------- 捲動顯示 ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---------- Banner：背景飄動的音符 ---------- */
  $('sparks').innerHTML = Array.from({ length: 16 }, (_, i) => `
    <span class="note" style="left:${(i * 6 + 4) % 94}%;font-size:${18 + (i % 4) * 8}px;animation-duration:${10 + (i % 5) * 2}s;animation-delay:${-i * 1.1}s">
      <em style="animation-duration:${3 + (i % 3)}s">${NOTES[i % 4]}</em>
    </span>`).join('');

  /* ---------- Banner：立體鋼琴（8 個白鍵依序按下並冒出音符） ---------- */
  const PRESS = [0, 1.2, 0.6, 2.4, 1.8, 3.6, 3.0, 4.2];
  const BLACK_AFTER = [0, 1, 3, 4, 5];
  $('pianoKeys').innerHTML =
    PRESS.map((t, i) => `<span class="wk" style="--t:${t}s"><em class="nt">${NOTES[i % 4]}</em></span>`).join('') +
    BLACK_AFTER.map(i => `<span class="bk" style="left:${(i + 1) * 12.5}%"></span>`).join('');

  if (user) {
    $('heroLogin').textContent = `Hi, ${user.name}`;
    $('heroLogin').href = canBook ? 'booking.html' : 'index.html';
    $('quickMine').href = 'booking.html';
  }

  /* ---------- 載入資料 ---------- */
  $('statBody').innerHTML = `<tr><td colspan="3">${UI.skeleton(3)}</td></tr>`;
  $('scheduleGrid').innerHTML = '<div class="skeleton" style="height:380px"></div>';

  try {
    [state.rooms, state.slots, state.status] = await Promise.all([Api.getRooms(), Api.getSlots(), Api.getStatus()]);
  } catch (e) { UI.toast(e.message, 'error'); return; }
  state.roomId = state.rooms[0] && state.rooms[0].id;

  /* ---------- 日期選擇器（flatpickr，換月標題會即時更新） ---------- */
  jumpFp = flatpickr('#jumpDate', {
    locale: Object.assign({}, flatpickr.l10ns.zh_tw, { firstDayOfWeek: 1 }),  // 週一為一週開頭
    dateFormat: 'Y-m-d',
    defaultDate: state.weekStart,
    disableMobile: true,
    onChange: dates => {
      if (!dates.length) return;
      state.weekStart = Utils.startOfWeek(dates[0]);
      loadWeek();
    }
  });

  loadNews();
  initStatFloor();
  renderStatus();
  renderFilters();
  renderCards();
  $('roomSelect').innerHTML = state.rooms.map(r => `<option value="${r.id}">${UI.esc(r.name)}</option>`).join('');
  loadWeek();

  /* ====================== 公告（表格 + 跑馬燈） ====================== */
  async function loadNews() {
    try {
      const list = await Api.getAnnouncements();
      const limit = Utils.fmtDate(Utils.addDays(new Date(), -7));

      const openNews = n => UI.openModal({
        title: n.title, cancelText: '關閉', hideSubmit: true,
        content: `<p style="color:#888;margin-bottom:10px">${n.date}</p><p style="white-space:pre-wrap;margin-bottom:10px">${UI.esc(n.content || '（無內容）')}</p>`
      });

      /* 公告表格 */
      $('newsBody').innerHTML = list.length
        ? list.map(n => `
          <tr data-id="${n.id}">
            <td>${n.date >= limit ? '<span class="new-tag">NEW</span>' : ''}${UI.esc(n.title)}</td>
            <td class="date">${n.date.replaceAll('-', '.')}</td>
          </tr>`).join('')
        : '<tr><td colspan="2" style="text-align:center;color:#999">目前沒有公告</td></tr>';
      $('newsBody').onclick = e => {
        const tr = e.target.closest('tr[data-id]');
        if (!tr) return;
        openNews(list.find(x => x.id === Number(tr.dataset.id)));
      };

      /* 跑馬燈：內容複製兩份，捲到一半時無縫接回開頭 */
      const box = $('marquee');
      if (!list.length) { box.hidden = true; return; }
      box.hidden = false;
      const items = list.map(n =>
        `<a href="#" class="mq-item" data-id="${n.id}">♪ ${UI.esc(n.title)}<time>${n.date.replaceAll('-', '.')}</time></a>`).join('');
      $('mqTrack').innerHTML = `<div class="mq-set">${items}</div><div class="mq-set" aria-hidden="true">${items}</div>`;
      $('mqTrack').style.setProperty('--dur', Math.max(24, list.length * 10) + 's');
      $('mqTrack').onclick = e => {
        const a = e.target.closest('.mq-item');
        if (!a) return;
        e.preventDefault();
        openNews(list.find(x => x.id === Number(a.dataset.id)));
      };
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  /* ====================== 今日狀態表 ====================== */
  function initStatFloor() {
    const floors = sortedFloors(state.status.map(s => s.floor));
    $('statFloor').innerHTML = '<option value="">全部樓層</option>' + floors.map(f => `<option>${UI.esc(f)}</option>`).join('');
    $('statFloor').onchange = e => { state.statFloor = e.target.value; state.page = 0; renderStatus(); };
    $('pgPrev').onclick = () => { state.page--; renderStatus(); };
    $('pgNext').onclick = () => { state.page++; renderStatus(); };
  }

  function countUp(el) {
    const to = Number(el.dataset.n);
    if (!to) { el.textContent = 0; return; }
    const t0 = performance.now();
    const tick = t => {
      const p = Math.min((t - t0) / 700, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function renderStatus() {
    const rows = state.status
      .filter(s => !state.statFloor || s.floor === state.statFloor)
      .sort((a, b) => byFloor(a.floor, b.floor) || a.name.localeCompare(b.name, 'zh-Hant'));
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    state.page = Math.max(0, Math.min(state.page, pages - 1));
    const cur = rows.slice(state.page * PAGE, (state.page + 1) * PAGE);
    $('statBody').innerHTML = cur.map((s, i) => `
      <tr style="--i:${i}">
        <td>${UI.esc(s.floor)} ${UI.esc(s.name)}</td>
        <td class="num open"><span data-n="${s.total}">0</span></td>
        <td class="num left ${s.free === 0 ? 'zero' : ''}"><span data-n="${s.free}">0</span></td>
      </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:#999">沒有符合的琴房</td></tr>';
    $('statBody').querySelectorAll('[data-n]').forEach(countUp);
    $('pageInfo').textContent = `${state.page + 1} / ${pages}`;
    $('pgPrev').disabled = state.page === 0;
    $('pgNext').disabled = state.page >= pages - 1;
  }

  /* ====================== 琴房卡片牆 ====================== */
  function renderFilters() {
    const types = [...new Set(state.rooms.map(r => r.type))];
    const floors = sortedFloors(state.rooms.map(r => r.floor));
    const chip = (kind, val, text) =>
      `<button class="chip-f ${state[kind] === val ? 'on' : ''}" data-kind="${kind}" data-val="${UI.esc(val)}">${UI.esc(text)}</button>`;
    $('filters').innerHTML = `
      <div class="filter-group"><span>依類型</span>${chip('type', '', '全部')}${types.map(t => chip('type', t, t)).join('')}</div>
      <div class="filter-group"><span>依樓層</span>${chip('floor', '', '全部')}${floors.map(f => chip('floor', f, f)).join('')}</div>`;
  }
  $('filters').addEventListener('click', e => {
    const b = e.target.closest('.chip-f');
    if (!b) return;
    state[b.dataset.kind] = b.dataset.val;
    renderFilters();
    renderCards();
  });

  function renderCards() {
    const list = state.rooms
      .filter(r => (!state.type || r.type === state.type) && (!state.floor || r.floor === state.floor))
      .sort((a, b) => byFloor(a.floor, b.floor) || a.name.localeCompare(b.name, 'zh-Hant'));
    if (!list.length) { $('roomGrid').innerHTML = '<div class="empty" style="grid-column:1/-1"><b>🔍</b>沒有符合條件的琴房</div>'; return; }
    $('roomGrid').innerHTML = list.map((r, i) => {
      const st = state.status.find(s => s.roomId === r.id) || { total: 0, free: 0 };
      const [c1, c2] = TONES[r.id % TONES.length];
      return `
      <article class="room-card ${r.id === state.roomId ? 'sel' : ''}" style="--i:${i};--c1:${c1};--c2:${c2}">
        <div class="room-cover ${THEME[r.type] || 't-piano'}"><span>${ICONS[r.type] || '🎹'}</span></div>
        <div class="room-body">
          <h3 class="room-name">${UI.esc(r.floor)} ${UI.esc(r.name)}</h3>
          <div class="room-meta">${UI.esc(r.type)}・可容納 ${r.capacity} 人<br>設備：${UI.esc(r.equipment)}</div>
          <div class="avail ${st.free === 0 ? 'zero' : ''}">今日可預約<b>${st.free}</b>/ ${st.total}</div>
          <div class="room-actions">
            ${canBook ? `<button class="pill go" data-act="book" data-id="${r.id}">立即預約</button>` : ''}
            <button class="pill view" data-act="view" data-id="${r.id}">查看時段</button>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  $('roomGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    if (b.dataset.act === 'view') selectRoom(id, true);
    else BookingForm.open({ roomId: id, rooms: state.rooms, slots: state.slots, onDone: refreshAll });
  });

  function selectRoom(id, scroll) {
    state.roomId = id;
    $('roomSelect').value = id;
    renderCards();
    loadWeek();
    if (scroll) $('schedule').scrollIntoView({ behavior: 'smooth' });
  }

  async function refreshAll() {
    try { state.status = await Api.getStatus(); } catch (e) { UI.toast(e.message, 'error'); }
    renderStatus();
    renderCards();
    loadWeek();
  }

  /* ====================== 週一覽表 ====================== */
  const grid = $('scheduleGrid');

  async function loadWeek(dir) {
    const seq = ++state.seq;
    renderLabel();
    renderRoomInfo();
    try {
      const data = await Api.getWeek(state.roomId, Utils.fmtDate(state.weekStart));
      if (seq !== state.seq) return;
      state.bookings = data;
      renderGrid(dir);
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  function renderLabel() {
    const end = Utils.addDays(state.weekStart, 6);
    const isCur = Utils.fmtDate(state.weekStart) === Utils.fmtDate(Utils.startOfWeek(new Date()));
    const f = d => Utils.fmtDate(d).replaceAll('-', '/');
    $('weekLabel').innerHTML = `${f(state.weekStart)} – ${f(end)}${isCur ? '<span class="badge badge-now">本週</span>' : ''}`;
    if (jumpFp) jumpFp.setDate(state.weekStart, false);
    else $('jumpDate').value = Utils.fmtDate(state.weekStart);
  }

  function renderRoomInfo() {
    const r = state.rooms.find(x => x.id === state.roomId);
    $('roomInfo').innerHTML = r
      ? `<strong>${UI.esc(r.name)}</strong>・${UI.esc(r.floor)}・可容納 ${r.capacity} 人・設備：${UI.esc(r.equipment)}`
      : '';
  }

  function renderGrid(dir) {
    const u = Auth.current();
    const todayStr = Utils.fmtDate(new Date());
    const days = [...Array(7)].map((_, i) => Utils.addDays(state.weekStart, i));
    const map = {};
    state.bookings.forEach(b => { map[b.date + '|' + b.slotId] = b; });

    if (!state.slots.length) { grid.innerHTML = '<div class="empty"><b>🕘</b>目前尚未設定任何可預約時段</div>'; return; }

    let html = '<table class="sched"><thead><tr><th class="time">時段</th>';
    days.forEach((d, i) => {
      const isToday = Utils.fmtDate(d) === todayStr;
      html += `<th class="${isToday ? 'today' : ''}">週${Utils.DAY_NAMES[i]}<br><small>${d.getMonth() + 1}/${d.getDate()}</small></th>`;
    });
    html += '</tr></thead><tbody>';

    state.slots.forEach((s, ri) => {
      html += `<tr><th class="time">${s.start}–${s.end}</th>`;
      days.forEach((d, i) => {
        const ds = Utils.fmtDate(d);
        const delay = `style="--d:${(ri * 7 + i) * 14}ms"`;
        if (!s.days.includes(i + 1)) { html += `<td ${delay}><div class="cell closed">不開放</div></td>`; return; }
        const b = map[ds + '|' + s.id];
        const past = Utils.isPast(ds, s.end);
        if (b) {
          const mine = u && b.userId === u.id;
          html += `<td ${delay}><button class="cell ${mine ? 'mine' : 'booked'} ${past ? 'is-past' : ''}" data-act="view" data-id="${b.id}">${UI.esc(b.userName)}<small>${UI.esc(b.purpose)}</small></button></td>`;
        } else if (past) {
          html += `<td ${delay}><div class="cell past">已過期</div></td>`;
        } else {
          html += `<td ${delay}><button class="cell free" data-act="book" data-date="${ds}" data-slot="${s.id}">可預約<small>點擊預約</small></button></td>`;
        }
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    grid.className = '';
    void grid.offsetWidth;
    grid.innerHTML = html;
    if (dir) grid.classList.add(dir === 'next' ? 'slide-next' : 'slide-prev');
  }

  function onBook(date, slotId) {
    if (!Auth.current()) {
      UI.toast('預約僅限教師與管理者，請先登入', 'info');
      setTimeout(() => { location.href = 'login.html?next=index.html'; }, 1100);
      return;
    }
    if (!Auth.can('booking')) { UI.toast('您的帳號沒有預約權限', 'error'); return; }
    BookingForm.open({ roomId: state.roomId, date, slotId, rooms: state.rooms, slots: state.slots, onDone: refreshAll });
  }

  function onView(id) {
    const b = state.bookings.find(x => x.id === id);
    if (!b) return;
    const u = Auth.current();
    const slot = state.slots.find(s => s.id === b.slotId);
    const room = state.rooms.find(r => r.id === b.roomId);
    const d = Utils.parseDate(b.date);
    const canDelete = !!u && Auth.can('booking') && (u.role === 'admin' || b.userId === u.id);

    UI.openModal({
      title: '預約資訊', cancelText: '關閉', submitText: '刪除預約', danger: true, hideSubmit: !canDelete,
      content: `
        <dl class="detail">
          <dt>琴房</dt><dd>${UI.esc(room ? room.name : '')}</dd>
          <dt>日期</dt><dd>${b.date}（週${Utils.DAY_NAMES[Utils.weekdayOf(d) - 1]}）</dd>
          <dt>時段</dt><dd>${slot ? slot.start + '–' + slot.end : ''}</dd>
          <dt>預約者</dt><dd>${UI.esc(b.userName)}</dd>
          <dt>用途</dt><dd>${UI.esc(b.purpose)}</dd>
          <dt>人數</dt><dd>${b.people} 人</dd>
          <dt>備註</dt><dd>${UI.esc(b.note) || '—'}</dd>
        </dl>`,
      onSubmit: async () => {
        await Api.deleteBooking(b.id);
        UI.toast('已刪除預約', 'success');
        refreshAll();
      }
    });
  }

  grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    if (btn.dataset.act === 'book') onBook(btn.dataset.date, Number(btn.dataset.slot));
    else onView(Number(btn.dataset.id));
  });

  $('roomSelect').onchange = e => selectRoom(Number(e.target.value), false);
  $('prevWeek').onclick = () => { state.weekStart = Utils.addDays(state.weekStart, -7); loadWeek('prev'); };
  $('nextWeek').onclick = () => { state.weekStart = Utils.addDays(state.weekStart, 7); loadWeek('next'); };
  $('todayBtn').onclick = () => { state.weekStart = Utils.startOfWeek(new Date()); loadWeek(); };
})();
