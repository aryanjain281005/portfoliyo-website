/* =====================================================================
   SOUND — the score for the walk.

   One piece, edited for the page: trimmed, taken down to a background level
   (−17 LUFS), the brittle top softened, and it loops by crossfading its own
   ending into its opening over six seconds rather than cutting.

   Nothing is fetched until someone asks for sound. The context is created
   inside that click, as every browser requires. While the field notes are
   open the music steps back and goes muffled, as if heard through the paper
   screens; when the tab is hidden it fades and the context sleeps.
   ===================================================================== */
(function () {
'use strict';
const SRC = 'assets/audio/wano-night.m4a';
const VOL = .55, XF = 6;
let ctx = null, master = null, tone = null, buf = null, loading = null;
let on = false, ducked = false, cycleTimer = null, live = [];

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 18000; tone.Q.value = .4;
  master = ctx.createGain(); master.gain.value = 0;
  tone.connect(master); master.connect(ctx.destination);
  return true;
}
function load() {
  if (!loading) loading = fetch(SRC)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(a => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej)))
    .then(b => { buf = b; return b; });
  return loading;
}
/* one pass through the piece; the next is scheduled to overlap its tail */
function cycle(at, first) {
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = buf; s.connect(g); g.connect(tone);
  const d = buf.duration;
  g.gain.setValueAtTime(first ? 1 : 0, at);
  if (!first) g.gain.linearRampToValueAtTime(1, at + XF);
  g.gain.setValueAtTime(1, at + d - XF);
  g.gain.linearRampToValueAtTime(0, at + d);
  s.start(at); s.stop(at + d + .05);
  live.push(s);
  s.onended = () => { live = live.filter(x => x !== s); };
  const next = at + d - XF;
  clearTimeout(cycleTimer);
  cycleTimer = setTimeout(() => { if (ctx) cycle(next, false); }, Math.max(0, (next - ctx.currentTime - 2) * 1000));
}
function ramp(param, v, t) {
  const now = ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(v, now + t);
}
function level() { return on ? (ducked ? VOL * .42 : VOL) : 0; }
function apply(t) {
  if (!ctx) return;
  ramp(master.gain, level(), t);
  ramp(tone.frequency, ducked ? 1500 : 18000, t);
}
function mark() {
  document.documentElement.classList.toggle('sound-on', on);
  document.querySelectorAll('[data-sound-toggle]').forEach(b => {
    b.setAttribute('aria-pressed', String(on));
    const l = b.querySelector('[data-sound-label]'); if (l) l.textContent = on ? 'Sound on' : 'Sound off';
  });
  try { localStorage.setItem('aj-sound', on ? '1' : '0'); } catch (e) {}
}
function enable() {
  if (!ensure()) return;
  on = true; mark();
  ctx.resume && ctx.resume();
  load().then(() => {
    if (!live.length) cycle(ctx.currentTime + .05, true);
    apply(2.4);
  }).catch(() => { on = false; mark(); });
}
function disable() {
  on = false; mark();
  if (!ctx) return;
  apply(1.1);
  setTimeout(() => { if (!on && ctx && ctx.state === 'running') ctx.suspend(); }, 1200);
}
function toggle() { on ? disable() : enable(); }

document.addEventListener('fieldnotes', e => { ducked = !!(e.detail && e.detail.open); apply(.8); });
document.addEventListener('visibilitychange', () => {
  if (!ctx || !on) return;
  if (document.hidden) { ramp(master.gain, 0, .4); setTimeout(() => document.hidden && ctx.suspend(), 450); }
  else { ctx.resume(); apply(1.4); }
});
document.querySelectorAll('[data-sound-toggle]').forEach(b => b.addEventListener('click', toggle));
window.SOUND = { enable: enable, disable: disable, toggle: toggle, get on() { return on; } };
})();
