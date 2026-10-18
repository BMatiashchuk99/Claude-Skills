// Kinetic typography: big headline words animate in one by one.
// props: lines[], sub, eyebrow, style ('rise'|'pop'|'blur'|'slam'), accent_style ('color'|'box'|'underline'),
//        stagger (s), size (max px), align ('center'|'left')
export function create({ el, props, theme, box, util }) {
  const { h, parseRich, fitFont, prog, ease, spring, clamp } = util;
  const lines = props.lines || [props.text || ''];
  const style = props.style || 'rise';
  const accentStyle = props.accent_style || 'color';
  const align = props.align || 'center';
  const stagger = props.stagger ?? 0.07;
  const delay = props.delay ?? 0.1;

  const wrap = h('div', {
    style: { display: 'flex', flexDirection: 'column', alignItems: align === 'left' ? 'flex-start' : 'center', gap: '0.25em', width: '100%' },
  });
  const eyebrow = props.eyebrow ? h('div', { class: 'eyebrow' }, props.eyebrow) : null;
  const head = h('div', {
    style: {
      fontWeight: props.weight || 900, lineHeight: 1.0, letterSpacing: '-0.035em',
      textAlign: align, whiteSpace: 'nowrap', display: 'inline-block', textTransform: props.uppercase ? 'uppercase' : 'none',
    },
  });
  const words = [];
  lines.forEach((line, li) => {
    const lineEl = h('div', { style: { display: 'block' } });
    parseRich(line).forEach((tok, wi) => {
      const inner = h('span', { style: { display: 'inline-block', position: 'relative', willChange: 'transform' } }, tok.w);
      const mask = h('span', {
        style: { display: 'inline-block', overflow: style === 'rise' ? 'hidden' : 'visible', verticalAlign: 'top', padding: '0.06em 0.04em 0.1em', margin: '-0.06em 0 -0.1em' },
      }, inner);
      let deco = null;
      if (tok.accent) {
        if (accentStyle === 'box') {
          inner.style.color = theme.bg;
          deco = h('span', { style: { position: 'absolute', inset: '0.08em -0.08em 0.02em', background: theme.accent, borderRadius: '0.12em', zIndex: -1, transformOrigin: '0 50%' } });
          inner.style.zIndex = 0;
          inner.prepend(deco);
          inner.style.isolation = 'isolate';
        } else {
          inner.style.color = theme.accent;
          if (accentStyle === 'underline') {
            deco = h('span', { style: { position: 'absolute', left: 0, right: 0, bottom: '0.02em', height: '0.09em', background: theme.accent, transformOrigin: '0 50%', borderRadius: '1em' } });
            inner.append(deco);
          }
        }
      }
      lineEl.append(mask);
      if (wi >= 0) lineEl.append(document.createTextNode(' '));
      words.push({ inner, deco, accent: tok.accent, line: li });
    });
    head.append(lineEl);
  });
  const sub = props.sub ? h('div', { class: 'muted', style: { fontWeight: 500, lineHeight: 1.3, maxWidth: '90%', textAlign: align } }, props.sub) : null;
  if (eyebrow) wrap.append(eyebrow);
  wrap.append(head);
  if (sub) wrap.append(sub);
  el.append(wrap);

  const maxSize = props.size || box.w * 0.2;
  const size = fitFont(head, box.w, box.h * (sub ? 0.62 : 0.8), 20, maxSize);
  if (eyebrow) eyebrow.style.fontSize = Math.max(18, size * 0.22) + 'px';
  if (sub) sub.style.fontSize = Math.max(22, Math.min(size * 0.3, box.w * 0.055)) + 'px';
  if (sub) sub.style.marginTop = size * 0.25 + 'px';

  const lastStart = delay + (words.length - 1) * stagger;

  return {
    update(t) {
      if (eyebrow) {
        const p = prog(t, 0, 0.5);
        eyebrow.style.opacity = p;
        eyebrow.style.transform = `translateY(${(1 - p) * 40}%)`;
      }
      words.forEach((w, i) => {
        const st = delay + i * stagger;
        let tr = '';
        let op = 1;
        let filt = '';
        if (style === 'rise') {
          const p = prog(t, st, 0.6, ease.outExpo);
          tr = `translate3d(0,${(1 - p) * 115}%,0) rotate(${(1 - p) * 6}deg)`;
        } else if (style === 'pop') {
          const s = spring(t - st, { freq: 1.9, damping: 0.48 });
          tr = `scale(${s})`;
          op = clamp((t - st) * 8);
        } else if (style === 'blur') {
          const p = prog(t, st, 0.7, ease.outCubic);
          tr = `translate3d(0,${(1 - p) * 30}%,0)`;
          op = p;
          filt = `blur(${(1 - p) * 18}px)`;
        } else if (style === 'slam') {
          const p = prog(t, st, 0.28, ease.inCubic);
          tr = `scale(${2.4 - 1.4 * p})`;
          op = clamp(p * 3);
        }
        w.inner.style.transform = tr;
        w.inner.style.opacity = op;
        w.inner.style.filter = filt;
        if (w.deco) {
          const d = prog(t, st + 0.25, 0.45, ease.outCubic);
          w.deco.style.transform = `scaleX(${d})`;
        }
      });
      if (sub) {
        const p = prog(t, lastStart + 0.25, 0.6);
        sub.style.opacity = p;
        sub.style.transform = `translateY(${(1 - p) * 30}px)`;
      }
    },
  };
}
