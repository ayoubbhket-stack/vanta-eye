'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Viewer3D from '../three/Viewer3D';
import { ArrowIcon, ShapeGlyph } from './Icons';
import { useStore, money } from './StoreProvider';

export function HomeHero({ hero, poster, sizeNote }) {
  const words = (hero.headline || '').split(/\s+/).filter(Boolean);
  return (
    <section className="hero" aria-label="Introduction">
      <Viewer3D className="hero-canvas" mode="hero" eager drag={false} poster={poster} posterAlt="A pair of sunglasses with orange mirrored lenses"
        shape={hero.modelShape || 'aviator'} frameHex={hero.frameHex || '#2a2a2e'} lensHex={hero.lensHex || '#ff5a00'}
        fit={13} distance={36} offsetX={7.5} initialY={-0.5} initialX={0.16} />
      <div className="wrap hero-inner">
        <div>
          {hero.eyebrow && <p className="label accent" style={{ marginBottom: 18 }}>{hero.eyebrow}</p>}
          <h1 className="display-xl" aria-label={hero.headline}>
            {words.map((w, i) => <span className="word" key={i} aria-hidden="true"><span style={{ '--i': i }}>{w}</span>{i < words.length - 1 ? ' ' : ''}</span>)}
          </h1>
          <p className="lede">{hero.text}</p>
          <div className="row">
            {hero.primaryLabel && <Link className="btn" href={hero.primaryHref || '/shop'}>{hero.primaryLabel} <span className="arrow">→</span></Link>}
            {hero.secondaryLabel && <Link className="btn ghost" href={hero.secondaryHref || '/collections'}>{hero.secondaryLabel}</Link>}
          </div>
        </div>
        <div className="hero-spec" aria-hidden="true">
          <span className="label">Frame size</span>
          <span className="big">{sizeNote}</span>
          <span className="label">Lens · Bridge · Temple (mm)</span>
        </div>
      </div>
      <span className="scroll-cue" aria-hidden="true" />
    </section>
  );
}

export function Showcase({ products, title, text }) {
  const track = useRef(null);
  const bar = useRef(null);
  const drag = useRef({ on: false, x: 0, left: 0, moved: 0 });
  const { currency } = useStore();
  useEffect(() => {
    const t = track.current;
    const on = () => { const max = t.scrollWidth - t.clientWidth; if (bar.current) bar.current.style.width = `${max ? (t.scrollLeft / max) * 100 : 0}%`; };
    t.addEventListener('scroll', on, { passive: true }); on();
    return () => t.removeEventListener('scroll', on);
  }, []);
  const by = (dir) => track.current.scrollBy({ left: dir * track.current.clientWidth * 0.7, behavior: 'smooth' });
  return (
    <section className="section hscroll" aria-label={title}>
      <div className="wrap spread" style={{ marginBottom: 36 }} data-reveal>
        <div><p className="label accent">{products.length} frames</p><h2 className="display-l">{title}</h2></div>
        <div className="row"><p className="muted" style={{ margin: 0 }}>{text}</p>
          <div className="hscroll-controls"><button className="icon-btn" style={{ border: '1px solid var(--line)' }} onClick={() => by(-1)} aria-label="Scroll left"><ArrowIcon dir="left" /></button><button className="icon-btn" style={{ border: '1px solid var(--line)' }} onClick={() => by(1)} aria-label="Scroll right"><ArrowIcon /></button></div>
        </div>
      </div>
      <div ref={track} className="hscroll-track" data-cursor="drag" tabIndex={0} aria-label="Product showcase, scroll horizontally"
        onPointerDown={(e) => { if (e.pointerType !== 'mouse') return; drag.current = { on: true, x: e.clientX, left: track.current.scrollLeft, moved: 0 }; }}
        onPointerMove={(e) => { const d = drag.current; if (!d.on) return; d.moved = Math.abs(e.clientX - d.x); if (d.moved > 4) track.current.classList.add('dragging'); track.current.scrollLeft = d.left - (e.clientX - d.x); }}
        onPointerUp={() => { drag.current.on = false; track.current.classList.remove('dragging'); }}
        onPointerLeave={() => { drag.current.on = false; track.current.classList.remove('dragging'); }}
        onClickCapture={(e) => { if (drag.current.moved > 6) { e.preventDefault(); e.stopPropagation(); drag.current.moved = 0; } }}>
        {products.map((p, i) => (
          <Link key={p.slug} href={`/product/${p.slug}`} className="hscroll-item card" draggable={false}>
            <div className="card-media">
              <img className="main" src={p.images[0]?.url} alt={p.images[0]?.alt || p.name} loading="lazy" draggable={false} />
              {p.images[1] && <img className="alt" src={p.images[1].url} alt="" loading="lazy" draggable={false} />}
              <span className="idx num">{String(i + 1).padStart(2, '0')} / {String(products.length).padStart(2, '0')}</span>
            </div>
            <div className="spread" style={{ alignItems: 'baseline' }}><h3>{p.name}</h3><span className="price num">{money(p.finalPrice, currency)}</span></div>
            <span className="label">{p.frameShape} · {p.material}</span>
          </Link>
        ))}
      </div>
      <div className="hscroll-progress" aria-hidden="true"><span ref={bar} /></div>
    </section>
  );
}

