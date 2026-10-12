'use client';
import Link from 'next/link';
import { useStore } from './StoreProvider';
import { EyeIcon, HeartIcon } from './Icons';
import { PriceTag } from './Overlays';
import { cartItemFrom } from './variants';

export default function ProductCard({ product, priority = false, index = 0 }) {
  const { addToCart, wish, toggleWish, setQuick, currency } = useStore();
  const main = product.images[0];
  const alt = product.images.find((i, k) => k > 0 && i.frameColor === main?.frameColor) || product.images[1];
  const inStock = product.variants.filter((v) => v.stock > 0);
  const onSale = product.salePrice != null && product.salePrice < product.price;
  const saved = wish.includes(product.slug);

  const quickAdd = () => {
    // one in-stock variant: add straight away; otherwise open the quick view to pick options
    if (inStock.length === 1) addToCart(cartItemFrom(product, inStock[0]));
    else setQuick(product);
  };

  return (
    <article className="card" data-reveal style={{ '--d': `${(index % 4) * 70}ms` }}>
      <div className="card-media">
        {main && <img className="main" src={main.url} alt={main.alt} loading={priority ? 'eager' : 'lazy'} decoding="async" />}
        {alt && <img className="alt" src={alt.url} alt="" loading="lazy" decoding="async" />}
        <div className="card-flags">
          {product.newArrival && <span className="tag dark">New</span>}
          {onSale && <span className="tag">Sale</span>}
          {product.collections.includes('limited') && <span className="tag line">Limited</span>}
        </div>
        {!product.inStock && <div className="soldout-veil"><span className="tag dark">Sold out</span></div>}
        <button className="icon-btn card-wish" aria-pressed={saved} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`} onClick={() => toggleWish(product.slug, product.name)}><HeartIcon /></button>
        <div className="card-actions">
          <button className="btn small" disabled={!product.inStock} onClick={quickAdd}>{product.inStock ? (inStock.length === 1 ? 'Add to cart' : 'Quick add') : 'Sold out'}</button>
          <button className="btn small ghost" style={{ flex: '0 0 auto', background: 'rgba(8,8,8,.7)' }} onClick={() => setQuick(product)} aria-label={`Quick view ${product.name}`}><EyeIcon /></button>
        </div>
      </div>
      <div className="card-body">
        <h3 className="card-name"><Link href={`/product/${product.slug}`}>{product.name}</Link></h3>
        <PriceTag product={product} currency={currency} />
        <div className="card-meta">
          <span className="dots" aria-label={`${product.frameColors.length} frame colours`}>{product.frameColors.slice(0, 5).map((c) => <span key={c.name} className="swatch" style={{ background: c.hex }} title={c.name} />)}</span>
          <span>{product.categoryName} · {product.frameShape}</span>
        </div>
        <p className="card-desc">{product.description}</p>
      </div>
    </article>
  );
}
