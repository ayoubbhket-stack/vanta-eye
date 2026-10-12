import { chromium } from 'playwright';
const B = process.env.BASE_URL || 'http://localhost:3000';
const OUT = process.argv[2] || 'tests/screenshots';
(await import('node:fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { sessionStorage.setItem('ve_loaded', '1'); } catch {} });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
let n = 0; const ok = (m) => console.log(`PASS  ${++n}. ${m}`);
const shot = (name) => p.screenshot({ path: `${OUT}/${name}.png` });
const stamp = Date.now().toString().slice(-5);
const NAME = `Test Pilot ${stamp}`;

// 1. admin login through the UI
await p.goto(B + '/admin/login');
await p.fill('#email', process.env.ADMIN_EMAIL || 'owner@vantaeye.test'); await p.fill('#pw', process.env.ADMIN_PASSWORD || 'VantaOwner2026');
await p.click('button:has-text("Sign in")');
await p.waitForURL(B + '/admin'); await p.waitForSelector('h1:has-text("Dashboard")');
ok('Admin signed in through the login form'); await shot('01-dashboard');

// 2. create product with image + variant stock, publish
await p.goto(B + '/admin/products/new');
await p.fill('#p-name', NAME);
await p.fill('#p-sku', `VE-TP${stamp}`);
await p.fill('#p-desc', 'A test frame created by the end-to-end check.');
await p.selectOption('#p-shape', 'aviator');
await p.fill('#p-price', '2999');
await p.fill('#p-cost', '1100');
await p.selectOption('#p-cat', { label: 'Sunglasses' });
await p.check('label.check:has-text("Sport") input');
await p.setInputFiles('.dropzone input[type=file] >> nth=0', 'seed-assets/products/halo-01-chrome-front.jpg');
await p.waitForSelector('.img-tile img');
await p.fill('input[aria-label="Stock"]', '5');
await p.click('button:has-text("Save & publish")');
await p.waitForURL(/\/admin\/products\/\d+$/); await p.waitForSelector('.pill.published');
ok('Product created with uploaded image, price, variant stock and published'); await shot('02-product-editor');
const slug = await p.inputValue('#p-slug');

// 3. appears on storefront, search + filter
await p.goto(`${B}/shop?q=${encodeURIComponent('Test Pilot')}`);
await p.waitForSelector(`.card-name:has-text("${NAME}")`);
ok('Published product found by storefront search');
await p.goto(`${B}/shop?collection=sport&shape=aviator`);
await p.waitForSelector(`.card-name:has-text("${NAME}")`);
ok('Product appears under Sport + aviator filters');
await p.goto(`${B}/shop?category=eyeglasses`);
if (await p.locator(`.card-name:has-text("${NAME}")`).count()) throw new Error('filter leak');
ok('Product correctly excluded from the Eyeglasses filter');

// 4/5. PDP: variant + add to cart; also add a multi-variant product
await p.goto(`${B}/product/${slug}`);
await p.click('.buy-row button:has-text("Add to cart")');
await p.waitForSelector('.drawer'); ok('Added test product to cart from product page (drawer opened)');
await p.click('button[aria-label="Close cart"]');
await p.goto(`${B}/product/ember-cat`);
await p.click('.color-opt:has-text("Matte Black")');
await p.click('.buy-row button:has-text("Add to cart")');
await p.waitForSelector('.drawer .mini-line >> nth=1');
const label = await p.textContent('.drawer .mini-line >> nth=1');
if (!label.includes('Matte Black')) throw new Error('variant not preserved: ' + label);
ok('Selected variant (Matte Black) preserved in cart'); await shot('03-cart-drawer');
await p.goto(B + '/cart');
await p.waitForSelector('.cart-line');
await p.click('.cart-line >> nth=0 >> button[aria-label="Increase quantity"]');
await p.waitForFunction(() => document.querySelector('.cart-line input[aria-label="Quantity"]').value === '2');
await p.fill('#code', 'WELCOME10'); await p.click('button:has-text("Apply")');
await p.waitForSelector('text=WELCOME10 applied');
ok('Quantity updated and discount applied in cart'); await shot('04-cart');

// refresh persistence
await p.reload(); await p.waitForSelector('.cart-line >> nth=1');
ok('Cart persisted after page refresh');

// 6. checkout with validation errors, then success
await p.goto(B + '/checkout');
await p.waitForSelector('#co-name');
await p.click('button:has-text("Place order")');
await p.waitForSelector('.field.has-error');
ok('Checkout shows validation errors for an empty form');
await p.fill('#co-name', 'Youssef Adel');
await p.fill('#co-phone', '0100' + stamp + '12');
await p.fill('#co-email', 'youssef@example.com');
await p.selectOption('#co-region', 'Giza');
await p.selectOption('#co-city', 'Dokki');
await p.fill('#co-address', '14 Tahrir St, building 2, apartment 7');
await p.waitForTimeout(800);
const totalText = await p.textContent('.summary .total b');
await shot('05-checkout');
await p.click('button:has-text("Place order")');
await p.waitForURL(/\/order\/VE-\d+\?t=/, { timeout: 30000 });
const number = await p.textContent('.num-big');
ok(`Order ${number} placed; confirmation shows total ${totalText}`); await shot('06-confirmation');
const cartAfter = await p.evaluate(() => JSON.parse(localStorage.getItem('ve_cart_v1') || '[]').length);
if (cartAfter !== 0) throw new Error('cart not cleared');
ok('Cart cleared after order');

// 7/8. admin sees order with matching total; stock decremented
await p.goto(`${B}/admin/orders?q=${number}`);
await p.click(`a:has-text("${number}")`);
await p.waitForSelector('h1.mono');
const adminTotal = await p.textContent('.kv >> nth=0 >> dd >> nth=-1');
if (adminTotal.replace(/\s/g, '') !== totalText.replace(/\s/g, '')) throw new Error(`total mismatch ${adminTotal} vs ${totalText}`);
ok(`Admin order detail total matches checkout (${adminTotal.trim()})`); await shot('07-admin-order');

// 9. update status + stock check
await p.click('button.btn:has-text("confirmed")'); await p.waitForSelector('.pill.confirmed');
await p.click('button.btn:has-text("shipped")'); await p.waitForSelector('h1 + .sub .pill.shipped');
ok('Order moved pending → confirmed → shipped');
await p.goto(`${B}/admin/inventory?q=TP${stamp}`);
const stockCell = await p.textContent('.tbl tbody tr >> nth=0 >> .pill');
if (stockCell.trim() !== '3') throw new Error('stock not decremented: ' + stockCell);
ok('Inventory shows 5 → 3 after the order of 2');
await p.click('button:has-text("Adjust")'); await p.fill('input[id^="v"]', '10'); await p.click('button:has-text("Save adjustment")');
await p.waitForFunction(() => document.querySelector('.tbl tbody tr .pill')?.textContent.trim() === '13');
ok('Manual stock adjustment (+10, restock) recorded'); await shot('08-inventory');

// 10. change homepage headline
await p.goto(B + '/admin/content');
await p.fill('#c-hero\\.headline', 'LIGHT, BENT TO YOUR WILL.');
await p.click('button:has-text("Save & publish")'); await p.waitForSelector('.adm-toast:has-text("Saved")');
await p.goto(B + '/'); await p.waitForSelector('h1[aria-label="LIGHT, BENT TO YOUR WILL."]');
ok('Homepage headline changed from admin and visible on the storefront');
await p.goto(B + '/admin/content');
await p.fill('#c-hero\\.headline', 'SEE THE WORLD DIFFERENTLY.');
await p.click('button:has-text("Save & publish")'); await p.waitForSelector('.adm-toast:has-text("Saved")');

// admin screenshots
for (const [u, f] of [['/admin', '09-dashboard-with-order'], ['/admin/reports', '10-reports'], ['/admin/collections', '11-collections'], ['/admin/settings?tab=integrations', '12-integrations']]) { await p.goto(B + u); await p.waitForTimeout(500); await shot(f); }

// 13. mobile
const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.addInitScript(() => { try { sessionStorage.setItem('ve_loaded', '1'); } catch {} });
const mp = await m.newPage();
for (const [u, f] of [['/', 'm1-home'], ['/shop', 'm2-shop'], ['/checkout', 'm3-checkout'], ['/collections', 'm4-collections']]) {
  await mp.goto(B + u); await mp.waitForTimeout(1500);
  const over = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 0) throw new Error(`horizontal overflow on ${u}: ${over}px`);
  await mp.screenshot({ path: `${OUT}/${f}.png` });
}
await mp.click('button[aria-label="Open menu"]'); await mp.waitForTimeout(700); await mp.screenshot({ path: `${OUT}/m5-menu.png` });
ok('Mobile pages render without horizontal overflow; menu opens');
console.log(errs.length ? `page errors: ${errs.slice(0, 5).join(' | ')}` : 'no page errors');
await b.close();
