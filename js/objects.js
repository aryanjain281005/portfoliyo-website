/* =====================================================================
   OBJECTS — the things you can handle at the temple.

   絵馬  the ema hang from their rail as damped pendulums. A brush of the
         cursor pushes each one it crosses by the speed it was moving, the
         night air keeps them faintly alive, and turning one over shows what
         is written on the back.
   名刺  the card leans toward the pointer on a spring and turns over on one;
         "Take my card" hands over a real contact (vCard).
   御神籤 the fortune box shakes, a numbered stick rises, and its slip unfolds.

   Every loop here sleeps when its object is off screen, and nothing moves
   for prefers-reduced-motion beyond the instant state changes.
   ===================================================================== */
(function () {
'use strict';
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $$ = (s, r) => [].slice.call((r || document).querySelectorAll(s));
const buzz = p => window.BUZZ && window.BUZZ(p);

/* a rAF loop that only runs while its element is near the viewport */
function visibleLoop(el, step) {
  let raf = 0, on = false, last = 0;
  const tick = t => {
    const dt = Math.min(.05, Math.max(0, (t - (last || t)) / 1000)); last = t;
    const keep = step(dt, t / 1000);
    raf = on && keep !== false ? requestAnimationFrame(tick) : 0;
  };
  const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };
  new IntersectionObserver(es => {
    on = es[es.length - 1].isIntersecting;
    if (on) start(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { rootMargin: '80px 0px' }).observe(el);
  document.addEventListener('visibilitychange', () => { if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } else if (!document.hidden && on) start(); });
  return { wake: () => { if (on) start(); } };
}

/* ------------------------------------------------------------- 絵馬 */
(function ema() {
  const wall = document.getElementById('emaWall'); if (!wall) return;
  const items = $$('[data-ema]', wall).map((li, i) => ({
    li, btn: li.querySelector('.ema-btn'),
    base: parseFloat(getComputedStyle(li).getPropertyValue('--tilt')) || 0,
    a: 0, v: 0, ph: i * 1.7 + .4, rect: null
  }));
  const K = 26, C = 2.0;           /* a light, slightly underdamped hang */
  let px = null, py = null, rectsAt = -1;
  const measure = () => { items.forEach(it => { it.rect = it.btn.getBoundingClientRect(); }); };
  const loop = visibleLoop(wall, (dt, t) => {
    if (REDUCE) return false;
    for (const it of items) {
      /* the night air: two slow incommensurate gusts per plaque */
      const wind = Math.sin(t * .7 + it.ph) * 1.1 + Math.sin(t * 1.9 + it.ph * 2.3) * .45;
      it.v += (-K * it.a - C * it.v + wind) * dt;
      it.a += it.v * dt;
      it.li.style.transform = 'rotate(' + (it.base + it.a).toFixed(2) + 'deg)';
    }
  });
  if (REDUCE) return;
  /* the brush: whatever plaque the pointer passes through takes its speed */
  wall.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const now = performance.now();
    if (now - rectsAt > 250) { measure(); rectsAt = now; }
    if (px !== null) {
      const dx = e.clientX - px;
      for (const it of items) {
        const r = it.rect;
        if (e.clientX > r.left - 8 && e.clientX < r.right + 8 && e.clientY > r.top - 30 && e.clientY < r.bottom + 10) {
          /* pushed lower down the board, it swings harder */
          const lever = .4 + .6 * Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
          it.v += Math.max(-34, Math.min(34, dx * 1.5 * lever));
        }
      }
      loop.wake();
    }
    px = e.clientX; py = e.clientY;
  }, { passive: true });
  wall.addEventListener('pointerleave', () => { px = py = null; });
  /* a finger brushes too. Touch events keep arriving while the page scrolls
     (pointer events are cancelled the moment a pan starts), so a swipe across
     the wall, or a scroll that starts on it, sets the plaques swinging: the
     sideways part of the stroke pushes, and the upward part catches each
     plaque off-centre so it turns away from where the finger crossed it */
  let fx = null, fy = null;
  wall.addEventListener('touchstart', e => { const t = e.touches[0]; fx = t.clientX; fy = t.clientY; }, { passive: true });
  wall.addEventListener('touchmove', e => {
    const t = e.touches[0]; if (fx === null) { fx = t.clientX; fy = t.clientY; return; }
    const dx = t.clientX - fx, dy = t.clientY - fy;
    measure();
    for (const it of items) {
      const r = it.rect;
      if (t.clientX > r.left - 10 && t.clientX < r.right + 10 && t.clientY > r.top - 30 && t.clientY < r.bottom + 14) {
        const lever = .4 + .6 * Math.min(1, Math.max(0, (t.clientY - r.top) / r.height));
        const off = Math.max(-1, Math.min(1, (t.clientX - (r.left + r.width / 2)) / (r.width / 2)));
        it.v += Math.max(-30, Math.min(30, dx * 1.6 * lever - Math.abs(dy) * .45 * off));
      }
    }
    fx = t.clientX; fy = t.clientY; loop.wake();
  }, { passive: true });
  wall.addEventListener('touchend', () => { fx = fy = null; }, { passive: true });
  addEventListener('scroll', () => { rectsAt = -1; }, { passive: true });
  /* turning one over gives it a small knock too */
  items.forEach(it => it.btn.addEventListener('click', () => {
    const on = it.btn.getAttribute('aria-pressed') !== 'true';
    it.btn.setAttribute('aria-pressed', String(on));
    it.v += on ? 22 : -22; loop.wake(); buzz(9);
  }));
})();

