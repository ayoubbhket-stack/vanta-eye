import Link from 'next/link';
import { CartView } from '@/components/store/CartCheckout';

export const metadata = { title: 'Cart', robots: { index: false } };

export default function Cart() {
  return (
    <>
      <section className="page-head" style={{ paddingBottom: 28 }}><div className="wrap spread">
        <div><nav className="steps" aria-label="Checkout steps"><span className="on">01 Cart</span><span>—</span><span>02 Checkout</span><span>—</span><span>03 Confirmation</span></nav><h1 className="display-l" style={{ marginTop: 18 }}>Cart</h1></div>
        <Link href="/shop" className="link label">Continue shopping →</Link>
      </div></section>
      <div className="wrap"><CartView /></div>
    </>
  );
}