const LENSES = [
  ['Smoke', '#1c1c1c', 'Neutral grey. Cuts brightness evenly without shifting colour.'],
  ['G-15 Green', '#2f3d2a', 'Classic green-grey. High contrast with natural colour.'],
  ['Brown', '#3e2414', 'Warm tint. Sharpens depth on sand and roads.'],
  ['Orange Mirror', '#ff5a00', 'Mirrored coating that bounces glare off the surface.'],
  ['Ice Blue Mirror', '#4fa3d9', 'Cool mirror for water, snow and coastal light.'],
  ['Red Mirror', '#c0281b', 'Contrast lens for sport, fast to read terrain.'],
  ['Clear Demo Lens', '#e8eef2', 'Optical frames ship with clear demo lenses for your prescription.'],
];

export function ShapeCompare({ shapes, title, text }) {
  const all = shapes.length ? shapes : ['aviator', 'round', 'square', 'cat-eye', 'wayfarer', 'shield', 'hexagon', 'oval'];
  const [shape, setShape] = useState(all[0]);
  const [lens, setLens] = useState(LENSES[3]);
  const isClear = lens[0].startsWith('Clear');
  return (
    <section className="section" aria-label={title}>
      <div className="wrap compare">
        <div className="compare-stage" data-reveal>
          <Viewer3D shape={shape} frameHex="#141414" lensHex={lens[1]} clear={isClear} fit={15} distance={34} posterAlt={`${shape} frame with ${lens[0]} lens`} />
          <div className="compare-readout"><span className="label accent">{shape}</span><span className="display-s">{lens[0]}</span></div>
        </div>
        <div className="stack" style={{ gap: 28 }} data-reveal>
          <div><p className="label accent">Compare</p><h2 className="display-l" style={{ marginTop: 10 }}>{title}</h2><p className="lede" style={{ marginTop: 16 }}>{text}</p></div>
          <div className="stack" style={{ gap: 10 }}>
            <span className="label">Frame shape</span>
            <div className="shape-grid">{all.map((s) => <button key={s} className="shape-btn" aria-pressed={shape === s} onClick={() => setShape(s)}><ShapeGlyph shape={s} /><span>{s}</span></button>)}</div>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <span className="label">Lens colour</span>
            <div className="lens-row">{LENSES.map((l) => <button key={l[0]} className="lens-btn" aria-pressed={lens[0] === l[0]} aria-label={l[0]} title={l[0]} onClick={() => setLens(l)}><i style={{ background: l[1] }} /></button>)}</div>
            <p className="muted" style={{ margin: 0, minHeight: '3.2em' }}>{lens[2]}</p>
          </div>
          <Link className="btn ghost" href={`/shop?shape=${shape}`} style={{ alignSelf: 'start' }}>Shop {shape} frames <span className="arrow">→</span></Link>
        </div>
      </div>
    </section>
  );
}

export function Spotlight({ product, title, text }) {
  const { currency } = useStore();
  const v = product.variants.find((x) => x.stock > 0) || product.variants[0];
  const [i, setI] = useState(0);
  const colors = product.frameColors;
  const frame = colors[i] || colors[0];
  const lens = product.variants.find((x) => x.frameColor === frame?.name) || v;
  return (
    <section className="section" aria-label={title} style={{ background: 'var(--bg-2)' }}>
      <div className="wrap spotlight">
        <div className="stack" style={{ gap: 22 }} data-reveal>
          <p className="label accent">{title}</p>
          <h2 className="big-name">{product.name}</h2>
          <p className="lede">{text} {product.description}</p>
          <dl className="spec-list">
            {Object.entries(product.specs).slice(0, 5).map(([k, val]) => <div key={k}><dt>{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt><dd>{val}</dd></div>)}
          </dl>
          <div className="row">{colors.map((c, k) => <button key={c.name} className="color-opt" aria-pressed={k === i} onClick={() => setI(k)}><span className="swatch" style={{ background: c.hex }} />{c.name}</button>)}</div>
          <div className="row"><Link className="btn" href={`/product/${product.slug}`}>View {product.name} — {money(product.finalPrice, currency)}</Link></div>
        </div>
        <div className="spotlight-stage" data-reveal>
          <Viewer3D shape={product.frameShape} modelUrl={product.modelUrl} frameHex={frame?.hex} lensHex={lens?.lensHex} poster={product.images[0]?.url} fit={16} distance={33} posterAlt={`3D model of ${product.name}`} />
          <span className="hint label">Drag to rotate</span>
        </div>
      </div>
    </section>
  );
}
