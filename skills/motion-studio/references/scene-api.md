# Custom scene API

A scene is an ES module in the project that exports `create(ctx)` and returns
`{ update(t) }`. `create` builds the DOM once; `update(t)` sets every style for local
time `t` (seconds since the scene started, may be negative during the entering
transition or past the end during the exit). The renderer screenshots after each
`update`, so the result must depend **only** on `t`.

Never use CSS transitions/animations, `setTimeout`, `setInterval`,
`requestAnimationFrame`, `Date.now()` or `Math.random()` (use `util.rand(seed)`).

## ctx
| key | |
|---|---|
| `el` | content container (flex column, centered, already padded to the safe area) |
| `sceneEl` | the whole scene element (for full-bleed layers) |
| `props` | the scene's `props` from the storyboard |
| `theme` | resolved theme (`bg fg muted accent accent2 card font mono ...`) |
| `W`, `H`, `fps`, `vertical` | frame size |
| `box` | `{w, h}` usable area inside the safe margins |
| `safe` | `{top, bottom, side}` margins in px (bottom leaves room for captions) |
| `duration` | scene length in seconds |
| `asset(path)` | URL for a project-relative file (`assets/logo.png`) |
| `util` | `h, ease, spring, prog, clamp, lerp, rand, rgba, parseRich, fitFont` |

`util.prog(t, start, dur, ease.outExpo)` → eased 0..1.
`util.spring(t - start, {freq, damping})` → springy 0..1 (overshoots).
`util.h(tag, {class, style}, ...children)` → element (SVG tags supported).
`util.fitFont(el, maxW, maxH, min, max)` → sets the largest font size that fits.
`create` may be `async` (e.g. to `await img.decode()`). Three.js: `import * as THREE from '/vendor/three.module.js'`.

## Example: orbiting badges
```js
// scenes/orbit.js
export function create({ el, props, theme, box, util }) {
  const { h, prog, spring, ease } = util;
  const center = h('div', { style: { fontSize: box.w * 0.12 + 'px', fontWeight: 900 } }, props.title || 'Core');
  const ring = h('div', { style: { position: 'relative', width: box.w * 0.8 + 'px', height: box.w * 0.8 + 'px', display: 'grid', placeItems: 'center' } }, center);
  const items = (props.items || []).map((txt) => {
    const b = h('div', { class: 'card', style: { position: 'absolute', left: '50%', top: '50%', padding: '0.5em 0.9em', fontWeight: 700, fontSize: box.w * 0.045 + 'px', color: theme.accent } }, txt);
    ring.append(b);
    return b;
  });
  el.append(ring);
  return {
    update(t) {
      center.style.transform = `scale(${spring(t, { freq: 1.6, damping: 0.5 })})`;
      items.forEach((b, i) => {
        const a = (i / items.length) * Math.PI * 2 + t * 0.6;
        const r = box.w * 0.36 * prog(t, 0.2 + i * 0.1, 0.8, ease.outExpo);
        b.style.transform = `translate(-50%,-50%) translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px)`;
        b.style.opacity = prog(t, 0.2 + i * 0.1, 0.3);
      });
    },
  };
}
```
```json
{ "id": "ecosystem", "type": "custom", "module": "scenes/orbit.js",
  "narration": "Everything plugs into one core.", "props": { "title": "Core", "items": ["API", "CLI", "SDK", "Web"] } }
```
Always run `build.py --stills` after writing a custom scene and look at the frames.
