// Scene transitions. Each type returns CSS for the incoming scene (in) and the
// outgoing scene (out) at eased progress p (0 -> 1). The incoming scene is
// always drawn on top.

const tx = (x) => `translate3d(${x}%,0,0)`;
const ty = (y) => `translate3d(0,${y}%,0)`;

export const TRANSITIONS = {
  cut: { in: () => ({}), out: (p) => ({ opacity: p > 0 ? 0 : 1 }) },
  fade: { in: (p) => ({ opacity: p }), out: (p) => ({ opacity: 1 - p }) },
  'slide-left': { in: (p) => ({ transform: tx((1 - p) * 100) }), out: (p) => ({ transform: tx(-p * 100) }) },
  'slide-right': { in: (p) => ({ transform: tx(-(1 - p) * 100) }), out: (p) => ({ transform: tx(p * 100) }) },
  'slide-up': { in: (p) => ({ transform: ty((1 - p) * 100) }), out: (p) => ({ transform: ty(-p * 100) }) },
  'slide-down': { in: (p) => ({ transform: ty(-(1 - p) * 100) }), out: (p) => ({ transform: ty(p * 100) }) },
  push: {
    in: (p) => ({ transform: `${ty((1 - p) * 100)} scale(${0.9 + 0.1 * p})` }),
    out: (p) => ({ transform: `${ty(-p * 35)} scale(${1 - 0.12 * p})`, opacity: 1 - p * 0.7 }),
  },
  zoom: {
    in: (p) => ({ transform: `scale(${0.82 + 0.18 * p})`, opacity: p }),
    out: (p) => ({ transform: `scale(${1 + 0.3 * p})`, opacity: 1 - p }),
  },
  whip: {
    in: (p) => ({ transform: tx((1 - p) * 100), filter: `blur(${Math.sin(p * Math.PI) * 28}px)` }),
    out: (p) => ({ transform: tx(-p * 100), filter: `blur(${Math.sin(p * Math.PI) * 28}px)` }),
  },
  blur: {
    in: (p) => ({ opacity: p, filter: `blur(${(1 - p) * 30}px)` }),
    out: (p) => ({ opacity: 1 - p, filter: `blur(${p * 30}px)` }),
  },
  iris: { in: (p) => ({ clipPath: `circle(${p * 80}% at 50% 50%)` }), out: (p) => ({ transform: `scale(${1 + 0.08 * p})` }) },
  wipe: { in: (p) => ({ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }), out: (p) => ({ transform: tx(-p * 12) }) },
  'wipe-up': { in: (p) => ({ clipPath: `inset(${(1 - p) * 100}% 0 0 0)` }), out: (p) => ({ transform: ty(-p * 12) }) },
};

export const TRANSITION_NAMES = Object.keys(TRANSITIONS);

/** Merge several style objects: transforms concatenate, opacity multiplies, filters join. */
export function mergeStyles(...styles) {
  const out = { transform: '', opacity: 1, filter: '', clipPath: '' };
  for (const s of styles) {
    if (!s) continue;
    if (s.transform) out.transform += ' ' + s.transform;
    if (s.opacity != null) out.opacity *= s.opacity;
    if (s.filter) out.filter += ' ' + s.filter;
    if (s.clipPath) out.clipPath = s.clipPath;
  }
  return out;
}
