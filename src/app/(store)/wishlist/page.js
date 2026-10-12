import Link from 'next/link';
import { WishlistView } from '@/components/store/Lists';

export const metadata = { title: 'Wishlist', robots: { index: false } };

export default function Wishlist() {
  return (
    <>
      <section className="page-head"><div className="wrap spread">
        <div><nav className="crumbs label"><Link href="/">Home</Link><span>/</span><span className="accent">Wishlist</span></nav><h1 className="display-l">Saved frames</h1></div>
        <p className="lede" style={{ margin: 0 }}>Frames you have saved on this device. Move them to your cart when you are ready.</p>
      </div></section>
      <div className="wrap" style={{ paddingBlock: '32px 96px' }}><WishlistView /></div>
    </>
  );
}
