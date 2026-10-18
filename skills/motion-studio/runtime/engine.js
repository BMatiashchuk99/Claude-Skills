// Motion Studio player: builds every scene once, then draws any moment of the
// video with seek(t). The renderer calls seek() frame by frame and screenshots.
import { util, clamp, ease, lerp } from './util.js';
import { TRANSITIONS, mergeStyles } from './transitions.js';
import { createBackground } from './background.js';
import { createCaptions } from './captions.js';

const CAMERAS = {
  none: () => '',
  'push-in': (p) => `scale(${1 + 0.07 * p})`,
  'pull-out': (p) => `scale(${1.07 - 0.07 * p})`,
  'pan-left': (p) => `translate3d(${lerp(2.5, -2.5, p)}%,0,0) scale(1.07)`,
  'pan-right': (p) => `translate3d(${lerp(-2.5, 2.5, p)}%,0,0) scale(1.07)`,
  'pan-up': (p) => `translate3d(0,${lerp(2.5, -2.5, p)}%,0) scale(1.07)`,
  drift: (p, t) =>
    `translate3d(${Math.sin(t * 0.7) * 0.7}%,${Math.cos(t * 0.55) * 0.7}%,0) rotate(${Math.sin(t * 0.45) * 0.5}deg) scale(1.035)`,
  orbit: (p) => `perspective(1600px) rotateY(${lerp(-7, 7, p)}deg) rotateX(${lerp(3, -3, p)}deg) scale(1.06)`,
  tilt: (p) => `perspective(1600px) rotateX(${lerp(10, 0, ease.outCubic(p))}deg) scale(${lerp(1.08, 1.0, p)})`,
  shake: (p, t) => `translate3d(${Math.sin(t * 61) * 0.35 * (1 - p)}%,${Math.cos(t * 53) * 0.35 * (1 - p)}%,0)`,
};

export class Player {
  constructor(root, tl) {
    this.root = root;
    this.tl = tl;
    this.scenes = [];
  }

  async ready() {
    const tl = this.tl;
    const { width: W, height: H, fps } = tl.format;
    const theme = tl.theme;
    const base = tl.base || '/project/';
    const root = this.root;
    root.style.width = W + 'px';
    root.style.height = H + 'px';
    const css = root.style;
    css.setProperty('--bg', theme.bg);
    css.setProperty('--fg', theme.fg);
    css.setProperty('--muted', theme.muted);
    css.setProperty('--accent', theme.accent);
    css.setProperty('--accent2', theme.accent2 || theme.accent);
    css.setProperty('--card', theme.card);
    css.setProperty('--font', theme.font);
    css.setProperty('--mono', theme.mono);
    css.setProperty('--radius', (theme.radius ?? 0.03) * Math.min(W, H) + 'px');

    for (const f of theme.fonts || []) {
      try {
        const face = new FontFace(f.family, `url(${base}${f.src})`, { weight: f.weight || '100 900', style: f.style || 'normal' });
        await face.load();
        document.fonts.add(face);
      } catch (e) {
        console.warn('font failed', f.src, e);
      }
    }
    await document.fonts.ready;

    this.bg = createBackground(root, theme, W, H, fps);
    const layer = document.createElement('div');
    layer.className = 'scenes';
    root.append(layer);

    const vertical = H > W;
    const capsOn = (tl.captions || []).length > 0;
    const safe = {
      top: H * (vertical ? 0.1 : 0.08),
      bottom: H * (capsOn ? (vertical ? 0.33 : 0.2) : vertical ? 0.12 : 0.08),
      side: W * (vertical ? 0.07 : 0.07),
    };

    for (const s of tl.scenes) {
      const el = document.createElement('div');
      el.className = 'scene';
      el.dataset.id = s.id;
      const cam = document.createElement('div');
      cam.className = 'cam';
      const content = document.createElement('div');
      content.className = 'content';
      content.style.padding = `${safe.top}px ${safe.side}px ${safe.bottom}px`;
      cam.append(content);
      el.append(cam);
      layer.append(el);
      const url = s.type === 'custom' ? base + s.module : `./scenes/${s.type}.js`;
      const mod = await import(url);
      const duration = s.end - s.start;
      const inst =
        (await mod.create({
          el: content,
          sceneEl: el,
          props: s.props || {},
          theme,
          W,
          H,
          fps,
          duration,
          vertical,
          safe,
          box: { w: W - 2 * safe.side, h: H - safe.top - safe.bottom },
          asset: (p) => (/^(https?:|data:|\/)/.test(p) ? p : base + p),
          util,
        })) || {};
      this.scenes.push({ ...s, el, cam, inst, duration });
    }

    this.captions = createCaptions(root, tl);
    if (theme.progress_bar) {
      this.bar = document.createElement('div');
      this.bar.className = 'progress';
      root.append(this.bar);
    }
    this.fader = document.createElement('div');
    this.fader.className = 'fader';
    root.append(this.fader);
    this.seek(0);
  }

  seek(time) {
    const tl = this.tl;
    this.bg.update(time);
    const n = this.scenes.length;
    for (let i = 0; i < n; i++) {
      const s = this.scenes[i];
      const tin = i > 0 ? s.transition : null;
      const next = i < n - 1 ? this.scenes[i + 1] : null;
      const tout = next ? next.transition : null;
      const inDur = tin ? tin.duration : 0;
      const outDur = tout ? tout.duration : 0;
      const from = s.start - inDur / 2;
      const to = s.end + outDur / 2;
      const visible = time >= from && time < to;
      s.el.style.display = visible ? 'block' : 'none';
      if (!visible) continue;
      const local = time - s.start;
      const styles = [];
      if (tin && inDur > 0 && time < s.start + inDur / 2) {
        const p = ease.inOutCubic(clamp((time - from) / inDur));
        styles.push((TRANSITIONS[tin.type] || TRANSITIONS.fade).in(p));
      }
      if (tout && outDur > 0 && time > s.end - outDur / 2) {
        const p = ease.inOutCubic(clamp((time - (s.end - outDur / 2)) / outDur));
        styles.push((TRANSITIONS[tout.type] || TRANSITIONS.fade).out(p));
      }
      const m = mergeStyles(...styles);
      s.el.style.transform = m.transform;
      s.el.style.opacity = m.opacity;
      s.el.style.filter = m.filter;
      s.el.style.clipPath = m.clipPath;
      const camFn = CAMERAS[s.camera || 'none'] || CAMERAS.none;
      const cp = ease.inOutSine(clamp(local / Math.max(0.01, s.duration)));
      s.cam.style.transform = camFn(cp, local);
      if (s.inst.update) s.inst.update(local, { duration: s.duration, time });
    }
    this.captions.update(time);
    if (this.bar) this.bar.style.transform = `scaleX(${clamp(time / tl.duration)})`;
    const fi = tl.fade_in ?? 0.25;
    const fo = tl.fade_out ?? 0.35;
    let black = 0;
    if (fi > 0 && time < fi) black = 1 - time / fi;
    if (fo > 0 && time > tl.duration - fo) black = Math.max(black, (time - (tl.duration - fo)) / fo);
    this.fader.style.opacity = clamp(black);
  }
}
