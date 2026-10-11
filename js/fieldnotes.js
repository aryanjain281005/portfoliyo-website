/* =====================================================================
   FIELD NOTES — Meng To's Sketchbook, opened over the night.

   The engine is the sketchbook's own: spreads are transparent images of an
   open book, and the leaf that turns is a chain of nested strips whose
   tangent sweeps through an arc, so the page bends the way paper bends.
   The loupe is the same brass magnifier lying on the desk.

   What changed is where it lives. Here it is a dialog over the temple: it
   opens on whichever project was asked for, riffles the last few pages in
   to land there, pauses the live scene behind it while it is up, and hands
   focus back when it closes.
   ===================================================================== */
(function () {
'use strict';
const Q = new URLSearchParams(location.search);
const DIR = 'fieldnotes/';
const PAGES = [
  { file: '00-author.webp',     title: 'Aryan Jain',   place: 'The author',
    links: [['GitHub', 'https://github.com/aryanjain281005'], ['LinkedIn', 'https://www.linkedin.com/in/aryan-jain-256465382/'], ['Résumé', 'assets/aryan-jain-resume.pdf']] },
  { file: '01-imposter.webp',    title: 'IMPOSTER',     place: 'n8n · Business',
    links: [['Source', 'https://github.com/aryanjain281005/IMPOSTER-N8N-BUISNESS-AUTOMATION']] },
  { file: '02-vyanasoul.webp',   title: 'VyanaSoul',    place: 'Client · Live',
    links: [['Visit live', 'https://vyanasoul.vercel.app'], ['Source', 'https://github.com/aryanjain281005/Buildspiritualconsultancywebsite']] },
  { file: '03-wordoo.webp',      title: 'Wordoo',       place: 'Flutter · EdTech',
    links: [['Source', 'https://github.com/aryanjain281005/wordoo']] },
  { file: '04-prithvinet.webp',  title: 'PrithviNet',   place: 'Climate · Data',
    links: [['Source', 'https://github.com/aryanjain281005/prithvunet']] },
  { file: '05-travel.webp',      title: 'Travel AI',    place: 'AI · Live',
    links: [['Visit live', 'https://travel-ai-drab.vercel.app'], ['Source', 'https://github.com/aryanjain281005/travel-ai']] },
  { file: '06-spendly.webp',     title: 'Spendly',      place: 'Flask · Live',
    links: [['Visit live', 'https://spendly-production-2a3b.up.railway.app'], ['Source', 'https://github.com/aryanjain281005/expense_tracker-claudecode']] },
  { file: '07-truthstamp.webp',  title: 'TruthStamp',   place: 'Web3 · Rust',
    links: [['Source', 'https://github.com/aryanjain281005/truthstamp-dapp']] },
  { file: '08-skillscout.webp',  title: 'SkillScout',   place: 'Flutter · Mobile',
    links: [['Source', 'https://github.com/aryanjain281005/SKILLSCOUT']] },
  { file: '09-secondbrain.webp', title: 'Second Brain', place: 'JavaScript · First',
    links: [['Source', 'https://github.com/aryanjain281005/second-Brain']] }
];
/* three sizes of every spread: a light one for phones, the standard one, and
   a 2x one for dense desktop screens, where the loupe can show real detail */
const PHONE = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
const VARIANT = PHONE ? '-m' : ((devicePixelRatio || 1) > 1.3 ? '@2x' : '');
PAGES.forEach(p => p.url = DIR + p.file.replace(/\.webp$/, VARIANT + '.webp'));
/* the words on each page, as text: read on a phone, heard by a screen reader */
let TEXT = null;
const loadText = () => TEXT ? Promise.resolve(TEXT) :
  fetch(DIR + 'plates.json').then(r => r.json()).then(j => (TEXT = j)).catch(() => (TEXT = []));
const M = PAGES.length;

const fn = document.getElementById('fn');
const wrap = document.getElementById('sbWrap');
const stage = document.getElementById('sbStage');
const sb3d = document.getElementById('sb3d');
const book = document.getElementById('sbBook');
const capBox = document.getElementById('sbCaptions');
const hint = document.getElementById('sbHint');
const linkBox = document.getElementById('fnLinks');
if (!fn || !book) return;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
let isOpen = false, lastFocus = null;

/* ------------------------------------------------ the turning leaf */
const N = 18;            /* strips — enough for a smooth curve          */
const SPAN = 0.449;      /* gutter → outer page edge, as a fraction     */
const BETA = 0.60;       /* peak curl of the arc, radians              */
let idx = 0, turn = null;
let strips = [];

function el(t, c) { const e = document.createElement(t); if (c) e.className = c; return e; }
function imgEl(i, side) {
  const im = new Image(); im.className = 'sb-half-img ' + side;
  im.draggable = false; im.alt = ''; im.src = PAGES[i].url; return im;
}
function halfEl(pos, i) {
  const d = el('div', 'sb-half ' + pos);
  d.appendChild(imgEl(i, pos));
  d.appendChild(el('div', 'gutter-shade ' + pos));
  return d;
}
function buildCurl(dir, from, to) {
  strips = [];
  const c = el('div', 'curl ' + dir);
  c.style.setProperty('--n', N);
  c.style.setProperty('--span', SPAN);
  let host = c;
  for (let i = 0; i < N; i++) {
    const s = el('div', 'strip');
    s.style.setProperty('--i', i);
    const gut = 'calc(var(--bw) * 0.5)';
    const sw = 'calc(var(--bw) * ' + SPAN + ' / ' + N + ')';
    const A = 'calc(-1 * (' + gut + ' + ' + i + ' * ' + sw + '))';
    const B = 'calc(' + (i + 1) + ' * ' + sw + ' - ' + gut + ')';
    const f = el('div', 'face front'), b = el('div', 'face back');
    const dress = (e, url, px) => { e.style.backgroundImage = 'url(' + url + ')'; e.style.backgroundPositionX = px; };
    dress(f, PAGES[from].url, dir === 'next' ? A : B);
    dress(b, PAGES[to].url, dir === 'next' ? B : A);
    f.appendChild(el('div', 'sh')); f.appendChild(el('div', 'gl'));
    b.appendChild(el('div', 'sh')); b.appendChild(el('div', 'gl'));
    s.appendChild(f); s.appendChild(b);
    if (i === N - 1) s.classList.add('edge');
    host.appendChild(s); host = s;
    strips.push(s);
  }
  return c;
}
function applyTurn(t) {
  const th = Math.PI * t;
  const beta = BETA * Math.sin(Math.PI * t);
  const D = 180 / Math.PI;
  const tt = th + beta, td = 2 * beta / N;
  sb3d.style.setProperty('--tt', (tt * D).toFixed(2) + 'deg');
  sb3d.style.setProperty('--td', (td * D).toFixed(3) + 'deg');
  sb3d.style.setProperty('--shade', Math.sin(Math.PI * t).toFixed(3));
  fadeCaption(t);
  for (let i = 0; i < strips.length; i++) {
    const l1 = Math.abs(Math.cos(tt - i * td));
    const l2 = Math.abs(Math.cos(tt - (i + 1) * td));
    const st = strips[i].style;
    st.setProperty('--lit', l1.toFixed(3));
    st.setProperty('--a1', ((1 - l1) * .62).toFixed(3));
    st.setProperty('--a2', ((1 - l2) * .62).toFixed(3));
  }
}
function paint() {
  book.textContent = '';
  if (!turn) {
    const f = el('div', 'sb-full');
    const im = new Image(); im.src = PAGES[idx].url; im.alt = PAGES[idx].title + ' — field notes';
    im.draggable = false;
    f.appendChild(im); book.appendChild(f);
    sb3d.style.setProperty('--shade', '0');
  } else {
    const next = turn.dir === 'next';
    book.appendChild(halfEl('left', next ? turn.from : turn.to));
    book.appendChild(halfEl('right', next ? turn.to : turn.from));
    book.appendChild(buildCurl(turn.dir, turn.from, turn.to));
    applyTurn(turn.t);
  }
  const a = el('button', 'sb-zone sb-prev'), b = el('button', 'sb-zone sb-next');
  a.setAttribute('aria-label', 'previous page'); b.setAttribute('aria-label', 'next page');
  book.appendChild(a); book.appendChild(b);
  layout();
  caption();
  marks();
  syncZoomLayer();
  placeLoupe();
}
let capOut = null, capIn = null;
function caption() {
  capBox.textContent = '';
  capOut = capIn = null;
  if (turn) {
    capOut = el('p', 'sb-caption live'); capOut.textContent = PAGES[turn.from].title; capBox.appendChild(capOut);
    capIn = el('p', 'sb-caption live'); capIn.textContent = PAGES[turn.to].title; capBox.appendChild(capIn);
    fadeCaption(turn.t);
  } else {
    const p = el('p', 'sb-caption'); p.textContent = PAGES[idx].title + '  ·  ' + PAGES[idx].place; capBox.appendChild(p);
    links();
  }
}
/* the spread is a picture, so its links live under the book, in the page */
const reader = document.getElementById('fnRead');
function readPage() {
  if (!reader) return;
  loadText().then(T => {
    const t = T[idx]; if (!t) return;
    reader.textContent = '';
    const k = el('span', 'fn-read-k'); k.textContent = 'Plate ' + String(idx).padStart(2, '0') + ' · ' + t.year; reader.appendChild(k);
    const h = el('h3', 'fn-read-t'); h.textContent = t.title; reader.appendChild(h);
    const sub = el('p', 'fn-read-sub'); sub.textContent = t.sub; reader.appendChild(sub);
    t.body.forEach(par => { const q = el('p', 'fn-read-p'); q.textContent = par; reader.appendChild(q); });
    const dl = el('dl', 'fn-read-dl');
    t.rows.forEach(r => { const dt = el('dt'); dt.textContent = r[0]; const dd = el('dd'); dd.textContent = r[1]; dl.appendChild(dt); dl.appendChild(dd); });
    reader.appendChild(dl);
    const c = el('p', 'fn-read-cap'); c.textContent = t.caption; reader.appendChild(c);
  });
}
function links() {
  readPage();
  linkBox.textContent = '';
  PAGES[idx].links.forEach(l => {
    const a = el('a'); a.href = l[1]; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = l[0] + ' ↗'; a.setAttribute('data-cursor', '');
    linkBox.appendChild(a);
  });
}
function fadeCaption(t) {
  if (!capOut || !capIn) return;
  const out = 1 - Math.max(0, Math.min(1, (t - 0.10) / 0.28));
  const inn = Math.max(0, Math.min(1, (t - 0.56) / 0.30));
  capOut.style.opacity = out.toFixed(3);
  capIn.style.opacity = inn.toFixed(3);
}
function layout() { sb3d.style.setProperty('--bw', book.clientWidth + 'px'); }
addEventListener('resize', () => { if (isOpen) layout(); });

/* ------------------------------------------------------ spring loop */
let spring = null;
function animateTo(target, onDone, stiff, damp) {
  spring = { kind: 'spring', v: 0, target: target, done: onDone, k: stiff || 150, c: damp || 22 };
  kick();
}
function tweenTo(target, dur, onDone) {
  spring = { kind: 'tween', from: turn ? turn.t : 0, target: target, dur: dur, e: 0, done: onDone };
  kick();
}
let raf = null, last = 0;
function tick(now) {
  raf = null;
  const dt = Math.min(0.032, (now - last) / 1000 || 0.016); last = now;
  if (spring && turn) {
    const s = spring;
    if (s.kind === 'tween') {
      s.e += dt;
      const k = Math.min(1, s.e / s.dur);
      turn.t = s.from + (s.target - s.from) * k;
      applyTurn(turn.t);
      if (k >= 1) { spring = null; const d = s.done; d && d(); }
    } else {
      const x = turn.t - s.target;
      s.v += (-s.k * x - s.c * s.v) * dt;
      turn.t += s.v * dt;
      if (Math.abs(turn.t - s.target) < 0.002 && Math.abs(s.v) < 0.02) {
        turn.t = s.target; spring = null;
        applyTurn(turn.t);
        const d = s.done; d && d();
      } else applyTurn(turn.t);
    }
  }
  viewSpring();
  const lmoved = loupeEase();
  if ((spring || viewActive || lmoved) && raf === null) raf = requestAnimationFrame(tick);
}
function kick() { if (raf === null) { last = performance.now(); raf = requestAnimationFrame(tick); } }

/* ------------------------------------------- tilt + zoom of the book */
const TILT_X = 4.5, TILT_Y = 7;
const ZOOM_MIN = 0.9, ZOOM_MAX = 1.5;
const view = { rx: 0, ry: 0, z: 1, trx: 0, try_: 0, tz: 1 };
let viewActive = false, lastZ = 1;
function applyView() {
  sb3d.style.setProperty('--rx', view.rx.toFixed(2) + 'deg');
  sb3d.style.setProperty('--ry', view.ry.toFixed(2) + 'deg');
  sb3d.style.setProperty('--zoom', view.z.toFixed(3));
  if (view.z !== lastZ) { lastZ = view.z; placeLoupe(); }
}
function viewSpring() {
  const e = 0.14;
  let moved = false;
  for (const [k, t] of [['rx', 'trx'], ['ry', 'try_'], ['z', 'tz']]) {
    const d = view[t] - view[k];
    if (Math.abs(d) > 0.0006) { view[k] += d * e; moved = true; }
    else view[k] = view[t];
  }
  if (moved) applyView();
  viewActive = moved;
  return moved;
}
function setView(rx, ry, z) {
  view.trx = Math.max(-TILT_X, Math.min(TILT_X, rx));
  view.try_ = Math.max(-TILT_Y, Math.min(TILT_Y, ry));
  view.tz = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
  viewActive = true; kick();
  syncZoom();
}
function tiltTo(cx, cy) {
  if (drag || !isOpen) return;
  const r = book.getBoundingClientRect();
  if (!r.width) return;
  const nx = Math.max(-1, Math.min(1, (cx - (r.left + r.width / 2)) / (r.width * 0.62)));
  const ny = Math.max(-1, Math.min(1, (cy - (r.top + r.height / 2)) / (r.height * 0.9)));
  setView(-ny * TILT_X, nx * TILT_Y, view.tz);
}
addEventListener('pointermove', e => { if (e.pointerType !== 'touch') tiltTo(e.clientX, e.clientY); }, { passive: true });
stage.addEventListener('dblclick', () => setView(view.trx, view.try_, 1));

/* ------------------------------------------------------- pointer work */
let drag = null;
function hideHint() { hint.classList.add('gone'); }
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  e.preventDefault();
  const onBook = e.target.closest('.sb-zone');
  stage.setPointerCapture(e.pointerId);
  hideHint();
  if (!onBook || introOn) return;
  const r = book.getBoundingClientRect();
  const dir = (e.clientX - r.left) / r.width > 0.5 ? 'next' : 'prev';
  startTurn(dir, 0);
  drag = { dir: dir, x0: e.clientX, w: r.width, moved: 0, vel: 0, tPrev: performance.now() };
});
stage.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x0;
  drag.moved = Math.max(drag.moved, Math.abs(dx));
  const raw = (drag.dir === 'next' ? -dx : dx) / (drag.w * 0.62);
  const t = Math.max(0, Math.min(1, raw));
  const now = performance.now();
  drag.vel = (t - (turn ? turn.t : 0)) / Math.max(0.001, (now - drag.tPrev) / 1000);
  drag.tPrev = now;
  if (turn) { turn.t = t; applyTurn(t); }
});
function endDrag() {
  if (!drag) return;
  const d = drag; drag = null;
  if (!turn) return;
  if (d.moved < 6) { commit(); return; }
  (turn.t > 0.42 || d.vel > 1.1) ? commit() : cancel();
}
stage.addEventListener('dragstart', e => e.preventDefault());
stage.addEventListener('selectstart', e => e.preventDefault());
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

