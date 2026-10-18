// Shared helpers for scenes. Everything here is pure: the same input always
// gives the same output, which is what makes frame-by-frame rendering exact.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => {
    const s = 1.70158;
    return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  },
};

/** Damped spring from 0 to 1. t in seconds. Overshoots when damping < 1. */
export function spring(t, { freq = 1.6, damping = 0.6 } = {}) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  const z = damping;
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w * t) * (1 + w * t);
}

/** Eased 0..1 progress of an animation that starts at `start` and lasts `dur`. */
export function prog(t, start, dur, fn = ease.outCubic) {
  if (dur <= 0) return t >= start ? 1 : 0;
  return fn(clamp((t - start) / dur));
}

/** Deterministic pseudo-random number in [0,1) from an integer seed. */
export function rand(seed) {
  let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export function hexToRgb(hex) {
  let h = String(hex).replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex, a = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Tiny DOM builder: h('div', {class:'x', style:{...}}, 'text', childEl) */
export function h(tag, props = {}, ...children) {
  const svgTags = ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'g', 'defs', 'linearGradient', 'stop'];
  const el = svgTags.includes(tag)
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null) continue;
    if (k === 'style') Object.assign(el.style, v);
    else if (k === 'class') el.setAttribute('class', v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/**
 * Parse "Type *one prompt* and go" into tokens [{w:'Type'}, {w:'one', accent:true}, ...].
 * Text inside *asterisks* is the accent (highlighted) part.
 */
export function parseRich(line) {
  const out = [];
  const re = /\*([^*]+)\*|([^\s*]+)/g;
  let m;
  while ((m = re.exec(String(line)))) {
    if (m[1]) m[1].split(/\s+/).filter(Boolean).forEach((w) => out.push({ w, accent: true }));
    else out.push({ w: m[2], accent: false });
  }
  return out;
}

/** Largest font size (px) at which `el` fits inside maxW x maxH. */
export function fitFont(el, maxW, maxH, min = 12, max = 400) {
  let lo = min;
  let hi = max;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    el.style.fontSize = mid + 'px';
    const fits = el.scrollWidth <= maxW && el.scrollHeight <= maxH;
    if (fits) lo = mid;
    else hi = mid;
  }
  el.style.fontSize = lo + 'px';
  return lo;
}

export const util = { clamp, lerp, invLerp, ease, spring, prog, rand, rgba, hexToRgb, h, parseRich, fitFont };
