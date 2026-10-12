import Link from 'next/link';
import { getSetting } from '@/lib/settings';
import { mediaUrl } from '@/lib/catalog';

export async function generateMetadata() {
  const a = await getSetting('about');
  return { title: 'About', description: a.intro.slice(0, 155), alternates: { canonical: '/about' } };
}

export default async function About() {
  const a = await getSetting('about');
  const imgs = (a.images || []).map(mediaUrl);
  return (
    <>
      <section className="section about-hero" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <p className="label accent" data-reveal>About the brand</p>
          <h1 style={{ marginTop: 16 }}>{a.headline.split(' ').map((w, i) => <span key={i} className="split-line" style={{ display: 'inline-block', marginInlineEnd: '.25em' }}><span style={{ animation: `rise 1s var(--ease) ${i * 70}ms both` }}>{w}</span></span>)}</h1>
          <p className="lede" style={{ marginTop: 28 }}>{a.intro}</p>
        </div>
        {imgs[0] && <div className="wrap"><div className="img"><img src={imgs[0]} alt="Close-up of an acetate frame hinge" data-parallax="0.1" /></div></div>}
      </section>

      <section className="section">
        <div className="wrap chapters">
          {[['01', 'The story', a.story], ['02', 'Design philosophy', a.philosophy]].map(([k, t, body]) => (
            <div className="chapter" key={k} data-reveal><span className="k">{k}</span><h2>{t}</h2><p className="muted" style={{ fontSize: '1.08rem' }}>{body}</p></div>
          ))}
        </div>
      </section>

      <div className="values-marquee" aria-label={`Values: ${a.values.join(', ')}`}>
        <div className="track" aria-hidden="true">{[...a.values, ...a.values, ...a.values].map((v, i) => <span key={i}>{v}</span>)}</div>
      </div>

      <section className="section">
        <div className="wrap">
          <div className="section-head" data-reveal><h2 className="display-l">How a frame is made</h2><p className="lede">From silhouette to final check. Replace each step with your real process.</p></div>
          <div className="process">
            {a.process.map((s, i) => <div key={i} data-reveal style={{ '--d': `${i * 90}ms` }}><span className="n">{String(i + 1).padStart(2, '0')}</span><h3 className="display-s">{s.title}</h3><p className="muted" style={{ margin: 0 }}>{s.text}</p></div>)}
          </div>
        </div>
      </section>

      {imgs.length > 1 && (
        <section className="section tight"><div className="wrap editorial">
          <figure data-reveal><img src={imgs[1]} alt="Round wire and aviator frames" loading="lazy" /><figcaption className="label">Wire & metal</figcaption></figure>
          {imgs[2] && <figure data-reveal><img src={imgs[2]} alt="Shield with ice blue mirror lens" loading="lazy" /><figcaption className="label">Lens study</figcaption></figure>}
        </div></section>
      )}

      <section className="section">
        <div className="wrap grid12" style={{ alignItems: 'start' }}>
          <div style={{ gridColumn: 'span 4' }} data-reveal><p className="label accent">Milestones</p><h2 className="display-m" style={{ marginTop: 12 }}>Timeline</h2></div>
          <div className="timeline" data-progress style={{ gridColumn: 'span 8' }}>
            <span className="fill" aria-hidden="true" />
            {a.timeline.map((t, i) => <div className="tl-item" key={i} data-reveal><span /><span className="y">{t.year}</span><div><h3 className="display-s">{t.title}</h3><p className="muted" style={{ margin: '8px 0 0' }}>{t.text}</p></div></div>)}
          </div>
        </div>
      </section>

      <section className="section" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="wrap">
          <div className="section-head" data-reveal><h2 className="display-l">What makes it different</h2><Link className="btn ghost" href="/shop" style={{ justifySelf: 'end' }}>Shop the frames</Link></div>
          <div className="diff">{a.difference.map((d, i) => <div key={i} data-reveal style={{ '--d': `${i * 90}ms` }}><h3 className="display-s">{d.title}</h3><p className="muted" style={{ margin: 0 }}>{d.text}</p></div>)}</div>
        </div>
      </section>
    </>
  );
}