/* ------------------------------------------------------------- 名刺 */
(function meishi() {
  const card = document.getElementById('meishi'); if (!card) return;
  const inner = card.querySelector('.meishi-in');
  const flipBtn = document.querySelector('[data-meishi-flip]');
  const takeBtn = document.querySelector('[data-meishi-take]');
  const s = { rx: 0, ry: 0, trx: 0, try_: 0, f: 0, tf: 0, vf: 0 };
  const apply = () => { inner.style.transform = 'rotateX(' + s.rx.toFixed(2) + 'deg) rotateY(' + (s.ry + s.f).toFixed(2) + 'deg)'; };
  const loop = visibleLoop(card, dt => {
    const k = 1 - Math.exp(-dt * 7);
    s.rx += (s.trx - s.rx) * k; s.ry += (s.try_ - s.ry) * k;
    /* the turn is a spring with a little overshoot, like a card set down */
    s.vf += (-90 * (s.f - s.tf) - 13 * s.vf) * dt; s.f += s.vf * dt;
    apply();
  });
  const flip = () => {
    s.tf = s.tf ? 0 : 180;
    if (REDUCE) { s.f = s.tf; apply(); }
    buzz(10);
    flipBtn && flipBtn.setAttribute('aria-pressed', String(!!s.tf));
    flipBtn && (flipBtn.querySelector('span').textContent = s.tf ? 'Turn it back' : 'Turn it over');
    loop.wake();
  };
  if (FINE && !REDUCE) {
    const zone = card.closest('.fin') || card;
    zone.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * .9)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 1.4)));
      s.try_ = nx * 14; s.trx = -ny * 10; loop.wake();
    }, { passive: true });
    zone.addEventListener('pointerleave', () => { s.trx = s.try_ = 0; loop.wake(); });
  }
  /* a phone has no pointer to lean toward, but it has a tilt: the card
     answers the hand holding it. The rest position follows slowly, so however
     the phone is held the card settles flat. iOS asks permission, which only
     a tap can request, so there it starts with the first touch of the card */
  if (!FINE && !REDUCE && 'DeviceOrientationEvent' in window) {
    let base = null, live = false;
    const onTilt = e => {
      if (e.beta == null || e.gamma == null) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      base.b += (e.beta - base.b) * .02; base.g += (e.gamma - base.g) * .02;
      s.try_ = Math.max(-14, Math.min(14, (e.gamma - base.g) * 1.1));
      s.trx = Math.max(-10, Math.min(10, -(e.beta - base.b) * .8));
      loop.wake();
    };
    const listen = () => { if (!live) { live = true; addEventListener('deviceorientation', onTilt, { passive: true }); } };
    const ask = window.DeviceOrientationEvent.requestPermission;
    const viaTap = () => card.addEventListener('click', () => {
      ask.call(window.DeviceOrientationEvent).then(r => { if (r === 'granted') listen(); }).catch(() => {});
    }, { once: true });
    /* Chrome grants it without asking; Safari refuses outside a tap, and
       then the first touch of the card asks */
    if (typeof ask !== 'function') listen();
    else ask.call(window.DeviceOrientationEvent).then(r => { r === 'granted' ? listen() : viaTap(); }, viaTap);
  }
  card.addEventListener('click', e => { if (!e.target.closest('a')) flip(); });
  flipBtn && flipBtn.addEventListener('click', flip);
  takeBtn && takeBtn.addEventListener('click', () => {
    const v = ['BEGIN:VCARD', 'VERSION:3.0', 'N:Jain;Aryan;;;', 'FN:Aryan Jain',
      'TITLE:Builder · B.Tech CSE student', 'ORG:IIIT Naya Raipur',
      'EMAIL;TYPE=INTERNET:aryanjain281005@gmail.com',
      'URL:https://aryanjain.rocks',
      'URL;TYPE=GitHub:https://github.com/aryanjain281005',
      'URL;TYPE=LinkedIn:https://www.linkedin.com/in/aryan-jain-256465382/',
      'NOTE:Open to internships where technology meets business.', 'END:VCARD'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([v], { type: 'text/vcard' }));
    a.download = 'Aryan-Jain.vcf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    takeBtn.querySelector('span').textContent = 'Card taken — thank you';
  });
})();