/* ------------------------------------------------------ turn control */
function startTurn(dir, t) {
  spring = null;
  if (turn) { idx = turn.to; turn = null; }
  shoveLoupe(dir);
  const from = idx;
  turn = { dir: dir, from: from, to: dir === 'next' ? (from + 1) % M : (from - 1 + M) % M, t: t || 0 };
  paint();
}
function commit() {
  if (!turn) return;
  if (REDUCED) { idx = turn.to; turn = null; paint(); return; }
  animateTo(1, () => { idx = turn.to; turn = null; paint(); }, 170, 26);
  kick();
}
function cancel() {
  if (!turn) return;
  animateTo(0, () => { turn = null; paint(); }, 150, 24);
  kick();
}
function step(dir) {
  if (introOn) endIntro();
  if (turn) { idx = turn.to; turn = null; }
  startTurn(dir, 0); commit();
}
function goTo(i) {
  if (introOn) endIntro();
  if (i === idx) return;
  if (turn) { idx = turn.to; turn = null; }
  const fwd = (i - idx + M) % M, back = (idx - i + M) % M;
  if (Math.min(fwd, back) === 1) { step(fwd === 1 ? 'next' : 'prev'); return; }
  idx = i; paint();
}
document.getElementById('sbLeft').onclick = () => step('prev');
document.getElementById('sbRight').onclick = () => step('next');
addEventListener('keydown', e => {
  if (!isOpen) return;
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  if (e.key === 'Tab') { trapFocus(e); return; }
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  e.preventDefault(); hideHint();
  step(e.key === 'ArrowRight' ? 'next' : 'prev');
}, true);

