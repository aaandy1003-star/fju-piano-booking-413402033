window.MOCK_DATA = {
  rooms: [
    { id: 1, name: '琴房 A',  type: '鋼琴琴房',   floor: '3 樓', capacity: 2, equipment: '直立式鋼琴、譜架' },
    { id: 2, name: '琴房 B',  type: '鋼琴琴房',   floor: '3 樓', capacity: 2, equipment: '直立式鋼琴、琴椅、譜架' },
    { id: 3, name: '琴房 C',  type: '電鋼琴琴房', floor: '5 樓', capacity: 2, equipment: '電鋼琴、耳機、譜架' },
    { id: 4, name: '琴房 D',  type: '團體練習室', floor: '5 樓', capacity: 6, equipment: '三角鋼琴、譜架、音響' },
    { id: 5, name: '琴房 E',  type: '鋼琴琴房',   floor: '2 樓', capacity: 2, equipment: '直立式鋼琴、譜架' },
    { id: 6, name: '琴房 F',  type: '電鋼琴琴房', floor: '2 樓', capacity: 2, equipment: '電鋼琴、耳機、譜架' }
  ],
  slots: [
    { id: 1, start: '08:10', end: '10:00', days: [1, 2, 3, 4, 5] },
    { id: 2, start: '10:10', end: '12:00', days: [1, 2, 3, 4, 5] },
    { id: 3, start: '13:10', end: '15:00', days: [1, 2, 3, 4, 5] },
    { id: 4, start: '15:10', end: '17:00', days: [1, 2, 3, 4, 5] },
    { id: 5, start: '18:00', end: '20:00', days: [1, 2, 3, 4, 5] },
    { id: 6, start: '09:00', end: '12:00', days: [6] }
  ],
  accounts: [
    { id: 1, username: 'admin',   password: 'admin123',   name: '系統管理者', role: 'admin',   permissions: ['booking', 'slots', 'accounts', 'announcements'], active: true },
    { id: 2, username: 'teacher', password: 'teacher123', name: '林老師',     role: 'teacher', permissions: ['booking'], active: true },
    { id: 3, username: 'wang',    password: 'wang123',    name: '王老師',     role: 'teacher', permissions: ['booking'], active: true }
  ],
  // daysAgo：幾天前發布
  announcements: [
    { id: 1, daysAgo: 1,  title: '【維護公告】5 樓琴房下週二上午進行鋼琴調音', content: '調音期間 5 樓琴房 C、D 暫停借用，造成不便敬請見諒。' },
    { id: 2, daysAgo: 3,  title: '本週五下午 3 樓琴房更換琴椅與譜架', content: '更換期間琴房 A、B 的下午時段暫不開放。' },
    { id: 3, daysAgo: 20, title: '【操作說明】教師登入後即可線上預約琴房', content: '1. 點選首頁「登入」。\n2. 在一覽表點選綠色「可預約」格子。\n3. 填寫用途與人數後送出。' },
    { id: 4, daysAgo: 45, title: '學期使用規範更新，請教師與同學留意', content: '詳細內容請參閱「使用規範」頁面。' }
  ]
};
