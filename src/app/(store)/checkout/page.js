import { CheckoutView } from '@/components/store/CartCheckout';
import { getSetting } from '@/lib/settings';

export const metadata = { title: 'Checkout', robots: { index: false } };

export default async function Checkout() {
  const shipping = await getSetting('shipping');
  return (
    <>
      <section className="page-head" style={{ paddingBottom: 28 }}><div className="wrap">
        <nav className="steps" aria-label="Checkout steps"><span>01 Cart</span><span>—</span><span className="on">02 Checkout</span><span>—</span><span>03 Confirmation</span></nav>
        <h1 className="display-l" style={{ marginTop: 18 }}>Checkout</h1>
      </div></section>
      <div className="wrap"><CheckoutView regions={shipping.regions} /></div>
    </>
  );
}
