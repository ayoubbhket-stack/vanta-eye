// Renders all sample product photography, campaign imagery and GLB models
// from the procedural Three.js eyewear model, using headless Chromium.
// Usage: node scripts/render/render-assets.mjs   (needs `playwright` available)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
import { products, colorTable } from '../catalog.mjs';

const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const out = path.join(root, 'seed-assets');
for (const d of ['products', 'models', 'campaign']) fs.mkdirSync(path.join(out, d), { recursive: true });

const srv = await serve(4791, root);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto('http://localhost:4791/scripts/render/render.html');
await page.waitForFunction(() => window.ready, null, { timeout: 60000 });

const save = (file, dataUrl) => fs.writeFileSync(path.join(out, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
const only = process.argv[2];

if (!only || only === 'products') {
  for (const p of products) {
    const frames = [...new Set(p.pairs.map(([f]) => f))];
    for (const fk of frames) {
      const lk = p.pairs.find(([f]) => f === fk)[1];
      const base = { shape: p.shape, frameHex: colorTable.C[fk][1], lensHex: colorTable.L[lk][1], clear: !!p.clear };
      for (const angle of ['front', 'side', 'top']) {
        if (angle === 'top' && fk !== frames[0]) continue;
        save(`products/${p.slug}-${fk}-${angle}.jpg`, await page.evaluate((o) => window.renderShot(o), { ...base, angle, bg: angle === 'side' ? 'side' : 'front' }));
      }
    }
    console.log('rendered', p.slug);
  }
}

if (!only || only === 'models') {
  const combos = new Set(products.map((p) => `${p.shape}|${p.clear ? 1 : 0}`));
  for (const c of combos) {
    const [shape, clear] = c.split('|');
    const b64 = await page.evaluate((o) => window.exportGLB(o), { shape, clear: clear === '1', frameHex: '#111111', lensHex: clear === '1' ? '#e8eef2' : '#1c1c1c' });
    fs.writeFileSync(path.join(out, `models/${shape}${clear === '1' ? '-optical' : ''}.glb`), Buffer.from(b64, 'base64'));
  }
  console.log('models exported');
}

if (!only || only === 'campaign') {
  const scenes = {
    'hero-poster': { w: 1800, h: 1100, bg: 'side', cam: [0, 0, 42], items: [{ shape: 'aviator', frameHex: '#2a2a2e', lensHex: '#ff5a00', pos: [2, 0, 0], rot: [0.22, -0.55, -0.1], scale: 1.6 }],
      shapes: [{ kind: 'ico', r: 2.2, glass: true, pos: [-14, 6, -4] }, { kind: 'ring', r: 3, t: 0.22, pos: [15, -7, -8], rot: [1, 0.4, 0] }, { kind: 'box', r: 1.6, pos: [-11, -8, -2], rot: [0.5, 0.6, 0.2] }] },
    'col-signature': { w: 1600, h: 1100, cam: [0, 0, 36], items: [{ shape: 'aviator', frameHex: '#c9a24a', lensHex: '#2f3d2a', pos: [-1, 1, 0], rot: [0.25, -0.5, 0.05], scale: 1.45 }],
      shapes: [{ kind: 'ring', r: 7, t: 0.08, pos: [0, 0, -10], rot: [0, 0, 0] }] },
    'col-sport': { w: 1600, h: 1100, bg: 'side', cam: [0, -2, 38], items: [{ shape: 'shield', frameHex: '#e6e6e6', lensHex: '#ff5a00', pos: [0, 0, 0], rot: [0.5, 0.8, -0.35], scale: 1.4 }],
      shapes: [{ kind: 'box', r: 2.4, pos: [-13, 5, -6], rot: [0.4, 0.8, 0.1] }, { kind: 'box', r: 1.2, pos: [12, -6, -2], rot: [0.9, 0.2, 0.4] }] },
    'col-minimal': { w: 1600, h: 1100, bg: 'light', cam: [0, 0, 40], items: [{ shape: 'square', frameHex: '#121212', lensHex: '#1c1c1c', pos: [0, 0, 0], rot: [0.05, 0, 0], scale: 1.3 }] },
    'col-retro': { w: 1600, h: 1100, cam: [0, 0, 44], items: [
      { shape: 'round', frameHex: '#c9a24a', lensHex: '#3e2414', pos: [-7, 3, 0], rot: [0.3, 0.5, 0.2] },
      { shape: 'cat-eye', frameHex: '#ff6a00', lensHex: '#3e2414', pos: [6, -3, 2], rot: [0.1, -0.6, -0.15] }] },
    'col-limited': { w: 1600, h: 1100, bg: 'side', cam: [0, 0, 34], items: [{ shape: 'hexagon', frameHex: '#2a2a2e', lensHex: '#ff5a00', pos: [0, 0, 0], rot: [0.15, -0.35, 0.08], scale: 1.4 }],
      shapes: [{ kind: 'ico', r: 1.8, glass: true, pos: [-11, 5, 2] }, { kind: 'ico', r: 1.1, glass: true, pos: [12, -5, 3] }] },
    'campaign-a': { w: 1600, h: 2000, cam: [0, 0, 46], items: [{ shape: 'shield', frameHex: '#121212', lensHex: '#c0281b', pos: [0, 4, 0], rot: [0.4, 0.3, -0.2], scale: 1.2 }, { shape: 'wayfarer', frameHex: '#ff6a00', lensHex: '#1c1c1c', pos: [-1, -7, -3], rot: [-0.2, -0.6, 0.15] }] },
    'campaign-b': { w: 1600, h: 1000, bg: 'side', cam: [0, 0, 30], items: [{ shape: 'cat-eye', frameHex: '#0a0a0a', lensHex: '#ff5a00', pos: [0, 0, 0], rot: [0.05, -0.15, 0], scale: 1.7 }] },
    'about-macro': { w: 1600, h: 1100, cam: [6, 1, 14], look: [4, 0, 0], items: [{ shape: 'wayfarer', frameHex: '#5a2d0c', lensHex: '#3e2414', pos: [0, 0, 0], rot: [0.2, -0.7, 0] }] },
    'about-wire': { w: 1200, h: 1500, cam: [0, 0, 40], items: [{ shape: 'round', frameHex: '#b8b8b8', lensHex: '#e8eef2', clear: true, pos: [0, 4, 0], rot: [0.3, 0.4, 0] }, { shape: 'aviator', frameHex: '#c9a24a', lensHex: '#2f3d2a', pos: [0, -5, 0], rot: [-0.2, -0.4, 0.1] }] },
    'about-lens': { w: 1600, h: 1100, bg: 'side', cam: [0, 0, 22], items: [{ shape: 'shield', frameHex: '#e6e6e6', lensHex: '#4fa3d9', pos: [0, 0, 0], rot: [0, 0.1, 0], scale: 1.2 }] },
  };
  for (const [name, sc] of Object.entries(scenes)) {
    save(`campaign/${name}.jpg`, await page.evaluate((o) => window.renderScene(o), sc));
    console.log('rendered', name);
  }
}

await browser.close();
srv.close();
