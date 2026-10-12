// Procedural eyewear model. Builds a full pair of glasses (rims, lenses, bridge,
// hinges, temples, nose pads) from a frame-shape name. Meshes are named
// "frame" and "lens" so colours can be swapped per variant, and the same names
// are used when exporting/importing GLB files.

export const FRAME_SHAPES = ['aviator', 'round', 'square', 'cat-eye', 'wayfarer', 'shield', 'hexagon', 'oval'];

const METAL_SHAPES = new Set(['aviator', 'round', 'hexagon']);

function lensPoints(THREE, shape) {
  const pts = [];
  const N = 96;
  const push = (x, y) => pts.push(new THREE.Vector2(x, y));
  // superellipse helper: |x/a|^n + |y/b|^n = 1
  const superellipse = (a, b, n, skew = 0, lift = 0) => {
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t);
      let x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      let y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      // skew: widen top (wayfarer) ; lift: raise outer-top corner (cat-eye)
      x *= 1 + skew * (y / b);
      if (lift && x > 0 && y > 0) y += lift * Math.pow(x / a, 3) * (y / b);
      push(x, y);
    }
  };
  switch (shape) {
    case 'round': superellipse(2.35, 2.35, 2); break;
    case 'oval': superellipse(2.7, 2.05, 2.2); break;
    case 'square': superellipse(2.65, 2.0, 4.5); break;
    case 'wayfarer': superellipse(2.7, 2.0, 4, 0.12); break;
    case 'cat-eye': superellipse(2.75, 1.85, 2.6, 0.14, 1.5); break;
    case 'shield': superellipse(3.1, 2.15, 3.6, 0.05, 0.35); break;
    case 'hexagon': {
      for (let i = 0; i < 6; i++) {
        const t = (i / 6) * Math.PI * 2;
        push(2.55 * Math.cos(t), 2.3 * Math.sin(t));
      }
      // round the hex slightly by subdividing with a Catmull curve
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, p.y, 0)), true, 'centripetal', 0.1);
      return curve.getPoints(N).slice(0, N).map((v) => new THREE.Vector2(v.x, v.y));
    }
    case 'aviator':
    default: {
      // teardrop: flat-ish brow, deep belly towards the nose side
      for (let i = 0; i < N; i++) {
        const t = (i / N) * Math.PI * 2;
        const c = Math.cos(t), s = Math.sin(t);
        let x = 2.8 * c;
        let y = s > 0 ? 1.65 * Math.pow(s, 0.6) : 2.75 * s;
        if (s < 0) x -= 0.95 * Math.pow(-s, 1.6) * (c < 0 ? 0.35 : 1); // belly drops towards the nose
        y += 0.25 * c;
        push(x, y);
      }
    }
  }
  return pts;
}

function scaled(pts, sx, sy) {
  return pts.map((p) => p.clone().set(p.x * sx, p.y * sy));
}

