// Burned-in captions with a word-by-word highlight, synced to the voiceover.
import { spring, clamp } from './util.js';

export function createCaptions(root, tl) {
  const chunks = tl.captions || [];
  const cfg = tl.caption_style || {};
  const box = document.createElement('div');
  box.className = 'captions';
  const { width: W, height: H } = tl.format;
  const vertical = H > W;
  box.style.bottom = (cfg.bottom ?? (vertical ? 0.2 : 0.08)) * H + 'px';
  box.style.fontSize = (cfg.size ?? (vertical ? 0.068 : 0.058)) * (vertical ? W : H) + 'px';
  if (cfg.uppercase !== false) box.style.textTransform = 'uppercase';
  root.append(box);

  let current = -1;
  let spans = [];

  function build(i) {
    box.innerHTML = '';
    spans = [];
    if (i < 0) return;
    const line = document.createElement('div');
    line.className = 'cap-line';
    for (const w of chunks[i].words) {
      const s = document.createElement('span');
      s.className = 'cap-word';
      s.textContent = w.w;
      line.append(s, document.createTextNode(' '));
      spans.push(s);
    }
    box.append(line);
  }

  return {
    update(t) {
      let idx = -1;
      for (let i = 0; i < chunks.length; i++) {
        if (t >= chunks[i].start && t < chunks[i].end) {
          idx = i;
          break;
        }
      }
      if (idx !== current) {
        current = idx;
        build(idx);
      }
      if (idx < 0) return;
      const c = chunks[idx];
      const line = box.firstChild;
      const enter = spring(t - c.start, { freq: 2.4, damping: 0.62 });
      line.style.transform = `scale(${0.86 + 0.14 * enter})`;
      line.style.opacity = clamp((t - c.start) * 10);
      c.words.forEach((w, j) => {
        const active = t >= w.start && (j === c.words.length - 1 ? t < c.end : t < c.words[j + 1].start);
        const spoken = t >= w.start;
        const s = spans[j];
        s.classList.toggle('active', active && cfg.highlight !== false);
        s.style.opacity = cfg.reveal === false || spoken ? 1 : 0.45;
        const pop = active ? 1 + 0.08 * (1 - spring(t - w.start, { freq: 3, damping: 0.5 })) : 1;
        s.style.transform = `scale(${pop.toFixed(4)})`;
      });
    },
  };
}
