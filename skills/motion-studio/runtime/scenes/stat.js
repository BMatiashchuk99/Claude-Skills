// Big animated number that counts up, with an optional progress bar.
// props: value, from (0), prefix, suffix, decimals, label, sub, eyebrow, bar (0..1)
// plan.py sets props._count_start / props._count_dur so sound effects line up.
export function create({ el, props, theme, box, util }) {
  const { h, fitFont, prog, ease, spring, clamp } = util;
  const value = Number(props.value ?? 100);
  const from = Number(props.from ?? 0);
  const decimals = props.decimals ?? (Number.isInteger(value) ? 0 : 1);
  const fmt = new Intl.NumberFormat(props.locale || 'en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const c0 = props._count_start ?? 0.15;
  const cd = props._count_dur ?? 1.3;

  const eyebrow = props.eyebrow ? h('div', { class: 'eyebrow' }, props.eyebrow) : null;
  const num = h('div', { style: { fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } });
  const pre = h('span', { class: 'accent' }, props.prefix || '');
  const digits = h('span', {}, fmt.format(value));
  const suf = h('span', { class: 'accent' }, props.suffix || '');
  num.append(pre, digits, suf);
  const label = props.label ? h('div', { style: { fontWeight: 800, letterSpacing: '-0.02em' } }, props.label) : null;
  const sub = props.sub ? h('div', { class: 'muted', style: { fontWeight: 500 } }, props.sub) : null;
  let track = null;
  let fill = null;
  if (props.bar != null) {
    fill = h('div', { style: { position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2 || theme.accent})`, transformOrigin: '0 50%', borderRadius: '99px' } });
    track = h('div', { style: { position: 'relative', width: '80%', height: box.h * 0.018 + 'px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' } }, fill);
  }
  const col = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: box.h * 0.025 + 'px', width: '100%' } });
  [eyebrow, num, label, track, sub].forEach((x) => x && col.append(x));
  el.append(col);

  const size = fitFont(num, box.w * 0.95, box.h * 0.4, 40, box.w * 0.42);
  if (eyebrow) eyebrow.style.fontSize = Math.max(18, size * 0.13) + 'px';
  if (label) label.style.fontSize = Math.min(size * 0.28, box.w * 0.085) + 'px';
  if (sub) sub.style.fontSize = Math.min(size * 0.17, box.w * 0.05) + 'px';

  return {
    update(t) {
      const p = prog(t, c0, cd, ease.outExpo);
      digits.textContent = fmt.format(from + (value - from) * p);
      const s = spring(t, { freq: 1.6, damping: 0.55 });
      const bump = 1 + 0.06 * Math.max(0, 1 - Math.abs(t - (c0 + cd)) * 5);
      num.style.transform = `scale(${(0.6 + 0.4 * s) * bump})`;
      num.style.opacity = clamp(t * 6);
      if (eyebrow) eyebrow.style.opacity = prog(t, 0, 0.4);
      if (label) {
        const q = prog(t, c0 + 0.3, 0.5);
        label.style.opacity = q;
        label.style.transform = `translateY(${(1 - q) * 30}px)`;
      }
      if (fill) fill.style.transform = `scaleX(${clamp(props.bar) * prog(t, c0, cd, ease.outExpo)})`;
      if (track) track.style.opacity = prog(t, c0 - 0.1, 0.3);
      if (sub) {
        const q = prog(t, c0 + 0.6, 0.5);
        sub.style.opacity = q;
        sub.style.transform = `translateY(${(1 - q) * 20}px)`;
      }
    },
  };
}
