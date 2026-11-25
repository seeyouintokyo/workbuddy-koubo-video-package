/* Screen-recording engine: the recording (with the speaker's own webcam bubble, if any) is the main shot; motion lives on the dock, overlays and the card's push-in.
   Every value is a pure function of output time; scene and subtitle times are source seconds. */
const {edl, frames, fps, framesDir, beat} = DATA;
let acc = 0;
const segs = edl.map(([a, b]) => { const s = {a, b, o: acc}; acc += b - a; return s; });
const TOTAL = acc;
const S = (t) => { for (const s of segs) { if (t <= s.b) return s.o + Math.max(0, t - s.a); } return TOTAL; };
const clamp = (p) => Math.min(1, Math.max(0, p));
const ease = (p) => 1 - Math.pow(1 - clamp(p), 3);
const inout = (p) => { p = clamp(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const back = (p, c = 1.8) => { const x = clamp(p) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
const lerp = (a, b, p) => a + (b - a) * p;
const settle = (d, f, k) => d <= 0 ? 0 : Math.exp(-k * d) * Math.sin(2 * Math.PI * f * d);
const $ = (id) => document.getElementById(id);
const dock = $('dock'), fulls = $('fulls'), simg = $('simg'), screen = $('screen');
const SUBS = SUBS_SRC.map(([a, b, t]) => ({a: S(a), b: S(b), t}));

const kindOf = (el) => el.classList.contains('slam') ? 'slam' : el.classList.contains('chip') ? 'chip'
  : el.classList.contains('card') ? 'card' : el.parentElement && el.parentElement.classList.contains('ticks') ? 'row' : 'pop';
SCENES.forEach((s, n) => {
  s.o = S(s.at); s.end = n + 1 < SCENES.length ? S(SCENES[n + 1].at) : TOTAL;
  s.del = Object.assign(document.createElement('div'), {className: 'scene', innerHTML: s.dock || ''});
  s.fel = Object.assign(document.createElement('div'), {className: 'full', innerHTML: s.full || s.over || ''});
  if (!s.full) s.fel.style.background = 'transparent';
  dock.appendChild(s.del); fulls.appendChild(s.fel);
  const all = [...s.del.querySelectorAll('[data-t]'), ...s.fel.querySelectorAll('[data-t]')];
  s.items = all.map((el, i) => ({el, o: S(+el.dataset.t), kind: kindOf(el), side: i % 2 ? 1 : -1, base: el.style.transform || ''}));
  s.draws = [...s.del.querySelectorAll('[data-draw]')].map((el) => { const [a, d] = el.dataset.draw.split(','); const L = el.getTotalLength ? el.getTotalLength() : 3000; return {el, o: S(+a), d: +d, L}; });
});
const CHAPTERS = SCENES.filter((s, n) => s.ch && (n === 0 || SCENES[n - 1].ch !== s.ch)).map((s) => ({o: s.o, num: s.ch.slice(0, 2), name: s.ch.slice(3)}));
const WIPES = SCENES.slice(1).filter((s, n) => !!s.full !== !!SCENES[n].full && !CHAPTERS.some((c) => Math.abs(c.o - s.o) < 1e-6)).map((s) => s.o);
const KEYS = SCENES.flatMap((s) => s.items.filter((i) => i.kind === 'slam').map((i) => i.o));

function reveal(it, t) {
  const x = t - it.o, el = it.el, b = it.base;
  if (x < 0) { el.style.opacity = 0; return; }
  if (it.kind === 'slam') {
    const q = clamp(x / 0.16), s = q < 1 ? lerp(2.2, 1, ease(q)) : 1 + 0.06 * settle(x - 0.16, 3.2, 7);
    el.style.opacity = clamp(x / 0.06); el.style.filter = q < 1 ? `blur(${(1 - q) * 8}px)` : ''; el.style.transform = `${b} scale(${s})`;
  } else if (it.kind === 'chip') {
    const q = clamp(x / 0.26); el.style.opacity = clamp(x / 0.05);
    el.style.transform = `${b} scale(${lerp(1.9, 1, back(q, 1.6))}) rotate(${lerp(it.side * 9, 0, ease(q))}deg)`;
  } else if (it.kind === 'card') {
    const q = clamp(x / 0.34); el.style.opacity = 1; el.style.transform = `${b} translateY(${(1 - back(q, 1.2)) * 260}px) rotate(${(1 - ease(q)) * it.side * 4}deg)`;
  } else if (it.kind === 'row') {
    const q = clamp(x / 0.3); el.style.opacity = 1; el.style.transform = `translateX(${(1 - back(q, 1.3)) * -1100}px)`;
  } else {
    const q = ease(x / 0.22); el.style.opacity = q; el.style.transform = `${b} translateY(${(1 - q) * 30}px) scale(${0.8 + 0.2 * back(clamp(x / 0.22))})`;
  }
}

// Screen card push-in: focus point (cx, cy in the recording) and scale, eased between scenes.
const IW = 948, IH = 1186, CW = 948, CH = 1128;
function place(z) {
  const [cx, cy, s] = z, dw = IW * s, dh = IH * s;
  const ox = Math.min(0, Math.max(CW - dw, CW / 2 - cx * dw)), oy = Math.min(0, Math.max(CH - dh, CH / 2 - cy * dh));
  return [ox, oy, s];
}

window.EVENTS = () => ({
  chapters: CHAPTERS.map((c) => c.o),
  fullcuts: [],
  slams: KEYS,
  pops: SCENES.flatMap((s) => s.items.filter((i) => i.kind !== 'slam' && i.o > s.o + 0.05).map((i) => i.o)),
  wipes: WIPES,
});
window.DURATION = TOTAL; window.FPS = fps;
const pulseAt = (t) => { if (!beat) return 0; const p = beat.period * 2, k = (t - beat.phase) / p; return Math.exp(-(k - Math.floor(k)) * p * 8); };

window.seek = async (t) => {
  const i = Math.min(frames - 1, Math.round(t * fps));
  let cur = 0; SCENES.forEach((s, n) => { if (t >= s.o) cur = n; });
  const scene = SCENES[cur], prev = SCENES[Math.max(0, cur - 1)];
  SCENES.forEach((s, n) => { const v = n === cur ? 'visible' : 'hidden'; s.del.style.visibility = v; s.fel.style.visibility = v; });
  const local = t - scene.o;
  // push-in
  const zp = cur === 0 ? 1 : inout(local / 0.7);
  const A = place(prev.z), Z = place(scene.z);
  const [ox, oy, s] = [0, 1, 2].map((k) => lerp(A[k], Z[k], zp));
  const drift = 1 + 0.015 * clamp(local / Math.max(1, scene.end - scene.o));
  simg.style.transform = `translate(${ox}px,${oy}px) scale(${s * drift})`;
  // impact shake + beat pulse on the materials only (dock and screen card), never the face bubble alone
  let sx = 0, sy = 0;
  for (const k of KEYS) { const d = t - k; if (d >= 0 && d < 0.5) { sx += 14 * settle(d, 9, 9); sy += 10 * settle(d + 0.03, 7, 9); } }
  const pl = pulseAt(t);
  screen.style.transform = `translate(${sx * 0.5}px,${sy * 0.5}px)`;
  dock.style.transform = `translate(${sx}px,${sy}px) scale(${1 + 0.01 * pl})`;
  scene.items.forEach((it) => reveal(it, t));
  scene.draws.forEach(({el, o, d, L}) => { el.style.strokeDasharray = L; el.style.strokeDashoffset = L * (1 - ease((t - o) / d)); });
  $('bg').style.backgroundPosition = `${t * 18}px ${t * 30}px`;
  // header chapter pill
  const ch = scene.ch || '';
  $('chapter').style.display = ch && !scene.full ? 'block' : 'none';
  if (ch) $('chapter').innerHTML = `<i>${ch.slice(0, 2)}</i>${ch.slice(3)}`;
  // wipe between the opening and the screen layout
  let w = null; for (const o of WIPES) { if (t >= o - 0.12 && t < o + 0.14) w = (t - o + 0.12) / 0.26; }
  if (w === null) $('wipe').style.visibility = 'hidden'; else {
    const a = ease(w * 1.9) * 150 - 25, c = ease((w - 0.42) * 1.9) * 150 - 25;
    $('wipe').style.visibility = 'visible'; $('wipe').style.clipPath = `polygon(${c - 25}% 0,${a + 25}% 0,${a - 25}% 100%,${c - 75}% 100%)`;
  }
  // chapter flash
  const cf = CHAPTERS.find((c) => t >= c.o - 0.1 && t < c.o + 0.62);
  const flash = $('flash');
  if (cf) {
    const u = t - cf.o + 0.1, en = ease(u / 0.14), lv = ease((u - 0.56) / 0.16);
    flash.style.visibility = 'visible'; flash.style.transform = `translateX(${(1 - en) * 110 - lv * 110}%) skewX(${(1 - en) * -12 + lv * 12}deg)`;
    $('fnum').textContent = cf.num; $('fname').textContent = cf.name;
    $('fnum').style.transform = `scale(${u < 0.18 ? lerp(1.8, 1, ease(u / 0.18)) : 1 + 0.08 * settle(u - 0.18, 3, 7)})`;
  } else flash.style.visibility = 'hidden';
  // subtitles
  const sub = SUBS.find((x) => t >= x.a && t < x.b), subEl = $('sub');
  const html = sub ? sub.t : '';
  if (subEl.innerHTML !== html) subEl.innerHTML = html;
  subEl.className = sub && sub.t.replace(/<[^>]+>/g, '').length > 12 ? 'long' : '';
  subEl.style.transform = sub ? `scale(${lerp(0.84, 1, back((t - sub.a) / 0.14, 2))})` : '';
  if (typeof TICK === 'function') TICK(t, scene);
  const src = `file://${framesDir}/f_${String(i + 1).padStart(5, '0')}.jpg`, jobs = [];
  if (simg.getAttribute('src') !== src) { simg.src = src; jobs.push(simg.decode()); }
  await Promise.all(jobs);
};
