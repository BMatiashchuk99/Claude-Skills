// Before / after comparison. Stacks vertically on 9:16, side by side on 16:9.
// props: title, left: {label, items[]}, right: {label, items[]}
export function create({ el, props, theme, box, util, vertical }) {
  const { h, prog, ease, spring, clamp, parseRich } = util;
  const L = props.left || { label: 'Before', items: [] };
  const R = props.right || { label: 'After', items: [] };
  const fs = vertical ? box.w * 0.056 : box.h * 0.05;

  const col = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: fs * 0.9 + 'px', fontSize: fs + 'px' } });
  let title = null;
  if (props.title) {
    title = h('div', { style: { fontWeight: 900, fontSize: '2em', letterSpacing: '-0.035em', lineHeight: 1.02 } });
    parseRich(props.title).forEach((tk) => title.append(h('span', { class: tk.accent ? 'accent' : '' }, tk.w + ' ')));
    col.append(title);
  }
  const panel = (side, good) => {
    const items = (side.items || []).map((txt) =>
      h('div', { style: { display: 'flex', gap: '0.55em', alignItems: 'flex-start', textAlign: 'left', fontWeight: 600, lineHeight: 1.25, color: good ? 'var(--fg)' : 'var(--muted)' } },
        h('span', { style: { color: good ? theme.accent : '#f87171', fontWeight: 900 } }, good ? '✓' : '✕'),
        h('span', { style: { textDecoration: good ? 'none' : 'line-through', textDecorationColor: 'rgba(248,113,113,.6)' } }, txt)));
    const lab = h('div', { style: { fontWeight: 900, fontSize: '0.8em', letterSpacing: '0.16em', textTransform: 'uppercase', color: good ? theme.accent : 'var(--muted)', textAlign: 'left' } }, side.label);
    const card = h('div', { class: 'card', style: { flex: 1, padding: '1em 1.1em', display: 'flex', flexDirection: 'column', gap: '0.55em', border: good ? `2px solid ${theme.accent}` : '2px solid transparent', opacity: good ? 1 : 0.85 } }, lab, ...items);
    return { card, items };
  };
  const a = panel(L, false);
  const b = panel(R, true);
  const row = h('div', { style: { display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: '0.8em', width: '100%', alignItems: 'stretch' } }, a.card, b.card);
  col.append(row);
  el.append(col);

  return {
    update(t) {
      if (title) {
        const p = prog(t, 0, 0.6, ease.outExpo);
        title.style.opacity = p;
        title.style.transform = `translateY(${(1 - p) * 40}px)`;
      }
      [a, b].forEach((pnl, k) => {
        const st = 0.3 + k * 0.7;
        const s = spring(t - st, { freq: 1.5, damping: 0.65 });
        pnl.card.style.opacity = clamp((t - st) * 5) * (k === 0 ? 0.85 : 1);
        pnl.card.style.transform = vertical ? `translateY(${(1 - s) * 25}%)` : `translateX(${(1 - s) * (k ? 20 : -20)}%)`;
        pnl.items.forEach((it, i) => {
          const q = prog(t, st + 0.25 + i * 0.18, 0.4);
          it.style.opacity = q;
        });
      });
      const glow = 0.5 + 0.5 * Math.sin(t * 3);
      b.card.style.boxShadow = `0 0 ${20 + glow * 30}px ${theme.accent}55, 0 30px 80px rgba(0,0,0,.35)`;
    },
  };
}