/* --------------------------------------------------- loupe + controls */
const loupe = document.getElementById('loupe');
const zRead = document.getElementById('zRead');
const loupeBtn = document.getElementById('loupeBtn');
const zInBtn = document.getElementById('zIn'), zOutBtn = document.getElementById('zOut');
const MAG = 2.3;
let loupeOn = true, lx = null, ly = null, lgrab = null, lTarget = null;
function loupeSize() { return Math.round(Math.max(150, Math.min(240, book.clientWidth * 0.22))); }
function bookBox() { return { x: 0, y: 0, w: book.clientWidth, h: book.clientHeight }; }
/* it rests on the lower corner of the right page, half off the paper */
function restLoupe() { const b = bookBox(); lx = b.x + b.w * 0.92; ly = b.y + b.h * 0.74; placeLoupe(); }
const zoomWrap = document.getElementById('zoomWrap');
const zoomInner = document.getElementById('zoomInner');
function syncZoomLayer() {
  zoomInner.textContent = '';
  for (const c of book.children) {
    if (c.classList.contains('sb-zone')) continue;
    zoomInner.appendChild(c.cloneNode(true));
  }
}
function placeLoupe() {
  if (lx === null) return;
  const B = bookBox(), bw = B.w, bh = B.h;
  if (!bw) return;
  const R = loupeSize() / 2, bez = R * 2 * 0.058;
  loupe.style.setProperty('--lr', R * 2 + 'px');
  loupe.style.transform = 'translate3d(' + (lx - R).toFixed(1) + 'px,' + (ly - R).toFixed(1) + 'px,0)';
  if (loupeOn) loupe.classList.add('on');
  const z = view.z, cx = bw / 2, cy = bh / 2;
  const x0 = cx + (bw * .051 - cx) * z, x1 = cx + (bw * .949 - cx) * z;
  const y0 = cy + (bh * .218 - cy) * z, y1 = cy + (bh * .782 - cy) * z;
  const nx = Math.max(x0, Math.min(lx, x1));
  const ny = Math.max(y0, Math.min(ly, y1));
  const inside = (lx > x0 && lx < x1 && ly > y0 && ly < y1)
    ? Math.min(lx - x0, x1 - lx, ly - y0, y1 - ly)
    : -Math.hypot(lx - nx, ly - ny);
  const k = Math.max(0, Math.min(1, (inside + R * 0.30) / (R * 0.55)));
  zoomWrap.style.opacity = (loupeOn ? k : 0).toFixed(3);
  if (k <= 0.002) return;
  const r = (R - bez).toFixed(1);
  const mask = 'radial-gradient(circle ' + r + 'px at ' + lx.toFixed(1) + 'px ' + ly.toFixed(1) + 'px,'
    + '#000 calc(100% - 1px),transparent 100%)';
  zoomWrap.style.webkitMaskImage = mask;
  zoomWrap.style.maskImage = mask;
  const px = cx + (lx - cx) / z, py = cy + (ly - cy) / z, s = MAG * z;
  zoomInner.style.transform = 'translate(' + (lx - px * s).toFixed(1) + 'px,' + (ly - py * s).toFixed(1) + 'px) '
    + 'scale(' + s.toFixed(4) + ')';
}
function shoveLoupe(dir) {
  if (!loupeOn || lx === null || lgrab) return;
  const b = bookBox();
  const nx = (b.w / 2 + (lx - b.x - b.w / 2) / view.z) / b.w, ny = (b.h / 2 + (ly - b.y - b.h / 2) / view.z) / b.h;
  if (nx < 0.02 || nx > 0.98 || ny < 0.17 || ny > 0.83) return;
  lTarget = { x: b.x + b.w * (dir === 'next' ? 0.08 : 0.92), y: b.y + b.h * 0.74 };
  kick();
}
/* after the riffle has shoved it about, the glass goes back to its corner */
function settleLoupe() {
  if (!loupeOn || lgrab) return;
  const b = bookBox(); lTarget = { x: b.x + b.w * 0.92, y: b.y + b.h * 0.74 }; kick();
}
function loupeEase() {
  if (!lTarget) return false;
  if (lgrab) { lTarget = null; return false; }
  const dx = lTarget.x - lx, dy = lTarget.y - ly;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) { lx = lTarget.x; ly = lTarget.y; lTarget = null; placeLoupe(); return false; }
  lx += dx * 0.17; ly += dy * 0.17; placeLoupe();
  return true;
}
loupe.addEventListener('pointerdown', e => {
  if (!loupeOn || e.button !== 0) return;
  e.preventDefault(); e.stopPropagation();
  lTarget = null;
  lgrab = { cx: e.clientX, cy: e.clientY, lx0: lx, ly0: ly };
  loupe.classList.add('held');
  loupe.setPointerCapture(e.pointerId);
  hideHint();
});
loupe.addEventListener('pointermove', e => {
  if (!lgrab) return;
  const b = bookBox(), R = loupeSize() / 2;
  lx = Math.max(b.x - R * 0.7, Math.min(b.x + b.w + R * 0.7, lgrab.lx0 + (e.clientX - lgrab.cx)));
  ly = Math.max(b.y - R * 0.7, Math.min(b.y + b.h + R * 1.0, lgrab.ly0 + (e.clientY - lgrab.cy)));
  placeLoupe();
});
function dropLoupe() { lgrab = null; loupe.classList.remove('held'); }
loupe.addEventListener('pointerup', dropLoupe);
loupe.addEventListener('pointercancel', dropLoupe);
loupeBtn.onclick = () => {
  loupeOn = !loupeOn;
  loupeBtn.setAttribute('aria-pressed', String(loupeOn));
  loupe.classList.toggle('on', loupeOn);
  if (loupeOn && lx === null) restLoupe();
  placeLoupe();
};
addEventListener('resize', () => { if (isOpen) { lx = null; restLoupe(); } });
function syncZoom() {
  zRead.textContent = Math.round(view.tz * 100) + '%';
  zOutBtn.disabled = view.tz <= ZOOM_MIN + 0.001;
  zInBtn.disabled = view.tz >= ZOOM_MAX - 0.001;
}
zInBtn.onclick = () => { setView(view.trx, view.try_, view.tz * 1.16); hideHint(); };
zOutBtn.onclick = () => { setView(view.trx, view.try_, view.tz / 1.16); hideHint(); };

