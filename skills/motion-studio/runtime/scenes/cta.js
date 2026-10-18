// End card: headline, button, animated cursor click, URL.
// props: title, sub, button, url, logo (text/emoji or image path), eyebrow
// plan.py sets props._click_at so the click sound lands on the press.
export function create({ el, props, theme, box, util, vertical, asset }) {
  const { h, prog, ease, spring, clamp, lerp, parseRich, fitFont } = util;
  const clickAt = props._click_at ?? 1.5;
  const col = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: box.h * 0.035 + 'px', width: '100%' } });

  let logo = null;
  if (props.logo) {
    logo = /\.(png|jpe?g|svg|webp)$/i.test(props.logo)
      ? h('img', { src: asset(props.logo), style: { height: box.h * 0.1 + 'px' } })
      : h('div', { style: { fontSize: box.h * 0.08 + 'px', lineHeight: 1 } }, props.logo);
    col.append(logo);
  }
  const eyebrow = props.eyebrow ? h('div', { class: 'eyebrow', style: { fontSize: box.w * (vertical ? 0.035 : 0.02) + 'px' } }, props.eyebrow) : null;
  if (eyebrow) col.append(eyebrow);
  const title = h('div', { style: { fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.0, whiteSpace: 'nowrap' } });
  (props.title || 'Get started').split('\n').forEach((ln) => {
    const d = h('div');
    parseRich(ln).forEach((tk) => d.append(h('span', { class: tk.accent ? 'accent' : '' }, tk.w + ' ')));
    title.append(d);
  });
  col.append(title);
  const sub = props.sub ? h('div', { class: 'muted', style: { fontWeight: 500, fontSize: box.w * (vertical ? 0.045 : 0.026) + 'px' } }, props.sub) : null;
  if (sub) col.append(sub);

  const btnFont = box.w * (vertical ? 0.055 : 0.03);
  const shine = h('span', { style: { position: 'absolute', top: 0, bottom: 0, width: '30%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.55), transparent)', transform: 'skewX(-20deg)' } });
  const btn = h('div', { style: { position: 'relative', overflow: 'hidden', fontSize: btnFont + 'px', fontWeight: 800, padding: '0.8em 1.6em', borderRadius: '999px', color: theme.bg, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2 || theme.accent})`, boxShadow: `0 20px 60px ${theme.accent}66` } }, shine, h('span', { style: { position: 'relative' } }, props.button || 'Download free'));
  const ripple = h('span', { style: { position: 'absolute', left: '50%', top: '50%', width: '20px', height: '20px', margin: '-10px', borderRadius: '50%', border: `4px solid ${theme.accent}`, opacity: 0 } });
  const btnWrap = h('div', { style: { position: 'relative' } }, btn, ripple);
  col.append(btnWrap);
  const url = props.url ? h('div', { style: { fontFamily: 'var(--mono)', fontWeight: 600, fontSize: btnFont * 0.62 + 'px', color: 'var(--fg)', opacity: 0.85 } }, props.url) : null;
  if (url) col.append(url);
  el.append(col);
  fitFont(title, box.w, box.h * 0.3, 20, box.w * (vertical ? 0.15 : 0.11));

  const cursor = h('svg', { viewBox: '0 0 24 24', width: btnFont * 1.5, height: btnFont * 1.5, style: { position: 'absolute', left: '50%', top: '50%', zIndex: 3, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.5))' } },
    h('path', { d: 'M4 2l16 9.5-7 1.6 4 7.4-3 1.5-4-7.5L4 19z', fill: '#fff', stroke: '#111', 'stroke-width': 1.2, 'stroke-linejoin': 'round' }));
  btnWrap.append(cursor);

  return {
    update(t) {
      if (logo) logo.style.transform = `scale(${spring(t, { freq: 1.6, damping: 0.5 })})`;
      if (eyebrow) eyebrow.style.opacity = prog(t, 0.05, 0.4);
      const tp = prog(t, 0.1, 0.7, ease.outExpo);
      title.style.opacity = tp;
      title.style.transform = `translateY(${(1 - tp) * 30}%)`;
      if (sub) sub.style.opacity = prog(t, 0.4, 0.5);
      const bs = spring(t - 0.45, { freq: 1.8, damping: 0.5 });
      const press = 1 - 0.08 * Math.max(0, 1 - Math.abs(t - clickAt) * 9);
      btn.style.transform = `scale(${bs * press})`;
      btn.style.opacity = clamp((t - 0.45) * 6);
      const sh = ((t - 0.8) % 2.2) / 0.9;
      shine.style.left = (t > 0.8 && sh <= 1 ? lerp(-40, 130, sh) : -60) + '%';
      // cursor glides in from the lower right and clicks
      const mp = prog(t, clickAt - 0.75, 0.7, ease.inOutCubic);
      cursor.style.transform = `translate(${lerp(box.w * 0.35, 4, mp)}px, ${lerp(box.h * 0.22, 4, mp)}px) scale(${t > clickAt - 0.05 && t < clickAt + 0.12 ? 0.85 : 1})`;
      cursor.style.opacity = clamp((t - (clickAt - 0.8)) * 5) * (1 - prog(t, clickAt + 0.9, 0.4));
      const rp = clamp((t - clickAt) / 0.6);
      ripple.style.opacity = t >= clickAt ? (1 - rp) : 0;
      ripple.style.transform = `scale(${1 + rp * 22})`;
      if (url) {
        const q = prog(t, clickAt + 0.15, 0.5);
        url.style.opacity = 0.85 * q;
        url.style.transform = `translateY(${(1 - q) * 20}px)`;
      }
    },
  };
}
