/* SJ Case Study — interactions: paging, scroll-reveal, rail, cover switch, persistence */
(function () {
  const deck = document.querySelector('.deck');
  const pages = Array.from(document.querySelectorAll('.page'));
  const railWrap = document.querySelector('.rail');
  const hint = document.querySelector('.scroll-hint');
  const LS = 'sj-casestudy';

  function prefersReduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ---- Progress rail ----
  pages.forEach((p, i) => {
    const b = document.createElement('button');
    b.dataset.label = p.dataset.label || ('0' + (i + 1));
    b.setAttribute('aria-label', 'Go to ' + b.dataset.label);
    b.addEventListener('click', () => goTo(i));
    railWrap.appendChild(b);
  });
  const dots = Array.from(railWrap.children);

  function goTo(i) {
    i = Math.max(0, Math.min(pages.length - 1, i));
    pages[i].scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
  }

  // ---- Scroll-driven reveal + active tracking (reliable; no rAF/IO dependency) ----
  let current = -1;
  function update() {
    const mid = deck.scrollTop + deck.clientHeight * 0.5;
    let idx = 0;
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].offsetTop <= mid + 4) idx = i;
    }
    // reveal current + everything above it
    for (let i = 0; i <= idx; i++) {
      const pg = pages[i];
      if (!pg.classList.contains('in')) {
        pg.classList.add('in');
        const reveals = pg.querySelectorAll('.reveal');
        // safety: guarantee visibility even if entrance transition is throttled
        setTimeout(() => reveals.forEach((r) => r.classList.add('shown')), 1300);
      }
    }
    if (idx !== current) {
      current = idx;
      dots.forEach((d, di) => d.classList.toggle('on', di === current));
      try { localStorage.setItem(LS + '-page', String(current)); } catch (e) {}
      if (hint) hint.style.opacity = current === 0 ? '1' : '0';
    }
  }
  deck.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  // Boot: run immediately so page 1 is never invisible on load or direct file open
  update();
  // Fallback: if scroll events don't fire (mobile free-scroll, file://, etc), force all pages in
  setTimeout(function() {
    pages.forEach(function(p) {
      if (!p.classList.contains('in')) {
        p.classList.add('in');
        p.querySelectorAll('.reveal').forEach(function(r) { r.classList.add('shown'); });
      }
    });
  }, 400);

  // ---- Keyboard nav ----
  window.addEventListener('keydown', (e) => {
    var _ae = document.activeElement;
    if (_ae && _ae.isContentEditable) return; // editing text: let keys through
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); goTo(current + 1); }
    else if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); goTo(current - 1); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(pages.length - 1); }
  });

  // ---- Cover direction switch (A/B removed — C is permanent) ----
  const coverBtns = [];
  const variants = Array.from(document.querySelectorAll('.cover-variant'));
  function setCover(key) {
    variants.forEach((v) => { v.style.display = v.dataset.cover === key ? 'block' : 'none'; });
    if (typeof drawWires === 'function') drawWires();
    if (typeof drawCoverGraph === 'function') drawCoverGraph();
  }
  setCover('C');

  // ---- Cover collage connector lines (Direction C) ----
  function drawCoverGraph() {
    const g = document.querySelector('.cg-inpage') || document.querySelector('.cover-variant[data-cover="C"] .cover-graph');
    if (!g) return;
    const svg = g.querySelector('.graph-wires');
    const orb = g.querySelector('.line-hub') || g.querySelector('.gcenter .orb') || g.querySelector('.gcenter');
    if (!svg || !orb) return;
    const gR = g.getBoundingClientRect();
    if (gR.width < 10) return;
    const oc = orb.getBoundingClientRect();   // ray origin = the draggable line hub (independent of the logo)
    const ocx = oc.left + oc.width / 2 - gR.left, ocy = oc.top + oc.height / 2 - gR.top;
    // keep-out matches the hub size so lines start right at its edge (works when the hub is resized)
    const cm = Math.max(40, oc.width / 2 + 4);
    const cL = ocx - cm, cR = ocx + cm, cT = ocy - cm, cB = ocy + cm;
    // bottom keep-out: downward lines must start BELOW the logo's text block
    // ("SAPPHIC JUNKIE / CONTENT STUDIO / A single source of truth") so they never touch it
    const gcEl = g.querySelector('.gcenter');
    const textBottom = gcEl ? (gcEl.getBoundingClientRect().bottom - gR.top + 10) : cB;
    let paths = '';
    g.querySelectorAll('.gcard').forEach((card) => {
      const r = card.getBoundingClientRect();
      const nx = r.left + r.width / 2 - gR.left, ny = r.top + r.height / 2 - gR.top;
      const dx = nx - ocx, dy = ny - ocy, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      // start where the ray exits the center keep-out box
      let ts = Infinity;
      if (ux > 0) ts = Math.min(ts, (cR - ocx) / ux); else if (ux < 0) ts = Math.min(ts, (cL - ocx) / ux);
      if (uy > 0) ts = Math.min(ts, (cB - ocy) / uy); else if (uy < 0) ts = Math.min(ts, (cT - ocy) / uy);
      let x1 = ocx + ux * ts, y1 = ocy + uy * ts;
      // bottom two lines (cards that sit BELOW the text): drop the start below the logo
      // text so the line never crosses it. (Side lines, whose cards are level with the
      // orb, are left alone — clipping them would fling their start off to the side.)
      if (uy > 0 && ny > textBottom && y1 < textBottom) { const ts2 = (textBottom - ocy) / uy; x1 = ocx + ux * ts2; y1 = textBottom; }
      // extend 12px PAST the card edge so the dashed line always touches the thumbnail;
      // the card (z-index 9) sits over the wires (z-index 7) and hides the overlap.
      const L = r.left - gR.left, R = r.right - gR.left, T = r.top - gR.top, B = r.bottom - gR.top;
      const bx = -ux, by = -uy; let t = Infinity;
      if (bx > 0) t = Math.min(t, (R - nx) / bx); else if (bx < 0) t = Math.min(t, (L - nx) / bx);
      if (by > 0) t = Math.min(t, (B - ny) / by); else if (by < 0) t = Math.min(t, (T - ny) / by);
      const x2 = nx + bx * (t - 12), y2 = ny + by * (t - 12);
      paths += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
        '" stroke="url(#cwg)" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 9" />';
      // solid tip at the thumbnail — the dash pattern can leave the last dash up to ~11px short
      // of the edge; this guarantees the connector always visibly TOUCHES the card.
      const sx = x2 - 16 * ux, sy = y2 - 16 * uy;
      paths += '<line x1="' + sx + '" y1="' + sy + '" x2="' + x2 + '" y2="' + y2 +
        '" stroke="url(#cwg)" stroke-width="2" stroke-linecap="round" />';
    });
    svg.innerHTML =
      '<defs><linearGradient id="cwg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="' + gR.width + '" y2="' + gR.height + '">' +
      '<stop offset="0%" stop-color="rgba(229,82,127,0.55)"/>' +
      '<stop offset="100%" stop-color="rgba(90,108,240,0.45)"/></linearGradient></defs>' + paths;
  }
  document.querySelectorAll('.cover-graph img').forEach((im) => {
    if (im.complete) return;
    im.addEventListener('load', drawCoverGraph);
  });

  // ---- Arrange mode: drag ANY element (text, cards, screens) on ANY page ----
  const dragOffsets = (function arrangeMode() {
    // Atomic = moved as one unit. Keep this SMALL so individual elements stay movable.
    const ATOMIC = '.browser, .phone, .ba, .gcard, .gcenter, .btn, .tag, .balabel, .trio-link, .node, .lr-label';
    const SKIP_TAG = new Set(['SPAN','STRONG','EM','A','I','B','BR','SVG','PATH','LINE','RECT',
      'CIRCLE','DEFS','STOP','LINEARGRADIENT','IMG','SCRIPT','STYLE','HR']);
    const SKIP_CHROME = '.cover-switch, .arrange-bar, .rail, .scroll-hint, .lightbox, .bar, .pipe-h';
    // Layout containers: never grabbable themselves (so you move individual elements, not whole groups)
    const SKIP_WRAP = '.stack, .split, .cover-text, .cover-hero, .mosaic, .trio, .pipe, .stats, ' +
      '.cta-btns, .cover-variant, .learn, .diagram, .checks, .page-inner, .linked-stack';

    // --- Page-3 records: group each thumbnail with its caption into ONE draggable unit ---
    // SERIES+caption, STUDIO+caption, TALENT+caption each move together, and the three
    // records stay independent of one another (no single big group around all of them).
    document.querySelectorAll('.lr-row').forEach((row) => row.classList.add('grab-unit'));

    const seen = new Set();
    const els = [];
    document.querySelectorAll('.page-inner, .cover-graph').forEach((root) => {
      root.querySelectorAll('*').forEach((el) => {
        if (seen.has(el)) return;
        if (el.closest('.grab-unit') && !el.classList.contains('grab-unit')) return; // inside a unit -> move the whole unit
        if (SKIP_TAG.has(el.tagName)) return;
        if (el.classList.contains('drag-handle')) return;
        if (el.classList.contains('bar')) return;
        if (el.classList.contains('cover-graph')) return;
        if (el.querySelector('.cover-graph, .cg-inpage')) return; // wrapper around the constellation -> never a big group; grab the cards/orb individually
        if (el.closest(SKIP_CHROME)) return;
        if (el.matches(SKIP_WRAP)) return;     // layout container -> not grabbable as a group
        const a = el.closest(ATOMIC);
        if (a && a !== el) return;            // inside an atomic unit -> skip
        seen.add(el); els.push(el);
      });
    });
    const isCover = (el) => el.classList.contains('gcard') || el.classList.contains('gcenter') || el.classList.contains('line-hub');
    const isMedia = (el) => el.classList.contains('browser') || el.classList.contains('phone') || el.classList.contains('ba');

    // SECTION-SCOPED ids: editing one section can't shift another's tweaks
    const secCount = {};
    els.forEach((el) => {
      const sec = el.closest('[data-label]');
      const lbl = sec && sec.dataset.label ? sec.dataset.label : 'x';
      secCount[lbl] = (secCount[lbl] || 0);
      el.dataset.dragid = 'd' + lbl + '-' + secCount[lbl];
      secCount[lbl]++;
      if (isCover(el)) { el.dataset.defLeft = el.style.left || ''; el.dataset.defTop = el.style.top || ''; }
    });
    // big grab-zone on EVERY non-media/non-cover draggable; depth-layered so the
    // innermost element you click grabs itself, while the surrounding block stays grabbable too
    els.forEach((el) => {
      if (isCover(el)) return;
      if (getComputedStyle(el).position === 'absolute') return; // would break absolute layout
      let depth = 0; let p = el.parentElement;
      while (p) { if (p.dataset && p.dataset.dragid != null) depth++; p = p.parentElement; }
      el.style.setProperty('--gpz', String(depth));
      // FreeHand locked — no grab cursor
      // el.classList.add('cs-grabpad');
    });

    // BAKED-IN layout — Raven's locked FreeHand arrangement, the permanent default.
    // A fresh viewer (empty localStorage) gets exactly this; live localStorage edits
    // override it per-id (Object.assign order below). The constellation wires (d02-29)
    // are deliberately NOT baked so they always redraw live and reach the thumbnails.
    const BAKED_LAYOUT = {"d01-6":{"w":749.36376953125},"d01-7":{"w":657.1136474609375,"h":395.307861328125},"d01-15":{"w":812.52734375,"h":694.2890625,"x":-28.6026611328125,"y":49.078125},"d08-11":{"x":0,"y":0},"d08-8":{"x":0,"y":0},"d08-7":{"x":-0.00006103515625,"y":120.67010498046875},"d08-2":{"x":-4.82818603515625,"y":-1.774017333984375},"d08-0":{"x":6.46124267578125,"y":0},"d01-14":{"x":-189.625,"y":82.3460693359375,"hidden":true},"d07-2":{"x":-28.288818359375,"y":2},"d07-0":{"x":0,"y":-42.42083740234375},"d07-4":{"x":0,"y":50.540924072265625},"d07-7":{"x":0.0078125,"y":13.13116455078125},"d07-9":{"x":-0.007720947265625,"y":8.633697509765625},"d07-10":{"x":0,"y":4.3153076171875},"d07-11":{"x":-0.007843017578125,"y":32.1807861328125},"d07-13":{"x":-0.007843017578125,"y":64.7330322265625}};
    let store = {};
    try { store = JSON.parse(localStorage.getItem(LS + '-layout') || '{}'); } catch (e) {}
    store = Object.assign({}, BAKED_LAYOUT, store);   // localStorage (your live edits) wins per-id
    const rec = (el) => (store[el.dataset.dragid] = store[el.dataset.dragid] || {});
    // strip editing artifacts so they never get baked into saved text
    function cleanHTML(html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      tmp.querySelectorAll('.editing').forEach((n) => n.classList.remove('editing'));
      tmp.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
      tmp.querySelectorAll('[data-cc-id]').forEach((n) => n.removeAttribute('data-cc-id'));
      tmp.querySelectorAll('[data-om-id]').forEach((n) => n.removeAttribute('data-om-id'));
      return tmp.innerHTML;
    }

    function redraw() {
      try { if (typeof drawCoverGraph === 'function') drawCoverGraph(); } catch (e) {}
      try { if (typeof drawWires === 'function') drawWires(); } catch (e) {}
    }
    function applyOne(el) {
      const o = store[el.dataset.dragid];
      if (!o) return;
      if (o.html != null) el.innerHTML = cleanHTML(o.html);
      if (isCover(el)) {
        if (o.left != null) el.style.left = o.left;
        if (o.top != null) el.style.top = o.top;
      } else if (o.x != null || o.y != null) {
        const _at = 'translate(' + (o.x || 0) + 'px, ' + (o.y || 0) + 'px)';
        el.style.setProperty('--fh-t', _at);
        el.classList.add('fh-moved');
        el.style.setProperty('transform', _at, 'important');
      }
      if (o.w != null) { el.style.setProperty('width', o.w + 'px', 'important'); el.style.setProperty('max-width', 'none', 'important'); }
      if (o.h != null) el.style.setProperty('height', o.h + 'px', 'important');
      if (o.hidden) el.style.display = 'none';
    }
    function applyAll() { els.forEach(applyOne); redraw(); }
    function save() { try { localStorage.setItem(LS + '-layout', JSON.stringify(store)); } catch (e) {} }

    // ---- undo history ----
    const history = [];
    function updateUndoBtn() { const ub = document.querySelector('.arrange-undo'); if (ub) ub.disabled = history.length === 0; }
    function pushHistory() { history.push(JSON.stringify(store)); if (history.length > 80) history.shift(); updateUndoBtn(); }
    function baselineReset(el) {
      if (isCover(el)) { el.style.left = el.dataset.defLeft; el.style.top = el.dataset.defTop; }
      else { el.style.removeProperty('transform'); }
      el.style.removeProperty('--fh-t');
      el.classList.remove('fh-moved');
      el.style.width = ''; el.style.height = ''; el.style.maxWidth = ''; el.style.display = '';
      if (origHtml.has(el)) el.innerHTML = origHtml.get(el);
    }
    function hardApply() { els.forEach(baselineReset); els.forEach(applyOne); redraw(); }
    function applyById(id) {
      const el = document.querySelector('[data-dragid="' + id + '"]');
      if (el) { baselineReset(el); applyOne(el); }
    }
    function undo() {
      if (!history.length) return;
      deselect();
      const prev = JSON.parse(history.pop());
      // only touch elements whose saved entry actually changed (leave everything else alone)
      const ids = new Set([].concat(Object.keys(store), Object.keys(prev)));
      const changed = [];
      ids.forEach((id) => {
        if (JSON.stringify(store[id]) !== JSON.stringify(prev[id])) changed.push(id);
      });
      store = prev;
      save();
      changed.forEach(applyById);
      redraw(); updateUndoBtn();
    }

    // ---- selection + resize grips (edge + corner) ----
    const grips = ['e', 's', 'se'].map((dir) => {
      const g = document.createElement('div');
      g.className = 'drag-grip drag-grip-' + dir;
      g.dataset.dir = dir;
      return g;
    });
    let selected = null, prevPos = '';
    const delBtn = document.createElement('div');
    delBtn.className = 'drag-del';
    delBtn.title = 'Delete element';
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    function hideSelected() {
      if (!selected) return;
      pushHistory();
      const o = rec(selected); o.hidden = true;
      selected.style.display = 'none';
      save(); deselect(); redraw();
    }
    delBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); hideSelected(); });
    function deselect() {
      if (!selected) return;
      selected.classList.remove('selected');
      grips.forEach((g) => { if (g.parentElement === selected) selected.removeChild(g); });
      if (delBtn.parentElement === selected) selected.removeChild(delBtn);
      selected.style.position = prevPos;
      selected = null;
    }
    function select(el) {
      if (selected === el) return;
      deselect();
      selected = el;
      el.classList.add('selected');
      prevPos = el.style.position || '';
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      grips.forEach((g) => el.appendChild(g));
      el.appendChild(delBtn);
    }

    let resizing = false, rdir = '', rsx, rsy, rsw, rsh;
    grips.forEach((grip) => {
      grip.addEventListener('pointerdown', (e) => {
        if (!selected) return;
        e.preventDefault(); e.stopPropagation();
        resizing = true; rdir = grip.dataset.dir;
        pushHistory();
        try { grip.setPointerCapture(e.pointerId); } catch (er) {}
        rsx = e.clientX; rsy = e.clientY;
        rsw = selected.offsetWidth; rsh = selected.offsetHeight;
      });
      grip.addEventListener('pointermove', (e) => {
        if (!resizing || !selected) return;
        const o = rec(selected);
        if (rdir.indexOf('e') !== -1) {
          const w = Math.max(56, rsw + (e.clientX - rsx));
          // 'important' so it beats any !important width rule from a prior direct edit
          selected.style.setProperty('max-width', 'none', 'important');
          selected.style.setProperty('width', w + 'px', 'important');
          o.w = w;
        }
        if (rdir.indexOf('s') !== -1) {
          const h = Math.max(28, rsh + (e.clientY - rsy));
          selected.style.setProperty('height', h + 'px', 'important');
          o.h = h;
        }
        redraw();
      });
      function endResize() { if (!resizing) return; resizing = false; save(); }
      grip.addEventListener('pointerup', endResize);
      grip.addEventListener('pointercancel', endResize);
    });

    // ---- alignment guide overlay ----
    const guideLayer = document.createElement('div');
    guideLayer.className = 'align-guides';
    document.body.appendChild(guideLayer);
    function clearGuides() { while (guideLayer.firstChild) guideLayer.removeChild(guideLayer.firstChild); }
    function addGuide(cls, pos) {
      const d = document.createElement('div'); d.className = cls;
      if (cls === 'vguide') d.style.left = pos + 'px'; else d.style.top = pos + 'px';
      guideLayer.appendChild(d);
    }
    // returns {dx, dy} snap correction and draws guides
    function snapAlign(nx, ny) {
      if (!active) return { dx: 0, dy: 0 };
      const _t = 'translate(' + nx + 'px, ' + ny + 'px)';
      active.style.setProperty('--fh-t', _t);
      active.classList.add('fh-moved');
      active.style.setProperty('transform', _t, 'important');
      const r = active.getBoundingClientRect();
      const page = active.closest('.page');
      const inner = active.closest('.page-inner');
      const TH = 6;
      const xLines = [], yLines = [];
      if (inner) { const ir = inner.getBoundingClientRect(); xLines.push(ir.left, (ir.left + ir.right) / 2, ir.right); }
      page.querySelectorAll('[data-dragid]').forEach((e) => {
        if (e === active || active.contains(e) || e.contains(active)) return;
        const er = e.getBoundingClientRect();
        if (er.width < 2 || er.height < 2) return;
        xLines.push(er.left, (er.left + er.right) / 2, er.right);
        yLines.push(er.top, (er.top + er.bottom) / 2, er.bottom);
      });
      const ax = [r.left, (r.left + r.right) / 2, r.right];
      const ay = [r.top, (r.top + r.bottom) / 2, r.bottom];
      let bx = null, by = null;
      ax.forEach((a) => xLines.forEach((t) => { const dd = Math.abs(a - t); if (dd <= TH && (!bx || dd < bx.dd)) bx = { dd, delta: t - a, line: t }; }));
      ay.forEach((a) => yLines.forEach((t) => { const dd = Math.abs(a - t); if (dd <= TH && (!by || dd < by.dd)) by = { dd, delta: t - a, line: t }; }));
      clearGuides();
      if (bx) addGuide('vguide', bx.line);
      if (by) addGuide('hguide', by.line);
      return { dx: bx ? bx.delta : 0, dy: by ? by.delta : 0 };
    }

    // toolbar
    const bar = document.createElement('div');
    bar.className = 'arrange-bar';
    bar.innerHTML = '<button class="arrange-toggle" type="button">✥ FreeHand</button>' +
      '<button class="arrange-undo" type="button" hidden disabled>↶ Undo</button>' +
      '<button class="arrange-cancel" type="button" hidden>✕ Cancel</button>';
    // FreeHand locked: bar removed, layout is baked-in and permanent
    // document.body.appendChild(bar);
    const toggle = bar.querySelector('.arrange-toggle');
    const cancelBtn = bar.querySelector('.arrange-cancel');
    const undoBtn = bar.querySelector('.arrange-undo');
    let sessionStart = null;
    undoBtn.addEventListener('click', undo);
    // Cmd/Ctrl+Z = single-step undo (only in FreeHand mode, not while typing)
    window.addEventListener('keydown', (e) => {
      if (!document.body.classList.contains('arranging')) return;
      const editingNow = document.querySelector('[contenteditable="true"]');
      if (editingNow) return;
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault(); undo();
      }
    });
    toggle.addEventListener('click', () => {
      const on = document.body.classList.toggle('arranging');
      toggle.classList.toggle('on', on);
      toggle.textContent = on ? '✓ Done' : '✥ FreeHand';
      cancelBtn.hidden = !on;
      undoBtn.hidden = !on;
      if (on) { sessionStart = JSON.stringify(store); }
      else { deselect(); }
    });
    cancelBtn.addEventListener('click', () => {
      deselect();
      store = JSON.parse(sessionStart || '{}');
      save(); hardApply();
      document.body.classList.remove('arranging');
      toggle.classList.remove('on');
      toggle.textContent = '✥ FreeHand';
      cancelBtn.hidden = true; undoBtn.hidden = true;
    });

    const origHtml = new Map();

    let active = null, sx, sy, startX, startY, coverRect, inDiagram = false, dragSnapped = false;
    function down(e) {
      if (!document.body.classList.contains('arranging')) return;
      const el = e.currentTarget;
      if (el.getAttribute('contenteditable') === 'true') return;  // let text editing work
      if (e.target.closest('[contenteditable="true"]')) return;   // click inside edited text: place caret, don't grab
      if (e.target.closest('.knob, .handle')) return;             // let before/after slider work
      e.preventDefault(); e.stopPropagation();
      select(el);
      dragSnapped = false;
      active = el;
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
      el.classList.add('dragging');
      sx = e.clientX; sy = e.clientY;
      inDiagram = !!el.closest('.diagram');
      if (isCover(el)) {
        coverRect = el.parentElement.getBoundingClientRect();
        const cs = getComputedStyle(el);
        startX = (parseFloat(cs.left) / coverRect.width) * 100;
        startY = (parseFloat(cs.top) / coverRect.height) * 100;
      } else {
        const o = store[el.dataset.dragid] || { x: 0, y: 0 };
        startX = o.x || 0; startY = o.y || 0;
      }
    }
    function move(e) {
      if (!active) return;
      if (!dragSnapped) { pushHistory(); dragSnapped = true; }
      if (isCover(active)) {
        const dx = ((e.clientX - sx) / coverRect.width) * 100;
        const dy = ((e.clientY - sy) / coverRect.height) * 100;
        active.style.left = (startX + dx).toFixed(2) + '%';
        active.style.top = (startY + dy).toFixed(2) + '%';
        const o = rec(active); o.left = active.style.left; o.top = active.style.top;
        // logo moves independently of the lines; only the hub/cards redraw the wires
        if (!active.classList.contains('gcenter') && typeof drawCoverGraph === 'function') drawCoverGraph();
      } else {
        let nx = startX + (e.clientX - sx);
        let ny = startY + (e.clientY - sy);
        const snap = snapAlign(nx, ny);   // sets a tentative transform + draws guides
        nx += snap.dx; ny += snap.dy;
        const _ft = 'translate(' + nx + 'px, ' + ny + 'px)';
        active.style.setProperty('--fh-t', _ft);
        active.classList.add('fh-moved');
        active.style.setProperty('transform', _ft, 'important');
        const o = rec(active); o.x = nx; o.y = ny;
        if (inDiagram && typeof drawWires === 'function') drawWires();
      }
    }
    function up() { if (!active) return; active.classList.remove('dragging'); active = null; clearGuides(); save(); }

    // ---- rich-text formatting toolbar ----
    let editingEl = null;
    const rtBar = document.createElement('div');
    rtBar.className = 'rt-toolbar';
    rtBar.innerHTML =
      '<button data-cmd="bold" title="Bold"><b>B</b></button>' +
      '<button data-cmd="italic" title="Italic"><i>I</i></button>' +
      '<button data-cmd="underline" title="Underline"><u>U</u></button>' +
      '<span class="rt-sep"></span>' +
      '<button data-weight="400" title="Regular">R</button>' +
      '<button data-weight="500" title="Medium">M</button>' +
      '<button data-weight="700" title="Bold weight">Bd</button>' +
      '<span class="rt-sep"></span>' +
      '<button data-size="-" title="Smaller">A\u2212</button>' +
      '<button data-size="+" title="Larger">A+</button>' +
      '<span class="rt-sep"></span>' +
      '<button class="rt-sw" data-color="#ffffff" title="White" style="background:#fff"></button>' +
      '<button class="rt-sw" data-color="#ff97b1" title="Pink" style="background:#ff97b1"></button>' +
      '<button class="rt-sw" data-color="#b85ed6" title="Violet" style="background:#b85ed6"></button>' +
      '<button class="rt-sw" data-color="#5a6cf0" title="Blue" style="background:#5a6cf0"></button>' +
      '<span class="rt-sep"></span>' +
      '<button class="rt-hl" data-bg="rgba(229,82,127,0.45)" title="Highlight pink" style="background:#e5527f"></button>' +
      '<button class="rt-hl" data-bg="rgba(90,108,240,0.45)" title="Highlight blue" style="background:#5a6cf0"></button>' +
      '<button class="rt-hl" data-bg="rgba(255,221,87,0.55)" title="Highlight yellow" style="background:#ffdd57"></button>' +
      '<button class="rt-hl rt-hl-x" data-bg="transparent" title="Clear highlight">\u00d8</button>' +
      '<span class="rt-sep"></span>' +
      '<button class="rt-done" title="Done">\u2713 Done</button>';
    document.body.appendChild(rtBar);

    function styleSelection(styleObj) {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      Object.keys(styleObj).forEach((k) => { span.style[k] = styleObj[k]; });
      try { range.surroundContents(span); }
      catch (e) { const frag = range.extractContents(); span.appendChild(frag); range.insertNode(span); }
      sel.removeAllRanges();
      const nr = document.createRange(); nr.selectNodeContents(span); sel.addRange(nr);
    }
    function currentFontPx() {
      const sel = window.getSelection();
      let node = sel && sel.anchorNode; if (node && node.nodeType === 3) node = node.parentElement;
      return node ? (parseFloat(getComputedStyle(node).fontSize) || 15) : 15;
    }
    rtBar.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => e.preventDefault()); // keep the text selection
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (btn.classList.contains('rt-done')) { if (editingEl) editingEl.blur(); return; }
        try { document.execCommand('styleWithCSS', false, true); } catch (er) {}
        const cmd = btn.dataset.cmd, w = btn.dataset.weight, sz = btn.dataset.size, col = btn.dataset.color, bg = btn.dataset.bg;
        if (cmd) { try { document.execCommand(cmd, false, null); } catch (er) {} }
        else if (w) styleSelection({ fontWeight: w });
        else if (col) { try { document.execCommand('foreColor', false, col); } catch (er) {} }
        else if (bg !== undefined) { try { document.execCommand('hiliteColor', false, bg); } catch (er) { try { document.execCommand('backColor', false, bg); } catch (e2) {} } }
        else if (sz) { const cur = currentFontPx(); styleSelection({ fontSize: Math.max(9, cur + (sz === '+' ? 2 : -2)) + 'px' }); }
        if (editingEl) { const o = rec(editingEl); o.html = cleanHTML(editingEl.innerHTML); save(); }
      });
    });
    function showRTBar(el) { editingEl = el; rtBar.classList.add('on'); }
    function hideRTBar() { editingEl = null; rtBar.classList.remove('on'); }

    els.forEach((el) => {
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('dblclick', (e) => {
        if (!document.body.classList.contains('arranging')) return;
        e.preventDefault(); e.stopPropagation();
        deselect();
        pushHistory();
        if (!origHtml.has(el)) origHtml.set(el, el.innerHTML);
        el.setAttribute('contenteditable', 'true');
        el.classList.add('editing');
        el.focus();
        showRTBar(el);
      });
      el.addEventListener('blur', () => {
        if (el.getAttribute('contenteditable') !== 'true') return;
        el.setAttribute('contenteditable', 'false');
        el.classList.remove('editing');
        const o = rec(el); o.html = cleanHTML(el.innerHTML); save();
        hideRTBar();
      });
      el.addEventListener('keydown', (e) => {
        if (el.getAttribute('contenteditable') !== 'true') return;
        if (e.key === 'Escape') { e.preventDefault(); el.blur(); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          try { document.execCommand('insertLineBreak'); }
          catch (er) { try { document.execCommand('insertHTML', false, '<br>'); } catch (e2) {} }
          const o = rec(el); o.html = cleanHTML(el.innerHTML); save();
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (!document.body.classList.contains('arranging') || !selected) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); hideSelected(); }
    });

    applyAll();
    return { applyAll: applyAll };
  })();


  // ---- Challenge diagram wires ----
  function drawWires() {
    const diagram = document.querySelector('.diagram');
    if (!diagram) return;
    const svg = diagram.querySelector('svg.wires');
    const center = diagram.querySelector('.node.center');
    if (!center) return;
    const cRect = diagram.getBoundingClientRect();
    const orb = center.querySelector('.orb') || center;
    const oc = orb.getBoundingClientRect();   // just the logo orb
    const cc = center.getBoundingClientRect(); // full node incl. labels (for bottom only)
    const ocx = oc.left + oc.width / 2 - cRect.left;
    const ocy = oc.top + oc.height / 2 - cRect.top;
    // keep-out: hug the ORB on top + sides (so the top line reaches), but clear the
    // full label block on the bottom (so downward lines never cross the text)
    const m = 16;
    const L = oc.left - cRect.left - m, R = oc.right - cRect.left + m;
    const T = oc.top - cRect.top - m;
    const B = cc.bottom - cRect.top + m;
    let paths = '';
    diagram.querySelectorAll('.node:not(.center)').forEach((n) => {
      const r = n.getBoundingClientRect();
      const nx = r.left + r.width / 2 - cRect.left;
      const ny = r.top + 28 - cRect.top; // node orb center
      const dx = nx - ocx, dy = ny - ocy;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      // start where the ray exits the center keep-out box
      let t = Infinity;
      if (ux > 0) t = Math.min(t, (R - ocx) / ux); else if (ux < 0) t = Math.min(t, (L - ocx) / ux);
      if (uy > 0) t = Math.min(t, (B - ocy) / uy); else if (uy < 0) t = Math.min(t, (T - ocy) / uy);
      const x1 = ocx + ux * t, y1 = ocy + uy * t;
      const x2 = nx - ux * 46, y2 = ny - uy * 46; // stop before node orb
      paths += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
        '" stroke="url(#wg)" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="2 11" />';
    });
    svg.innerHTML =
      '<defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="rgba(229,82,127,0.6)"/>' +
      '<stop offset="100%" stop-color="rgba(90,108,240,0.5)"/></linearGradient></defs>' + paths;
  }

  // ---- Restore state ----
  setCover('C');

  update(); // mark page 0 in immediately

  let savedPage = 0;
  try { savedPage = parseInt(localStorage.getItem(LS + '-page') || '0', 10); } catch (e) {}
  if (savedPage > 0 && savedPage < pages.length) {
    pages[savedPage].scrollIntoView({ block: 'start' });
    update();
  }

  // ---- Before / After slider ----
  document.querySelectorAll('.ba').forEach((ba) => {
    let dragging = false;
    function set(clientX) {
      const r = ba.getBoundingClientRect();
      let pct = ((clientX - r.left) / r.width) * 100;
      pct = Math.max(2, Math.min(98, pct));
      ba.style.setProperty('--x', pct + '%');
    }
    // capture-phase so it always wins over FreeHand drag, in any mode
    ba.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      dragging = true;
      try { ba.setPointerCapture(e.pointerId); } catch (er) {}
      set(e.clientX);
    }, true);
    ba.addEventListener('pointermove', (e) => { if (dragging) { e.stopPropagation(); set(e.clientX); } }, true);
    ba.addEventListener('pointerup', (e) => { if (dragging) { e.stopPropagation(); dragging = false; } }, true);
    ba.addEventListener('pointercancel', () => { dragging = false; });
  });

  // ---- Lightbox: click a screen to zoom in ----
  const lb = document.getElementById('lightbox');
  if (lb) {
    const lbImg = lb.querySelector('img');
    document.querySelectorAll('.browser .shotwrap img, .shotcard img').forEach((im) => {
      im.addEventListener('click', () => {
        lbImg.src = im.currentSrc || im.src;
        lbImg.alt = im.alt || '';
        lb.classList.add('on');
      });
    });
    const closeLb = () => lb.classList.remove('on');
    lb.addEventListener('click', closeLb);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLb(); });
  }

  // safety: redraw wires + recompute after layout/fonts settle
  // assign stagger index to each constellation card for CSS reveal delay
  document.querySelectorAll('.cg-inpage .gcard').forEach((c, i) => c.style.setProperty('--cd', i));
  setTimeout(() => { drawWires(); drawCoverGraph(); dragOffsets.applyAll(); update(); }, 500);
  setTimeout(drawCoverGraph, 1500);   // extra settle pass (large poster art / late layout)
  window.addEventListener('load', () => { drawWires(); drawCoverGraph(); dragOffsets.applyAll(); update(); });
  window.addEventListener('resize', drawCoverGraph);
  // self-heal: always redraw the constellation wires when it scrolls into view, so a
  // one-off timing glitch can never leave a line (e.g. the straight-up top line) missing
  try {
    const cgEl = document.querySelector('.cg-inpage');
    if (cgEl && 'IntersectionObserver' in window) {
      new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) drawCoverGraph(); }); }).observe(cgEl);
    }
  } catch (e) {}
})();