/* --------------------------------------------------------- the shelf */
const plateList = document.getElementById('plateList');
if (plateList) PAGES.forEach((p, i) => {
  const li = el('li');
  const b = el('button', 'plate');
  b.setAttribute('data-cursor', '');
  b.innerHTML = '<span class="n">' + String(i).padStart(2, '0') + '</span>' +
                '<span class="t"></span><span class="p"></span>';
  b.querySelector('.t').textContent = p.title;
  b.querySelector('.p').textContent = p.place;
  b.onclick = () => open(i, b);
  li.appendChild(b); plateList.appendChild(li);
});
function marks() {
  if (!plateList) return;
  const cur = turn ? turn.to : idx;
  plateList.querySelectorAll('.plate').forEach((b, i) => b.setAttribute('aria-current', i === cur ? 'true' : 'false'));
}

/* ---------------------------------------------------------- the riffle
   On open the book flicks through the few plates before the one asked for
   and settles on it — the opening riffle of the sketchbook, shortened to
   a gesture rather than a tour. */
let riffle = null, riffleAt = 0, introOn = false;
function endIntro() { introOn = false; wrap.classList.remove('intro', 'b2'); }
function riffleStep() {
  const s = riffle[riffleAt];
  wrap.classList.toggle('b2', s.bell > 0.55);
  startTurn('next', 0);
  tweenTo(1, s.dur, () => {
    idx = turn.to; turn = null;
    riffleAt++;
    if (introOn && riffleAt < riffle.length) { paint(); riffleStep(); }
    else { endIntro(); paint(); settleLoupe(); }
  });
}
function riffleTo(i) {
  const coarse = matchMedia('(max-width: 640px), (pointer: coarse)').matches;
  const steps = 4;
  if (coarse || REDUCED) { idx = i; paint(); return; }
  idx = (i - steps + M) % M; paint();
  riffle = [];
  for (let r = 0; r < steps; r++) {
    const bell = Math.sin(Math.PI * ((r + .5) / steps));
    riffle.push({ bell: bell, dur: 0.30 - 0.16 * bell });
  }
  riffleAt = 0; introOn = true; wrap.classList.add('intro');
  riffleStep();
}

