// Animated backgrounds drawn on a 2D canvas. Pure function of time.
import { rgba, rand } from './util.js';

export function createBackground(root, theme, W, H, fps) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.className = 'bg-canvas';
  root.append(canvas);
  const g = canvas.getContext('2d');

  const grain = document.createElement('div');
  grain.className = 'grain';
  grain.style.opacity = theme.grain ?? 0.07;
  root.append(grain);

  const kind = theme.background || 'aurora';
  const colors = [theme.accent, theme.accent2 || theme.accent, theme.accent3 || theme.accent2 || theme.accent];
  const intensity = theme.bg_intensity ?? 0.5;
  const R = Math.max(W, H);

  function blobs(t, alpha) {
    for (let i = 0; i < 3; i++) {
      const x = W * (0.5 + 0.38 * Math.sin(t * 0.23 + i * 2.1));
      const y = H * (0.5 + 0.36 * Math.cos(t * 0.17 + i * 1.7));
      const r = R * (0.42 + 0.08 * Math.sin(t * 0.3 + i));
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, rgba(colors[i], alpha));
      grad.addColorStop(1, rgba(colors[i], 0));
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
    }
  }

  function grid(t) {
    const step = Math.round(Math.min(W, H) / 12);
    const off = (t * 18) % step;
    g.strokeStyle = rgba(theme.fg, 0.07);
    g.lineWidth = 1;
    g.beginPath();
    for (let x = -step + off; x < W + step; x += step) {
      g.moveTo(x, 0);
      g.lineTo(x, H);
    }
    for (let y = -step + off; y < H + step; y += step) {
      g.moveTo(0, y);
      g.lineTo(W, y);
    }
    g.stroke();
  }

  function dots(t) {
    for (let i = 0; i < 70; i++) {
      const sx = rand(i * 7 + 1) * W;
      const sy = rand(i * 7 + 2) * H;
      const sp = 10 + rand(i * 7 + 3) * 30;
      const y = (sy - t * sp + H * 10) % H;
      const a = 0.15 + 0.35 * rand(i * 7 + 4);
      g.fillStyle = rgba(i % 3 ? theme.fg : theme.accent, a);
      g.beginPath();
      g.arc(sx, y, 1.5 + rand(i * 7 + 5) * 2.5, 0, Math.PI * 2);
      g.fill();
    }
  }

  return {
    update(t) {
      g.globalAlpha = 1;
      g.fillStyle = theme.bg;
      g.fillRect(0, 0, W, H);
      if (kind === 'aurora') blobs(t, intensity);
      else if (kind === 'grid') {
        blobs(t, intensity * 0.6);
        grid(t);
      } else if (kind === 'particles') {
        blobs(t, intensity * 0.5);
        dots(t);
      }
      // 'solid' draws nothing extra
      if (theme.vignette !== false) {
        const v = g.createRadialGradient(W / 2, H / 2, R * 0.25, W / 2, H / 2, R * 0.75);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, `rgba(0,0,0,${theme.dark === false ? 0.08 : 0.45})`);
        g.fillStyle = v;
        g.fillRect(0, 0, W, H);
      }
      const f = Math.round(t * fps);
      grain.style.transform = `translate(${Math.round(rand(f) * 200 - 100)}px, ${Math.round(rand(f + 99) * 200 - 100)}px)`;
    },
  };
}
