const UI = {
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  /* ---------- Toast ---------- */
  toast(msg, type = 'info') {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 300); }, 3200);
  },
  // 跨頁面提示（例如導向後再顯示）
  flash(msg, type = 'info') { sessionStorage.setItem('rr_flash', JSON.stringify({ msg, type })); },
  showFlash() {
    const raw = sessionStorage.getItem('rr_flash');
    if (!raw) return;
    sessionStorage.removeItem('rr_flash');
    const { msg, type } = JSON.parse(raw);
    setTimeout(() => this.toast(msg, type), 250);
  },

  /* ---------- Modal ---------- */
  openModal({ title, content, submitText = '確定', cancelText = '取消', danger = false, hideSubmit = false, onSubmit, onClose }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="${this.esc(title)}">
        <div class="modal-head"><h3>${this.esc(title)}</h3><button type="button" class="modal-x" aria-label="關閉">×</button></div>
        <form class="modal-body" novalidate>
          ${content}
          <div class="modal-error" hidden></div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" data-close>${cancelText}</button>
            ${hideSubmit ? '' : `<button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${submitText}</button>`}
          </div>
        </form>
      </div>`;
    document.body.appendChild(overlay);

    const box = overlay.querySelector('.modal');
    const form = overlay.querySelector('form');
    const err = overlay.querySelector('.modal-error');
    let closed = false;

    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      overlay.classList.add('closing');
      setTimeout(() => { overlay.remove(); onClose && onClose(); }, 200);
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);

    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.modal-x').onclick = close;
    overlay.querySelector('[data-close]').onclick = close;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.hidden = true;
      const btn = form.querySelector('[type=submit]');
      if (btn) { btn.disabled = true; btn.classList.add('loading'); }
      try {
        if (onSubmit) await onSubmit(form);
        close();
      } catch (ex) {
        err.textContent = ex.message || '發生錯誤';
        err.hidden = false;
        box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
      } finally {
        if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
      }
    });

    const first = form.querySelector('input:not([readonly]):not([type=hidden]), select');
    if (first) setTimeout(() => first.focus(), 80);
    return { el: overlay, form, close };
  },

  confirm(message, { title = '請確認', submitText = '確定刪除', danger = true } = {}) {
    return new Promise(resolve => {
      let ok = false;
      this.openModal({
        title, danger, submitText,
        content: `<p style="margin-bottom:14px">${message}</p>`,
        onSubmit: () => { ok = true; },
        onClose: () => resolve(ok)
      });
    });
  },

  /* ---------- 其他 ---------- */
  skeleton(rows = 4) {
    return Array.from({ length: rows }, () => '<div class="skeleton skeleton-row"></div>').join('');
  },
  removeRow(tr) {
    return new Promise(r => { tr.classList.add('row-out'); setTimeout(r, 300); });
  }
};
