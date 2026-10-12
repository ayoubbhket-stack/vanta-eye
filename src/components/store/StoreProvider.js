'use client';
// Client-side shopping state shared by every storefront page: cart, wishlist,
// recently viewed, toasts, the cart drawer and the quick-view modal.
// The cart lives in localStorage so it survives refreshes; prices and stock are
// always re-checked against the server (/api/cart/quote) before checkout.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const Ctx = createContext(null);
const KEYS = { cart: 've_cart_v1', wish: 've_wish_v1', recent: 've_recent_v1' };

const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export function StoreProvider({ children, currency = 'EGP' }) {
  const [cart, setCart] = useState([]);
  const [wish, setWish] = useState([]);
  const [recent, setRecent] = useState([]);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [drawer, setDrawer] = useState(false);
  const [quick, setQuick] = useState(null);
  const [bump, setBump] = useState(0);
  const tid = useRef(0);

  useEffect(() => {
    setCart(read(KEYS.cart, [])); setWish(read(KEYS.wish, [])); setRecent(read(KEYS.recent, []));
    setReady(true);
    const onStorage = (e) => {
      if (e.key === KEYS.cart) setCart(read(KEYS.cart, []));
      if (e.key === KEYS.wish) setWish(read(KEYS.wish, []));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => { if (ready) write(KEYS.cart, cart); }, [cart, ready]);
  useEffect(() => { if (ready) write(KEYS.wish, wish); }, [wish, ready]);
  useEffect(() => { if (ready) write(KEYS.recent, recent); }, [recent, ready]);

  const toast = useCallback((text, opts = {}) => {
    const id = ++tid.current;
    setToasts((t) => [...t.slice(-2), { id, text, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.ms || 3600);
  }, []);

  const addToCart = useCallback((item, { open = true } = {}) => {
    setCart((c) => {
      const i = c.findIndex((x) => x.variantId === item.variantId);
      if (i > -1) {
        const next = [...c];
        next[i] = { ...next[i], ...item, qty: Math.min(item.max || 20, next[i].qty + (item.qty || 1)) };
        return next;
      }
      return [...c, { ...item, qty: Math.min(item.max || 20, item.qty || 1) }];
    });
    setBump((b) => b + 1);
    if (open) setDrawer(true);
  }, []);
  const setQty = useCallback((variantId, qty) => setCart((c) => c.map((x) => (x.variantId === variantId ? { ...x, qty: Math.max(1, Math.min(20, qty)) } : x))), []);
  const removeFromCart = useCallback((variantId) => setCart((c) => c.filter((x) => x.variantId !== variantId)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const replaceCart = useCallback((items) => setCart(items), []);

  const toggleWish = useCallback((slug, name) => {
    setWish((w) => {
      const has = w.includes(slug);
      toast(has ? `${name || 'Item'} removed from wishlist` : `${name || 'Item'} saved to wishlist`, has ? {} : { href: '/wishlist', action: 'View' });
      return has ? w.filter((x) => x !== slug) : [slug, ...w];
    });
  }, [toast]);
  const removeWish = useCallback((slug) => setWish((w) => w.filter((x) => x !== slug)), []);
  const pushRecent = useCallback((slug) => setRecent((r) => [slug, ...r.filter((x) => x !== slug)].slice(0, 12)), []);

  const count = cart.reduce((n, x) => n + x.qty, 0);
  const value = useMemo(() => ({
    ready, cart, count, wish, recent, currency, toasts, drawer, quick, bump,
    addToCart, setQty, removeFromCart, clearCart, replaceCart, toggleWish, removeWish, pushRecent,
    toast, setDrawer, setQuick,
  }), [ready, cart, count, wish, recent, currency, toasts, drawer, quick, bump, addToCart, setQty, removeFromCart, clearCart, replaceCart, toggleWish, removeWish, pushRecent, toast]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

export function money(p, currency = 'EGP') {
  const v = (Number(p) || 0) / 100;
  return `${currency} ${v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
