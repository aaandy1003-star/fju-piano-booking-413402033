const Utils = {
  DAY_NAMES: ['一', '二', '三', '四', '五', '六', '日'],
  pad: n => String(n).padStart(2, '0'),

  fmtDate(d) { return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`; },
  parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
  addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; },

  // 取得該日所在週的週一
  startOfWeek(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  },
  // 週一=1 … 週日=7
  weekdayOf(d) { return ((d.getDay() + 6) % 7) + 1; },

  // 該日期的該時段是否已結束
  isPast(dateStr, endTime) { return new Date(`${dateStr}T${endTime}:00`) < new Date(); }
};