/* ------------------------------------------------------------- 御神籤 */
(function omikuji() {
  const root = document.getElementById('omikuji'); if (!root) return;
  const box = root.querySelector('.omi-box'), slip = root.querySelector('.omi-slip');
  const NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const RANK = { '大吉': 'Great blessing', '中吉': 'Middle blessing', '吉': 'Blessing', '小吉': 'Small blessing', '末吉': 'Blessing still to come' };
  const F = [
    ['大吉', 'A Google Form will become a business. Validate before you build.', 'Ship the smallest version first.'],
    ['中吉', 'The chore you automate today buys back every tomorrow.', 'If you did it twice by hand, wire it.'],
    ['吉', 'Your fear of classes will dissolve into a game of Snake.', 'Build, break, fix, understand.'],
    ['小吉', 'A bug you fixed yourself is a line you can explain forever.', 'Ship only what you understand.'],
    ['末吉', 'Cleaning takes two days. Training takes two minutes.', 'Respect the preprocessing.'],
    ['大吉', 'A hard problem tonight is a good night’s sleep postponed.', 'Upsolve it tomorrow.'],
    ['吉', 'Somewhere a child reads a little better because someone built for them.', 'Build for real people.'],
    ['中吉', 'You will meet a builder who answers every email.', '<a href="mailto:aryanjain281005@gmail.com">Write to him today.</a>'],
    ['大吉', 'An internship is in the near future of the right builder.', '<a href="#contact">Take his card.</a>'],
    ['小吉', 'Your secrets are safe at last: the keys are in .env now.', 'Check your .gitignore.']
  ];
  let last = -1, busy = false;
  const draw = () => {
    if (busy) return; busy = true;
    let n; do { n = Math.floor(Math.random() * F.length); } while (n === last); last = n;
    const f = F[n];
    slip.classList.remove('in');
    box.classList.remove('drawn');
    const reveal = () => {
      root.querySelector('.omi-no').textContent = '第' + NUM[n] + '番';
      root.querySelector('.omi-rank').textContent = f[0];
      root.querySelector('.omi-rank-en').textContent = RANK[f[0]];
      root.querySelector('.omi-text').textContent = f[1];
      root.querySelector('.omi-advice').innerHTML = 'Advice — ' + f[2];
      slip.hidden = false; void slip.offsetWidth; slip.classList.add('in'); buzz(22);
      busy = false;
    };
    if (REDUCE) { box.classList.add('drawn'); reveal(); return; }
    box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    buzz([14, 60, 14, 60, 14, 60, 14]);
    setTimeout(() => { box.classList.add('drawn'); }, 820);
    setTimeout(reveal, 1350);
  };
  box.addEventListener('click', draw);
  root.querySelector('.omi-again').addEventListener('click', draw);
})();
})();
