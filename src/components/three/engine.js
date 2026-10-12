// Three.js scene used by the hero, the product viewer, the shape comparator and
// the spotlight. Loaded lazily (dynamic import) so it never blocks first paint.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildGlasses, makeStudioEnv, tintModel } from '@/lib/three/glasses';

const glbCache = new Map();

export function createScene(container, opts = {}) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environment = makeStudioEnv(THREE, renderer);
  const camera = new THREE.PerspectiveCamera(opts.fov || 30, 1, 0.1, 400);
  camera.position.set(0, 0, opts.distance || 34);

  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-6, 8, 10); scene.add(key);
  const rim = new THREE.PointLight(0xff6a00, opts.mode === 'hero' ? 320 : 160, 80); rim.position.set(10, -2, -4); scene.add(rim);
  const under = new THREE.PointLight(0xff8a30, 50, 50); under.position.set(0, -8, 6); scene.add(under);

  const pivot = new THREE.Group(); // user rotation
  const holder = new THREE.Group(); // idle animation
  pivot.add(holder); scene.add(pivot);

  let model = null;
  const state = { tx: 0, ty: 0, rx: 0, ry: 0, dragging: false, lastX: 0, lastY: 0, spinY: opts.initialY ?? -0.45, spinX: opts.initialX ?? 0.12, velocity: 0, visible: true, disposed: false, t: 0, idle: 0 };

  // floating geometry for the hero
  const floaters = [];
  if (opts.mode === 'hero') {
    const chrome = new THREE.MeshPhysicalMaterial({ color: '#e8e8e8', metalness: 1, roughness: 0.05, iridescence: 0.7, iridescenceIOR: 1.8, envMapIntensity: 1.6 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.04, transmission: 1, thickness: 1.2, ior: 1.5, envMapIntensity: 2, transparent: true });
    const orange = new THREE.MeshPhysicalMaterial({ color: '#ff6a00', metalness: 0.5, roughness: 0.3, clearcoat: 1, emissive: '#3a1400' });
    const defs = [
      [new THREE.IcosahedronGeometry(2.1, 0), mobile ? chrome : glass, [-15, 7, -6]],
      [new THREE.TorusGeometry(2.6, 0.18, 16, 80), orange, [15, -8, -10]],
      [new THREE.BoxGeometry(1.6, 1.6, 1.6), orange, [-12, -9, -2]],
      [new THREE.IcosahedronGeometry(1.1, 0), chrome, [12, 9, -4]],
      [new THREE.OctahedronGeometry(1.4), glass, [3, -11, -8]],
    ];
    for (const [g, m, p] of defs) {
      const mesh = new THREE.Mesh(g, m); mesh.position.set(...p);
      mesh.userData.base = new THREE.Vector3(...p); mesh.userData.seed = Math.random() * 10;
      scene.add(mesh); floaters.push(mesh);
    }
  }

  const placeHero = () => {
    // phones: glasses sit above the headline instead of behind it
    const narrow = container.clientWidth < 700;
    pivot.position.set(narrow ? 0 : (opts.offsetX || 0), narrow && opts.mode === 'hero' ? 12 : 0, 0);
    pivot.scale.setScalar(narrow && opts.mode === 'hero' ? 0.9 : 1);
    floaters.forEach((f, i) => { f.visible = !narrow || i === 1; });
  };
  placeHero();

  function frameModel() {
    if (!model) return;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    model.position.sub(c);
    const target = opts.fit || 15;
    const s = target / Math.max(size.x, 0.001);
    model.scale.setScalar(s);
  }

  async function setModel(o) {
    let next;
    if (o.modelUrl) {
      try {
        if (!glbCache.has(o.modelUrl)) glbCache.set(o.modelUrl, new GLTFLoader().loadAsync(o.modelUrl));
        const gltf = await glbCache.get(o.modelUrl);
        next = gltf.scene.clone(true);
        next.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); });
        tintModel(THREE, next, o);
      } catch (e) {
        console.warn('GLB failed, falling back to procedural model', e);
      }
    }
    if (!next) next = buildGlasses(THREE, o);
    if (state.disposed) return;
    if (model) { holder.remove(model); disposeTree(model); }
    model = next; holder.add(model); frameModel();
    holder.scale.setScalar(0.85);
    state.pop = 1;
  }

  function setColors(o) { if (model) tintModel(THREE, model, o); }

  // interaction
  const el = renderer.domElement;
  el.style.touchAction = opts.drag ? 'pan-y' : 'auto';
  Object.assign(el.style, { width: '100%', height: '100%', display: 'block' });
  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    state.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    state.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (state.dragging) {
      const dx = e.clientX - state.lastX; const dy = e.clientY - state.lastY;
      state.spinY += dx * 0.01; state.spinX = Math.max(-1, Math.min(1, state.spinX + dy * 0.006));
      state.velocity = dx * 0.01; state.lastX = e.clientX; state.lastY = e.clientY; state.idle = 0;
    }
  };
  const onDown = (e) => { if (!opts.drag) return; state.dragging = true; state.lastX = e.clientX; state.lastY = e.clientY; el.setPointerCapture?.(e.pointerId); };
  const onUp = () => { state.dragging = false; };
  const target = opts.mode === 'hero' ? window : el;
  target.addEventListener('pointermove', onMove, { passive: true });
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);

  const resize = () => {
    const w = container.clientWidth || 1; const h = container.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // keep the model in frame on narrow screens
    camera.position.z = (opts.distance || 34) * (camera.aspect < 0.9 ? 1.35 / Math.max(camera.aspect, 0.55) : 1);
    camera.updateProjectionMatrix();
    placeHero();
    render();
  };
  const ro = new ResizeObserver(resize); ro.observe(container);
  const io = new IntersectionObserver(([e]) => { state.visible = e.isIntersecting; if (state.visible) loop(); }, { threshold: 0.01 });
  io.observe(container);

  const clock = new THREE.Clock();
  let raf = 0;
  function render() { renderer.render(scene, camera); }
  function loop() {
    cancelAnimationFrame(raf);
    if (!state.visible || state.disposed) return;
    const dt = Math.min(clock.getDelta(), 0.05); state.t += dt; state.idle += dt;
    if (!reduced) {
      if (!state.dragging) {
        state.velocity *= 0.94;
        state.spinY += state.velocity + (opts.autoRotate !== false && state.idle > 1.5 ? dt * (opts.mode === 'hero' ? 0.18 : 0.3) : 0);
      }
      const follow = opts.mode === 'hero' ? 0.35 : 0.12;
      state.rx += ((state.ty * follow) - state.rx) * 0.06;
      state.ry += ((state.tx * follow) - state.ry) * 0.06;
      holder.position.y = Math.sin(state.t * 0.9) * (opts.mode === 'hero' ? 0.45 : 0.2);
      holder.rotation.z = Math.sin(state.t * 0.6) * 0.03;
      if (state.pop) { const s = holder.scale.x + (1 - holder.scale.x) * 0.12; holder.scale.setScalar(s); if (Math.abs(1 - s) < 0.001) state.pop = 0; }
      for (const f of floaters) {
        const s = f.userData.seed;
        f.position.y = f.userData.base.y + Math.sin(state.t * 0.7 + s) * 0.8 - state.ty * 1.2;
        f.position.x = f.userData.base.x - state.tx * 1.5;
        f.rotation.x += dt * 0.3; f.rotation.y += dt * 0.4;
      }
      rim.position.x = 10 + state.tx * 6;
    } else {
      holder.scale.setScalar(1);
    }
    pivot.rotation.set(state.spinX + state.rx, state.spinY + state.ry, 0);
    render();
    raf = requestAnimationFrame(loop);
  }

  setModel(opts).then(() => { resize(); loop(); opts.onReady?.(); });

  return {
    setModel, setColors,
    setAngle(y, x = 0.1) { state.spinY = y; state.spinX = x; state.idle = 0; },
    dispose() {
      state.disposed = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      target.removeEventListener('pointermove', onMove); el.removeEventListener('pointerdown', onDown); window.removeEventListener('pointerup', onUp);
      disposeTree(scene); renderer.dispose(); el.remove();
    },
  };
}

function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