/* ------------------------------------------------------- the dialog */
/* The spreads are 2640 px wide: nine of them decoded up front is ~180 MB of
   bitmap and a run of main-thread decodes in the middle of someone's scroll.
   Only the plates the riffle will show are fetched when the book opens, each
   decoded off the main thread; the rest follow when the browser is idle. */
const decoded = new Map();
function want(i) {
  i = (i + M) % M;
  if (decoded.has(i)) return decoded.get(i);
  const load = url => { const im = new Image(); im.decoding = 'async'; im.src = url;
    return (im.decode ? im.decode() : new Promise((r, j) => { im.onload = r; im.onerror = j; })).then(() => im); };
  /* a phone on a patchy network drops the odd request: try once more, and
     if the page still will not come, forget it so the next turn asks again */
  const p = load(PAGES[i].url)
    .catch(() => new Promise(r => setTimeout(r, 700)).then(() => load(PAGES[i].url + (PAGES[i].url.includes('?') ? '&' : '?') + 'r=1')))
    .catch(() => { decoded.delete(i); const im = new Image(); return im; });
  decoded.set(i, p); return p;
}
function warmAround(i) {
  const need = [];
  for (let k = -4; k <= 1; k++) need.push(want(i + k));
  const rest = () => PAGES.forEach((_, k) => want(k));
  (window.requestIdleCallback || (f => setTimeout(f, 1200)))(rest, { timeout: 4000 });
  return Promise.all(need);
}
function open(i, from) {
  const ready = warmAround(i);
  lastFocus = from || document.activeElement;
  fn.hidden = false;
  document.documentElement.classList.add('fn-lock');
  document.dispatchEvent(new CustomEvent('fieldnotes', { detail: { open: true } }));
  isOpen = true;
  hint.classList.remove('gone');
  view.z = view.tz = 1; view.rx = view.ry = view.trx = view.try_ = 0; applyView(); syncZoom();
  idx = i; paint();
  requestAnimationFrame(() => {
    fn.classList.add('open');
    layout(); lx = null; restLoupe();
    /* the riffle waits for its plates, but never long: on a slow line the
       book simply opens on its page */
    Promise.race([ready, new Promise(r => setTimeout(r, 900))]).then(() => { if (isOpen) riffleTo(i); });
    const x = fn.querySelector('.fn-x'); x && x.focus({ preventScroll: true });
  });
}
function close() {
  if (!isOpen) return;
  isOpen = false;
  endIntro(); spring = null; turn = null;
  fn.classList.remove('open');
  document.documentElement.classList.remove('fn-lock');
  document.dispatchEvent(new CustomEvent('fieldnotes', { detail: { open: false } }));
  setTimeout(() => { if (!isOpen) fn.hidden = true; }, REDUCED ? 0 : 620);
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
function trapFocus(e) {
  const f = [].slice.call(fn.querySelectorAll('button, a[href]')).filter(n => n.offsetParent !== null);
  if (!f.length) return;
  const a = f[0], z = f[f.length - 1];
  if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
  else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
}
fn.querySelectorAll('[data-fn-close]').forEach(b => b.addEventListener('click', close));
document.querySelectorAll('[data-book]').forEach(t => {
  const go = e => { e.preventDefault(); e.stopImmediatePropagation(); open(+t.dataset.book, t); };
  t.addEventListener('click', go, true);
  t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go(e); });
});
window.__fieldnotes = { open: open, close: close };
if (Q.has('notes')) setTimeout(() => open(parseInt(Q.get('notes'), 10) || 0), 600);
})();
