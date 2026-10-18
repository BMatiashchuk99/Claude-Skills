// Title plus items that appear one by one with an animated icon.
// props: title, eyebrow, items[], icon ('check'|'number'|'arrow'|'dot')
// plan.py sets props._item_times (seconds from scene start) so items land with the voiceover.
export function create({ el, props, theme, box, util, duration }) {
  const { h, fitFont, prog, ease, spring, clamp, parseRich } = util;
  const items = props.items || [];
  const icon = props.icon || 'check';
  const times = props._item_times || items.map((_, i) => 0.45 + i * Math.min(0.55, (duration * 0.6) / Math.max(1, items.length)));

  const col = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%', gap: box.h * 0.022 + 'px' } });
  const eyebrow = props.eyebrow ? h('div', { class: 'eyebrow', style: { textAlign: 'left' } }, props.eyebrow) : null;
  const title = props.title ? h('div', { style: { fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.02, textAlign: 'left' } }) : null;
  if (title) parseRich(props.title).forEach((tk) => title.append(h('span', { class: tk.accent ? 'accent' : '' }, tk.w + ' ')));
  if (eyebrow) col.append(eyebrow);
  if (title) col.append(title);

  const rows = items.map((text, i) => {
    let ic;
    if (icon === 'number') ic = h('div', { style: { fontWeight: 900, color: theme.bg } }, String(i + 1));
    else {
      const d = icon === 'arrow' ? 'M5 12h13M13 6l6 6-6 6' : icon === 'dot' ? 'M12 12h.01' : 'M5 12.5l4.5 4.5L19 7.5';
      ic = h('svg', { viewBox: '0 0 24 24', width: '60%', height: '60%', fill: 'none' },
        h('path', { d, stroke: theme.bg, 'stroke-width': icon === 'dot' ? 9 : 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1 }));
    }
    const badge = h('div', { style: { flex: '0 0 auto', width: '1.6em', height: '1.6em', borderRadius: '50%', background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1em' } }, ic);
    const label = h('div', { style: { fontWeight: 700, lineHeight: 1.18, textAlign: 'left', flex: '1 1 auto' } });
    parseRich(text).forEach((tk) => label.append(h('span', { class: tk.accent ? 'accent' : '' }, tk.w + ' ')));
    const row = h('div', { class: 'card', style: { display: 'flex', alignItems: 'center', gap: '0.7em', padding: '0.6em 0.8em' } }, badge, label);
    col.append(row);
    return { row, badge, path: ic.querySelector ? ic.querySelector('path') : null };
  });
  el.append(col);

  // size: rows share one font size; title gets ~2x
  const rowFont = Math.min(box.w * (box.h > box.w ? 0.058 : 0.034), (box.h * 0.6) / Math.max(1, items.length) / 2.1);
  rows.forEach((r) => (r.row.style.fontSize = rowFont + 'px'));
  if (title) {
    title.style.whiteSpace = 'normal';
    title.style.fontSize = Math.min(rowFont * 2.1, box.w * 0.11) + 'px';
  }
  if (eyebrow) eyebrow.style.fontSize = rowFont * 0.7 + 'px';

  return {
    update(t) {
      if (eyebrow) eyebrow.style.opacity = prog(t, 0, 0.4);
      if (title) {
        const p = prog(t, 0.05, 0.6, ease.outExpo);
        title.style.opacity = p;
        title.style.transform = `translateY(${(1 - p) * 40}px)`;
      }
      rows.forEach((r, i) => {
        const st = times[i];
        const s = spring(t - st, { freq: 1.7, damping: 0.62 });
        r.row.style.opacity = clamp((t - st) * 6);
        r.row.style.transform = `translate3d(${(1 - s) * -18}%,0,0)`;
        const b = spring(t - st - 0.1, { freq: 2.2, damping: 0.45 });
        r.badge.style.transform = `scale(${b})`;
        if (r.path) r.path.setAttribute('stroke-dashoffset', String(1 - prog(t, st + 0.18, 0.35)));
      });
    },
  };
}
