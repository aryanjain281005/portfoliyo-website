/* =====================================================================
   SOUND — the score for the walk.

   One piece, edited for the page: trimmed, taken down to a background level
   (−17 LUFS), the brittle top softened, and it loops by crossfading its own
   ending into its opening over six seconds rather than cutting.

   It starts the moment it is asked for. The file is fetched (at low
   priority) and decoded while the preloader is still building the world, so
   "Enter with sound" usually finds it ready. If it is not — a slow network,
   or sound switched on before the download finished — the piece starts at
   once as a stream, and the decoded copy takes over at the first loop.
   Choosing silence cancels the download.

   While the field notes are open the music steps back and goes muffled, as
   if heard through the paper screens; when the tab is hidden it fades and
   the context sleeps.
   ===================================================================== */
(function () {
'use strict';
const SRC = 'assets/audio/wano-night.m4a';
const VOL = .55, XF = 6, RATE = 44100;
let ctx = null, master = null, tone = null, buf = null, loading = null, abort = null;
let on = false, ducked = false, cycleTimer = null, live = [], stream = null;

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  /* iOS plays Web Audio through the ringer channel unless told otherwise,
     so the silent switch would mute the walk */
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  ctx = new AC();
  tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 18000; tone.Q.value = .4;
  master = ctx.createGain(); master.gain.value = 0;
  tone.connect(master); master.connect(ctx.destination);
  return true;
}
/* decoding needs no user gesture and no live context: an offline one does
   it off the main thread, and the buffer plays in any context */
function decoder() {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  return ctx || (OAC ? new OAC(2, 1, RATE) : null);
}
function load() {
  if (loading) return loading;
  const d = decoder(); if (!d) return Promise.reject(new Error('no audio'));
  abort = window.AbortController ? new AbortController() : null;
  loading = fetch(SRC, { priority: 'low', signal: abort && abort.signal })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(a => new Promise((res, rej) => d.decodeAudioData(a, res, rej)))
    .then(b => { buf = b; abort = null; if (on && ctx) handOver(); return b; });
  loading.catch(() => { loading = null; });
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
/* not decoded yet: play the file as a stream, which needs only its first
   few hundred kilobytes */
function startStream() {
  const el = new Audio();
  el.preload = 'auto'; el.src = SRC;
  const g = ctx.createGain(); g.gain.value = 1;
  ctx.createMediaElementSource(el).connect(g); g.connect(tone);
  stream = { el: el, g: g };
  el.addEventListener('ended', () => { if (stream && stream.el === el) stream = null; });
  const p = el.play(); p && p.catch(() => {});
}
/* the decoded copy takes over where the stream's own pass ends, with the
   same crossfade the loop uses everywhere else */
function handOver() {
  if (live.length) return;
  if (!stream) { cycle(ctx.currentTime + .03, true); return; }
  const el = stream.el, g = stream.g;
  const go = () => {
    const left = (el.duration || buf.duration) - el.currentTime;
    const at = ctx.currentTime + Math.max(.05, left - XF);
    g.gain.setValueAtTime(1, at);
    g.gain.linearRampToValueAtTime(0, at + Math.min(XF, Math.max(.05, left)));
    cycle(at, false);
    setTimeout(() => { el.pause(); el.removeAttribute('src'); el.load(); }, (at - ctx.currentTime + XF + .5) * 1000);
  };
  isFinite(el.duration) ? go() : el.addEventListener('loadedmetadata', go, { once: true });
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
  if (buf) handOver();
  else if (!live.length && !stream) { startStream(); load().catch(() => {}); }
  /* a quick swell, not a slow one: the first note should be heard */
  apply(.45);
}
function disable() {
  on = false; mark();
  if (!ctx) return;
  apply(1.1);
  setTimeout(() => { if (!on && ctx && ctx.state === 'running') ctx.suspend(); }, 1200);
}
function toggle() { on ? disable() : enable(); }
/* "Enter in silence": stop spending the visitor's data on a file they
   declined; the nav toggle starts it again (as a stream) if they change
   their mind */
function decline() { if (abort && !buf) { abort.abort(); abort = null; loading = null; } }

document.addEventListener('fieldnotes', e => { ducked = !!(e.detail && e.detail.open); apply(.8); });
document.addEventListener('visibilitychange', () => {
  if (!ctx || !on) return;
  if (document.hidden) { ramp(master.gain, 0, .4); setTimeout(() => document.hidden && ctx.suspend(), 450); }
  else { ctx.resume(); apply(1.4); }
});
document.querySelectorAll('[data-sound-toggle]').forEach(b => b.addEventListener('click', toggle));
/* the preloader is up while this runs: start the download behind it */
if (!/[?&](shot|silent)\b/.test(location.search)) load().catch(() => {});
window.SOUND = { enable: enable, disable: disable, toggle: toggle, decline: decline, get on() { return on; }, get ready() { return !!buf; },
  get playing() { return live.length ? 'buffer' : stream && !stream.el.paused ? 'stream@' + stream.el.currentTime.toFixed(2) : 'none'; } };
})();
