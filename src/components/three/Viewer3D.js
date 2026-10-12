'use client';
// React wrapper around the lazy-loaded Three.js engine. Shows a still image
// until the 3D scene is ready, and keeps it if WebGL is unavailable.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const Viewer3D = forwardRef(function Viewer3D({ shape, frameHex, lensHex, clear, modelUrl, mode = 'viewer', drag = true, poster, posterAlt = '', className = 'viewer', eager = false, ...opts }, ref) {
  const box = useRef(null);
  const api = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => ({ setAngle: (y, x) => api.current?.setAngle(y, x) }), []);

  useEffect(() => {
    let cancelled = false; let io;
    const start = async () => {
      try {
        const eng = await import('./engine');
        if (cancelled) return;
        if (!eng.webglAvailable()) { setFailed(true); return; }
        api.current = eng.createScene(box.current, { shape, frameHex, lensHex, clear, modelUrl, mode, drag, ...opts, onReady: () => !cancelled && setReady(true) });
      } catch (e) { console.warn(e); setFailed(true); }
    };
    if (eager) {
      const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
      idle(start);
    } else {
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '200px' });
      io.observe(box.current);
    }
    return () => { cancelled = true; io?.disconnect(); api.current?.dispose(); api.current = null; };
    // the model is created once; later changes go through setModel/setColors below
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    api.current?.setModel({ shape, frameHex, lensHex, clear, modelUrl });
  }, [shape, modelUrl, clear]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.current?.setColors({ frameHex, lensHex }); }, [frameHex, lensHex]);

  return (
    <div className={className} data-cursor={drag ? 'drag' : undefined} role="img" aria-label={posterAlt || `Interactive 3D model, ${shape} frame`}>
      {poster && <img src={poster} alt="" className={`hero-poster${ready && !failed ? ' gone' : ''}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} fetchPriority={mode === 'hero' ? 'high' : undefined} />}
      <div ref={box} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
});
export default Viewer3D;