function bounds(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

export function makeMaterials(THREE, { frameHex = '#111111', lensHex = '#1a1a1a', metal = false, clear = false } = {}) {
  const frame = new THREE.MeshPhysicalMaterial({
    color: frameHex,
    metalness: metal ? 1 : 0.05,
    roughness: metal ? 0.22 : 0.28,
    clearcoat: metal ? 0.3 : 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: metal ? 1.4 : 1.1,
  });
  frame.name = 'frame';
  const lens = clear
    ? new THREE.MeshPhysicalMaterial({
      color: lensHex, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.15, ior: 1.5,
      transparent: true, opacity: 0.35, envMapIntensity: 2, clearcoat: 1,
    })
    : new THREE.MeshPhysicalMaterial({
      color: lensHex, metalness: 0.75, roughness: 0.04, transparent: true, opacity: 0.93,
      clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.55, iridescenceIOR: 1.6,
      iridescenceThicknessRange: [180, 520], envMapIntensity: 2.2,
    });
  lens.name = 'lens';
  return { frame, lens };
}

/**
 * Build a pair of glasses.
 * @param THREE three.js namespace
 * @param opts { shape, frameHex, lensHex, clear (eyeglasses), metal (override) }
 */
export function buildGlasses(THREE, opts = {}) {
  const shape = FRAME_SHAPES.includes(opts.shape) ? opts.shape : 'square';
  const metal = opts.metal ?? METAL_SHAPES.has(shape);
  const mats = makeMaterials(THREE, { frameHex: opts.frameHex, lensHex: opts.lensHex, metal, clear: !!opts.clear });
  const group = new THREE.Group();
  group.name = `glasses-${shape}`;

  const inner = lensPoints(THREE, shape);
  const b = bounds(inner);
  const rim = metal ? 0.16 : 0.42;
  const outer = scaled(inner, (b.w + rim * 2) / b.w, (b.h + rim * 2) / b.h);
  const bridgeGap = shape === 'shield' ? 1.1 : 1.7;
  const halfOffset = b.w / 2 + rim + bridgeGap / 2;
  const depth = metal ? 0.12 : 0.38;
  const wrap = shape === 'shield' ? 0.32 : 0.12; // how much each eye is turned towards the face

  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.x = side * halfOffset;
    eye.rotation.y = side * wrap;
    // mirror the outline for the left eye so asymmetric shapes face outwards
    const mirror = (arr) => (side === 1 ? arr : arr.map((p) => p.clone().set(-p.x, p.y)).reverse());
    const sInner = mirror(inner);
    const sOuter = mirror(outer);
    // Rim
    let rimMesh;
    if (metal) {
      const path = new THREE.CatmullRomCurve3(scaled(sInner, (b.w + rim) / b.w, (b.h + rim) / b.h).map((p) => new THREE.Vector3(p.x, p.y, 0)), true);
      rimMesh = new THREE.Mesh(new THREE.TubeGeometry(path, 160, rim * 0.55, 10, true), mats.frame);
    } else {
      const s = new THREE.Shape(sOuter);
      s.holes.push(new THREE.Path(sInner.slice().reverse()));
      const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 4, curveSegments: 48 });
      g.translate(0, 0, -depth / 2);
      rimMesh = new THREE.Mesh(g, mats.frame);
    }
    rimMesh.name = 'frame';
    eye.add(rimMesh);
    // Lens — gently curved towards the viewer
    const lg = new THREE.ShapeGeometry(new THREE.Shape(scaled(sInner, 1.01, 1.01)), 48);
    const pos = lg.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, 0.06 - 0.018 * (x * x + y * y * 0.6));
    }
    lg.computeVertexNormals();
    const lens = new THREE.Mesh(lg, mats.lens);
    lens.name = 'lens';
    eye.add(lens);
    // Nose pads on metal frames
    if (metal) {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), mats.lens);
      pad.scale.set(0.6, 1, 0.5);
      pad.position.set(-side * (b.w / 2 - 0.25), -0.6, -0.45);
      pad.name = 'lens';
      eye.add(pad);
    }
    group.add(eye);
    eyes.push(eye);
  }

  // Bridge
  const yTop = b.maxY * 0.55;
  const bridgeCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-bridgeGap / 2 - rim * 0.4, yTop, 0),
    new THREE.Vector3(0, yTop + (metal ? 0.25 : 0.55), 0.15),
    new THREE.Vector3(bridgeGap / 2 + rim * 0.4, yTop, 0),
  );
  const bridge = new THREE.Mesh(new THREE.TubeGeometry(bridgeCurve, 32, metal ? 0.09 : 0.24, 12, false), mats.frame);
  bridge.name = 'frame';
  group.add(bridge);
  if (shape === 'aviator') {
    const top = new THREE.LineCurve3(new THREE.Vector3(-halfOffset + 0.4, b.maxY + 0.05, 0), new THREE.Vector3(halfOffset - 0.4, b.maxY + 0.05, 0));
    const brow = new THREE.Mesh(new THREE.TubeGeometry(top, 24, 0.075, 10, false), mats.frame);
    brow.name = 'frame';
    group.add(brow);
  }

  // Hinges + temples
  const outerX = halfOffset + b.w / 2 + rim * 0.6;
  const hingeY = b.maxY * 0.45;
  const templeLen = 13;
  for (const side of [-1, 1]) {
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.7), mats.frame);
    hinge.position.set(side * outerX, hingeY, -0.35);
    hinge.name = 'frame';
    group.add(hinge);
    let temple;
    if (metal) {
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * outerX, hingeY, -0.6),
        new THREE.Vector3(side * (outerX + 0.25), hingeY, -templeLen * 0.5),
        new THREE.Vector3(side * (outerX + 0.35), hingeY - 0.2, -templeLen * 0.85),
        new THREE.Vector3(side * (outerX + 0.3), hingeY - 1.6, -templeLen - 0.8),
      ]);
      temple = new THREE.Mesh(new THREE.TubeGeometry(c, 64, 0.09, 8, false), mats.frame);
    } else {
      // side profile (u along the arm, v height), extruded by arm thickness
      const p = new THREE.Shape();
      p.moveTo(0, -0.38); p.lineTo(0, 0.38);
      p.bezierCurveTo(4, 0.34, 8, 0.24, templeLen * 0.82, 0.2);
      p.quadraticCurveTo(templeLen + 0.4, 0.15, templeLen + 0.9, -1.4);
      p.lineTo(templeLen + 0.55, -1.5);
      p.quadraticCurveTo(templeLen, -0.1, templeLen * 0.82, -0.12);
      p.bezierCurveTo(8, -0.14, 4, -0.22, 0, -0.38);
      const g = new THREE.ExtrudeGeometry(p, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 24 });
      temple = new THREE.Mesh(g, mats.frame);
      temple.rotation.y = Math.PI / 2;
      temple.position.set(side * (outerX + 0.12) - 0.12, hingeY, -0.6);
    }
    temple.name = 'frame';
    group.add(temple);
  }

  // centre the model on its bounding box
  const box = new THREE.Box3().setFromObject(group);
  const c = box.getCenter(new THREE.Vector3());
  group.children.forEach((ch) => ch.position.sub(c));
  group.userData.materials = mats;
  group.userData.width = box.max.x - box.min.x;
  return group;
}

/** Re-tint every mesh named frame/lens inside a model (works for GLB too). */
export function tintModel(THREE, root, { frameHex, lensHex }) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = `${o.name} ${o.material?.name || ''}`.toLowerCase();
    if (frameHex && n.includes('frame')) o.material.color?.set(frameHex);
    if (lensHex && n.includes('lens')) o.material.color?.set(lensHex);
  });
}

/** A dark studio with white softboxes and orange strip lights, used as the
 *  reflection environment so lenses and metal pick up the brand lighting. */
export function makeStudioEnv(THREE, renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050505');
  const box = (w, h, color, intensity, pos, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); if (rot) m.rotation.set(...rot); m.lookAt(0, 0, 0); scene.add(m);
  };
  box(16, 5, '#ffffff', 2.6, [0, 9, 7]);          // top softbox
  box(12, 6, '#f2f2f2', 1.3, [-3, 3, 12]);        // large front-left softbox
  box(2.5, 12, '#ff6a00', 2.4, [11, 1, 2]);       // orange strip right
  box(2, 10, '#ffffff', 1.6, [-11, -1, 4]);       // white strip left
  box(10, 3, '#ffb37a', 0.7, [0, -8, 8]);         // warm floor bounce
  box(18, 8, '#1a1a1a', 1, [0, 0, -12]);          // dark back wall
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  return tex;
}
