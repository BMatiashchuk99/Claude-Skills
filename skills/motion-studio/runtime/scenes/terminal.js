// Terminal window that types commands and prints output.
// props: title, lines: [{cmd:"npm i"}, {out:"done", color:"green"|"dim"|"accent"}], cps (chars/sec), prompt ('$')
export function create({ el, props, theme, box, util, duration, vertical }) {
  const { h, prog, spring, clamp } = util;
  const lines = props.lines || [];
  const prompt = props.prompt ?? '$';
  const colors = { green: '#4ade80', red: '#f87171', yellow: '#facc15', dim: 'rgba(255,255,255,0.45)', accent: theme.accent, white: '#f5f5f7' };

  // schedule: commands type out, outputs appear right after
  let cps = props.cps || 32;
  const totalChars = lines.reduce((a, l) => a + (l.cmd ? l.cmd.length : 0), 0);
  const gaps = lines.length * 0.28 + 0.5;
  const budget = duration * 0.85 - gaps;
  if (totalChars / cps > budget && budget > 0) cps = totalChars / budget;
  let tcur = 0.5;
  const sched = lines.map((l) => {
    const s = { ...l, start: tcur };
    if (l.cmd) {
      s.end = tcur + l.cmd.length / cps;
      tcur = s.end + 0.3;
    } else {
      s.end = tcur;
      tcur += 0.12;
    }
    return s;
  });

  const fontSize = (vertical ? box.w * 0.05 : box.h * 0.045) * (props.scale || 1);
  const dots = h('div', { style: { display: 'flex', gap: '0.45em' } },
    ...['#ff5f57', '#febc2e', '#28c840'].map((c) => h('span', { style: { width: '0.75em', height: '0.75em', borderRadius: '50%', background: c, display: 'inline-block' } })));
  const header = h('div', { style: { display: 'flex', alignItems: 'center', gap: '1em', padding: '0.75em 1em', borderBottom: '1px solid rgba(255,255,255,0.08)' } },
    dots, h('div', { style: { flex: 1, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.8em', marginRight: '3em' } }, props.title || 'terminal'));
  const body = h('div', { style: { padding: '1em 1.2em 1.3em', textAlign: 'left', fontFamily: 'var(--mono)', lineHeight: 1.55, minHeight: '9em' } });
  const win = h('div', { class: 'card', style: { width: '100%', maxWidth: vertical ? '100%' : '78%', background: '#0d0f14', color: '#f5f5f7', overflow: 'hidden', fontSize: fontSize + 'px' } }, header, body);
  el.append(win);

  const rows = sched.map((s) => {
    const row = h('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all', minHeight: '1.55em' } });
    body.append(row);
    return row;
  });
  const cursor = h('span', { style: { display: 'inline-block', width: '0.6em', height: '1.1em', background: theme.accent, verticalAlign: 'text-bottom', marginLeft: '0.05em' } });

  return {
    update(t) {
      const s = spring(t, { freq: 1.5, damping: 0.7 });
      win.style.transform = `translateY(${(1 - s) * 12}%) scale(${0.94 + 0.06 * s})`;
      win.style.opacity = clamp(t * 5);
      let cursorRow = -1;
      sched.forEach((l, i) => {
        const row = rows[i];
        row.innerHTML = '';
        if (t < l.start) return;
        if (l.cmd) {
          const n = Math.floor(clamp((t - l.start) / Math.max(0.001, l.end - l.start)) * l.cmd.length);
          row.append(h('span', { style: { color: theme.accent, fontWeight: 700 } }, prompt + ' '), l.cmd.slice(0, n));
          cursorRow = i;
        } else {
          row.append(h('span', { style: { color: colors[l.color] || colors.white } }, l.out));
          cursorRow = i;
        }
      });
      if (cursorRow < 0) cursorRow = 0;
      const typing = sched.some((l) => l.cmd && t >= l.start && t <= l.end);
      cursor.style.opacity = typing || Math.floor(t * 2.2) % 2 === 0 ? 1 : 0;
      const last = sched[sched.length - 1];
      if (last && t > last.end + 0.3 && last.out != null) {
        // fresh prompt line after the last output
        if (!rows.extra) {
          rows.extra = h('div', { style: { minHeight: '1.55em' } });
          body.append(rows.extra);
        }
        rows.extra.innerHTML = '';
        rows.extra.append(h('span', { style: { color: theme.accent, fontWeight: 700 } }, prompt + ' '), cursor);
      } else {
        if (rows.extra) rows.extra.innerHTML = '';
        rows[cursorRow] && rows[cursorRow].append(cursor);
      }
    },
  };
}
