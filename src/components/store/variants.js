'use client';
import { useMemo, useState } from 'react';

/** Variant selection shared by the product page and quick view. */
export function useVariantSelection(product, initialFrame) {
  const firstInStock = product.variants.find((v) => v.stock > 0) || product.variants[0];
  const [frame, setFrame] = useState(initialFrame && product.variants.some((v) => v.frameColor === initialFrame) ? initialFrame : firstInStock?.frameColor);
  const [lens, setLens] = useState(firstInStock?.lensColor);
  const [size, setSize] = useState(firstInStock?.size);

  const lensesForFrame = useMemo(() => [...new Set(product.variants.filter((v) => v.frameColor === frame).map((v) => v.lensColor))], [product, frame]);
  const sizesFor = useMemo(() => product.variants.filter((v) => v.frameColor === frame && v.lensColor === lens), [product, frame, lens]);

  const variant = product.variants.find((v) => v.frameColor === frame && v.lensColor === lens && v.size === size)
    || product.variants.find((v) => v.frameColor === frame && v.lensColor === lens)
    || null;

  const pickFrame = (f) => {
    setFrame(f);
    const opts = product.variants.filter((v) => v.frameColor === f);
    const keep = opts.find((v) => v.lensColor === lens && v.size === size && v.stock > 0) || opts.find((v) => v.stock > 0) || opts[0];
    if (keep) { setLens(keep.lensColor); setSize(keep.size); }
  };
  const pickLens = (l) => {
    setLens(l);
    const opts = product.variants.filter((v) => v.frameColor === frame && v.lensColor === l);
    const keep = opts.find((v) => v.size === size && v.stock > 0) || opts.find((v) => v.stock > 0) || opts[0];
    if (keep) setSize(keep.size);
  };
  const frameStock = (f) => product.variants.filter((v) => v.frameColor === f).reduce((n, v) => n + v.stock, 0);
  const lensStock = (l) => product.variants.filter((v) => v.frameColor === frame && v.lensColor === l).reduce((n, v) => n + v.stock, 0);

  const images = product.images.filter((i) => i.frameColor === frame);
  return {
    frame, lens, size: variant?.size || size, variant, lensesForFrame, sizesFor,
    pickFrame, pickLens, setSize, frameStock, lensStock,
    images: images.length ? images : product.images,
  };
}

export function cartItemFrom(product, variant, qty = 1, image) {
  return {
    variantId: variant.id, productId: product.id, slug: product.slug, name: product.name,
    image: image || product.images.find((i) => i.frameColor === variant.frameColor)?.url || product.images[0]?.url || null,
    variantLabel: `${variant.frameColor} / ${variant.lensColor} / ${variant.size}`,
    unitPrice: product.finalPrice, qty, max: variant.stock,
  };
}

export function stockLabel(stock, threshold = 3) {
  if (stock <= 0) return { cls: 'out', text: 'Sold out' };
  if (stock <= threshold) return { cls: 'low', text: `Only ${stock} left` };
  return { cls: '', text: 'In stock, ships in 1 working day' };
}
