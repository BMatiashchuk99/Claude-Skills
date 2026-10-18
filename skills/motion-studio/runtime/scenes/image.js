// Image or screenshot with an optional device frame and a Ken Burns move.
// props: src (project-relative path), frame ('none'|'browser'|'phone'|'card'), fit ('cover'|'contain'),
//        title, caption, kenburns (true), zoom (1.12)
export async function create({ el, props, theme, box, util, vertical, asset, duration }) {
  const { h, prog, ease, spring, clamp, lerp, parseRich } = util;
  const frame = props.frame || 'card';
  const img = h('img', { src: asset(props.src), style: { display: 'block', width: '100%', height: '100%', objectFit: props.fit || 'cover', transformOrigin: props.origin || '50% 40%' } });
  try { await img.decode(); } catch (e) { console.warn('image failed to load', props.src); }

  const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 16 / 9;
  let w = box.w * (frame === 'phone' ? 0.62 : 1);
  let hgt = w / (frame === 'phone' ? 9 / 19.5 : ratio);
  const maxH = box.h * (props.title || props.caption ? 0.7 : 0.9);
  if (hgt > maxH) { hgt = maxH; w = hgt * (frame === 'phone' ? 9 / 19.5 : ratio); }

  const viewport = h('div', { style: { position: 'relative', overflow: 'hidden', width: '100%', height: '100%' } }, img);
  let frameEl;
  if (frame === 'browser') {
    const bar = h('div', { style: { height: hgt * 0.07 + 'px', background: '#1c1f26', display: 'flex', alignItems: 'center', gap: hgt * 0.015 + 'px', padding: `0 ${hgt * 0.03}px` } },
      ...['#ff5f57', '#febc2e', '#28c840'].map((c) => h('span', { style: { width: hgt * 0.022 + 'px', height: hgt * 0.022 + 'px', borderRadius: '50%', background: c } })),
      h('div', { style: { flex: 1, height: '52%', marginLeft: hgt * 0.03 + 'px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)' } }));
    frameEl = h('div', { class: 'card', style: { width: w + 'px', height: hgt * 1.07 + 'px', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }, bar, h('div', { style: { flex: 1, position: 'relative' } }, viewport));
  } else if (frame === 'phone') {
    frameEl = h('div', { style: { width: w + 'px', height: hgt + 'px', padding: w * 0.035 + 'px', background: '#0b0c0f', borderRadius: w * 0.16 + 'px', boxShadow: '0 40px 100px rgba(0,0,0,.5), inset 0 0 0 2px rgba(255,255,255,.12)' } },
      h('div', { style: { width: '100%', height: '100%', borderRadius: w * 0.13 + 'px', overflow: 'hidden', position: 'relative' } }, viewport));
  } else if (frame === 'none') {
    frameEl = h('div', { style: { width: w + 'px', height: hgt + 'px' } }, viewport);
  } else {
    frameEl = h('div', { class: 'card', style: { width: w + 'px', height: hgt + 'px', overflow: 'hidden' } }, viewport);
  }

  const col = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: box.h * 0.03 + 'px', perspective: '1800px' } });
  let title = null;
  if (props.title) {
    title = h('div', { style: { fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.02, fontSize: Math.min(box.w * (vertical ? 0.1 : 0.06), 140) + 'px' } });
    parseRich(props.title).forEach((tk) => title.append(h('span', { class: tk.accent ? 'accent' : '' }, tk.w + ' ')));
    col.append(title);
  }
  col.append(frameEl);
  let cap = null;
  if (props.caption) {
    cap = h('div', { class: 'muted', style: { fontWeight: 600, fontSize: box.w * (vertical ? 0.045 : 0.025) + 'px' } }, props.caption);
    col.append(cap);
  }
  el.append(col);
  const zoom = props.zoom ?? 1.12;

  return {
    update(t) {
      const s = spring(t, { freq: 1.2, damping: 0.7 });
      frameEl.style.transform = `translateY(${(1 - s) * 18}%) rotateX(${(1 - s) * 22}deg) scale(${0.9 + 0.1 * s})`;
      frameEl.style.opacity = clamp(t * 4);
      if (props.kenburns !== false) {
        const p = ease.inOutSine(clamp(t / Math.max(0.5, duration)));
        img.style.transform = `scale(${lerp(1, zoom, p)}) translate(${lerp(0, props.pan_x ?? -2, p)}%, ${lerp(0, props.pan_y ?? -2, p)}%)`;
      }
      if (title) {
        const p = prog(t, 0.1, 0.6, ease.outExpo);
        title.style.opacity = p;
        title.style.transform = `translateY(${(1 - p) * 40}px)`;
      }
      if (cap) cap.style.opacity = prog(t, 0.6, 0.5);
    },
  };
}
