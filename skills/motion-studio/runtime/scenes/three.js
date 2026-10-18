// 3D hero object rendered with Three.js, with an optional headline overlay.
// props: shape ('torusKnot'|'icosahedron'|'blob'|'sphere'|'cube'|'torus'|'rings'), title, sub, eyebrow,
//        material ('glossy'|'metal'|'glass'|'wire'), color, spin (rad/s), particles (bool), title_pos ('top'|'bottom')
import * as THREE from '/vendor/three.module.js';

export async function create({ el, sceneEl, props, theme, W, H, box, util, duration, safe }) {
  const { h, prog, ease, spring, clamp, lerp, rand, parseRich, fitFont } = util;

  const canvas = h('canvas', { style: { position: 'absolute', inset: 0, width: '100%', height: '100%' } });
  sceneEl.querySelector('.cam').prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
  const color = new THREE.Color(props.color || theme.accent);
  const color2 = new THREE.Color(theme.accent2 || theme.accent);

  const shape = props.shape || 'torusKnot';
  let geo;
  if (shape === 'icosahedron') geo = new THREE.IcosahedronGeometry(1.25, 0);
  else if (shape === 'blob') geo = new THREE.IcosahedronGeometry(1.15, 6);
  else if (shape === 'sphere') geo = new THREE.SphereGeometry(1.15, 96, 64);
  else if (shape === 'cube') geo = new THREE.BoxGeometry(1.5, 1.5, 1.5, 1, 1, 1);
  else if (shape === 'torus') geo = new THREE.TorusGeometry(1.0, 0.38, 64, 160);
  else geo = new THREE.TorusKnotGeometry(0.85, 0.3, 260, 40);

  const matType = props.material || 'glossy';
  let mat;
  if (matType === 'wire') mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.9 });
  else if (matType === 'metal') mat = new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.22 });
  else if (matType === 'glass') mat = new THREE.MeshPhysicalMaterial({ color, metalness: 0.0, roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.78, clearcoat: 1, clearcoatRoughness: 0.05 });
  else mat = new THREE.MeshPhysicalMaterial({ color, metalness: 0.25, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, flatShading: shape === 'icosahedron' });

  const group = new THREE.Group();
  scene.add(group);
  if (shape === 'rings') {
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(1.0 - i * 0.22, 0.07, 32, 200), mat);
      m.userData.axis = i;
      group.add(m);
    }
  } else {
    group.add(new THREE.Mesh(geo, mat));
  }
  const basePos = shape === 'blob' ? geo.attributes.position.array.slice() : null;

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(color2, 40, 20);
  rim.position.set(-3, -1.5, -2);
  scene.add(rim);
  const fill = new THREE.PointLight(color, 18, 20);
  fill.position.set(2.5, -2, 3);
  scene.add(fill);

  let points = null;
  if (props.particles !== false) {
    const n = 500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 2.2 + rand(i * 3 + 1) * 3.5;
      const th = rand(i * 3 + 2) * Math.PI * 2;
      const ph = Math.acos(2 * rand(i * 3 + 3) - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    points = new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color(theme.fg), size: 0.025, transparent: true, opacity: 0.55 }));
    scene.add(points);
  }

  // frame the object so it fills ~55% of the shorter side, nudged away from the title
  const vfov = (camera.fov * Math.PI) / 180;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const fitDist = 1.55 / Math.tan(Math.min(vfov, hfov) / 2) / (props.fill || 0.58);
  const titlePos = props.title_pos || 'top';
  const yShift = props.title ? (titlePos === 'top' ? -0.35 : 0.35) : 0;

  // headline overlay
  let title = null;
  let sub = null;
  if (props.title || props.eyebrow) {
    const stack = h('div', { style: { position: 'absolute', left: safe.side + 'px', right: safe.side + 'px', [titlePos === 'top' ? 'top' : 'bottom']: (titlePos === 'top' ? safe.top : safe.bottom) + 'px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3em' } });
    if (props.eyebrow) stack.append(h('div', { class: 'eyebrow', style: { fontSize: box.w * 0.035 + 'px' } }, props.eyebrow));
    if (props.title) {
      title = h('div', { style: { fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, whiteSpace: 'nowrap' } });
      parseRich(props.title).forEach((tk) => title.append(h('span', { class: tk.accent ? 'accent' : '' }, tk.w + ' ')));
      stack.append(title);
    }
    if (props.sub) {
      sub = h('div', { class: 'muted', style: { fontWeight: 500, fontSize: box.w * 0.045 + 'px' } }, props.sub);
      stack.append(sub);
    }
    el.append(stack);
    if (title) fitFont(title, box.w, box.h * 0.2, 20, box.w * 0.15);
  }

  const spin = props.spin ?? 0.55;
  return {
    update(t) {
      const s = spring(t, { freq: 1.1, damping: 0.62 });
      group.scale.setScalar(0.35 + 0.65 * s);
      group.rotation.y = t * spin + 0.4;
      group.rotation.x = Math.sin(t * 0.5) * 0.35 + 0.25;
      if (shape === 'rings') group.children.forEach((m, i) => {
        m.rotation.x = t * (0.6 + i * 0.35);
        m.rotation.y = t * (0.4 + i * 0.25) + i;
      });
      if (basePos) {
        const p = geo.attributes.position.array;
        for (let i = 0; i < p.length; i += 3) {
          const x = basePos[i], y = basePos[i + 1], z = basePos[i + 2];
          const d = 1 + 0.12 * Math.sin(x * 2.4 + t * 1.6) * Math.sin(y * 2.1 + t * 1.3) + 0.06 * Math.sin(z * 3.3 + t * 2.1);
          p[i] = x * d; p[i + 1] = y * d; p[i + 2] = z * d;
        }
        geo.attributes.position.needsUpdate = true;
        geo.computeVertexNormals();
      }
      if (points) {
        points.rotation.y = t * 0.06;
        points.rotation.x = t * 0.02;
      }
      const dolly = ease.outCubic(clamp(t / Math.max(0.5, duration)));
      camera.position.set(Math.sin(t * 0.3) * 0.3, yShift * -1 + Math.cos(t * 0.25) * 0.15, lerp(fitDist * 1.25, fitDist, dolly));
      camera.lookAt(0, -yShift, 0);
      renderer.render(scene, camera);
      if (title) {
        const p = prog(t, 0.25, 0.7, ease.outExpo);
        title.style.opacity = p;
        title.style.transform = `translateY(${(1 - p) * 40}%)`;
      }
      if (sub) sub.style.opacity = prog(t, 0.7, 0.5);
    },
  };
}
