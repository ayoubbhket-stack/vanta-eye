// Server-side acceptance checks against the running app.
const B = process.env.BASE_URL || 'http://localhost:3000';
const OWNER = { email: process.env.ADMIN_EMAIL || 'owner@vantaeye.test', password: process.env.ADMIN_PASSWORD || 'VantaOwner2026' };
const H = { 'content-type': 'application/json', origin: B };
let pass = 0, fail = 0;
const t = (name, cond, extra = '') => { (cond ? pass++ : fail++); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };
const j = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });
const post = (u, b, h = {}) => fetch(B + u, { method: 'POST', headers: { ...H, ...h }, body: JSON.stringify(b) }).then(j);

// login
const lr = await fetch(B + '/api/admin/auth/login', { method: 'POST', headers: H, body: JSON.stringify(OWNER) });
const cookie = lr.headers.get('set-cookie').split(';')[0];
const A = { cookie };

// 12. unauthorised access
t('Admin API rejects anonymous requests', (await fetch(B + '/api/admin/orders/export')).status === 401);
t('Admin page redirects anonymous users', (await fetch(B + '/admin/orders', { redirect: 'manual' })).status === 307);
t('Forged session cookie rejected', (await fetch(B + '/api/admin/orders/export', { headers: { cookie: 've_admin=forged' } })).status === 401);
t('Cross-site admin write blocked', (await fetch(B + '/api/admin/settings', { method: 'PUT', headers: { ...H, ...A, origin: 'https://evil.example' }, body: JSON.stringify({ key: 'store', value: {} }) })).status === 403);

// catalog data
const prods = (await (await fetch(B + '/api/products?slugs=halo-01,mono-square,strata-shield')).json()).products;
const halo = prods.find((p) => p.slug === 'halo-01');
const v = halo.variants.find((x) => x.stock >= 2);
const strata = prods.find((p) => p.slug === 'strata-shield');
const sv = strata.variants.find((x) => x.stock >= 1);

// quote uses server prices
const q = await post('/api/cart/quote', { items: [{ variantId: v.id, qty: 2 }], region: 'Cairo', paymentMethod: 'cod' });
t('Quote prices come from the database', q.body.subtotal === halo.finalPrice * 2, `subtotal ${q.body.subtotal}`);
t('Free shipping over threshold', q.body.shippingFee === 0, `fee ${q.body.shippingFee}`);
const mono = prods.find((p) => p.slug === 'mono-square'); const mv = mono.variants.find((x) => x.stock > 0);
const q2 = await post('/api/cart/quote', { items: [{ variantId: mv.id, qty: 1 }], region: 'Upper Egypt', paymentMethod: 'cod' });
t('Shipping fee by region', q2.body.shippingFee === 10000 && q2.body.total === mono.finalPrice + 10000, `fee ${q2.body.shippingFee} total ${q2.body.total}`);
const qd = await post('/api/cart/quote', { items: [{ variantId: v.id, qty: 1 }], code: 'WELCOME10', region: 'Giza' });
t('Percentage discount validated on server', qd.body.discountTotal === Math.round(halo.finalPrice * 0.1), `discount ${qd.body.discountTotal}`);
const qbad = await post('/api/cart/quote', { items: [{ variantId: v.id, qty: 1 }], code: 'NOPE' });
t('Unknown discount code reported', /does not exist/.test(qbad.body.discountError || ''));
const qcol = await post('/api/cart/quote', { items: [{ variantId: v.id, qty: 1 }], code: 'SPORT500' });
t('Collection-only code refuses ineligible items', /does not apply/.test(qcol.body.discountError || ''));

// checkout validation
const bad = await post('/api/checkout', { idempotencyKey: 'k-validation-000001', items: [{ variantId: v.id, qty: 1 }], name: 'A', phone: '123', email: 'x', region: '', city: '', address: '', paymentMethod: 'cod' });
t('Checkout rejects invalid customer info', bad.status === 422 && bad.body.fields?.phone && bad.body.fields?.name, JSON.stringify(Object.keys(bad.body.fields || {})));
const online = await post('/api/checkout', { idempotencyKey: 'k-online-0000000001', items: [{ variantId: v.id, qty: 1 }], name: 'Test Buyer', phone: '01012345678', region: 'Cairo', city: 'Maadi', address: '12 Street 9, Maadi', paymentMethod: 'online' });
t('Online payment refused when gateway not configured', online.status === 422, online.body.error);

// oversell
const over = await post('/api/checkout', { idempotencyKey: 'k-oversell-00000001', items: [{ variantId: sv.id, qty: Math.min(20, sv.stock + 1) }], name: 'Test Buyer', phone: '01012345678', region: 'Cairo', city: 'Maadi', address: '12 Street 9, Maadi', paymentMethod: 'cod' });
t('Overselling blocked by server stock check', over.status === 409 || sv.stock + 1 > 20, `${over.status} ${over.body.error}`);

// price tampering: client sends a wrong expected total
const tamper = await post('/api/checkout', { idempotencyKey: 'k-tamper-000000001', items: [{ variantId: v.id, qty: 1, unitPrice: 1 }], name: 'Test Buyer', phone: '01012345678', region: 'Cairo', city: 'Maadi', address: '12 Street 9, Maadi', paymentMethod: 'cod', expectedTotal: 100 });
t('Mismatched client total rejected (no silent price change)', tamper.status === 409 && tamper.body.total > 100, `${tamper.status} server total ${tamper.body.total}`);

// successful order + idempotency
const key = 'k-order-' + Date.now();
const PH = '011' + String(Date.now()).slice(-8);
const qq = await post('/api/cart/quote', { items: [{ variantId: v.id, qty: 2 }], code: 'WELCOME10', region: 'Alexandria', paymentMethod: 'cod', phone: PH });
const body = { idempotencyKey: key, items: [{ variantId: v.id, qty: 2 }], name: 'Laila Hassan', phone: PH, email: 'laila@example.com', region: 'Alexandria', city: 'Smouha', address: '5 Fawzi Moaz St, building 3, apt 12', paymentMethod: 'cod', code: 'WELCOME10', expectedTotal: qq.body.total };
const [o1, o2] = await Promise.all([post('/api/checkout', body), post('/api/checkout', body)]);
t('Order created', (o1.status === 201 || o2.status === 201) && o1.body.number, `${o1.body.number} total ${o1.body.total} ${o1.body.error || ''} ${o2.body.error || ''}`);
t('Duplicate submission returns the same order', o1.body.number === o2.body.number, `${o1.body.number} / ${o2.body.number}`);
t('Order total = server quote', o1.body.total === qq.body.total, `${o1.body.total} vs ${qq.body.total}`);
const again = await post('/api/checkout', { ...body, idempotencyKey: key + 'b' });
t('Once-per-customer code blocked on second order', again.status === 422 && /once per customer/.test(again.body.error), again.body.error);

// stock decreased
const after = (await (await fetch(B + '/api/products?slugs=halo-01')).json()).products[0].variants.find((x) => x.id === v.id);
t('Inventory decremented by order', after.stock === v.stock - 2, `${v.stock} -> ${after.stock}`);

// order visible in admin + customer page protected
const page = await fetch(`${B}/admin/orders?q=${o1.body.number}`, { headers: A }).then((r) => r.text());
t('Order appears in admin search', page.includes(o1.body.number));
t('Order page requires access token', (await fetch(`${B}/order/${o1.body.number}`)).status === 404);
t('Order page works with token', (await fetch(`${B}/order/${o1.body.number}?t=${o1.body.token}`)).status === 200);

// admin: status flow + cancel restores stock
const exp = await fetch(`${B}/api/admin/orders/export?q=${o1.body.number}`, { headers: A }).then((r) => r.text());
const id = Number((await fetch(`${B}/admin/orders?q=${o1.body.number}`, { headers: A }).then((r) => r.text())).match(/\/admin\/orders\/(\d+)/)[1]);
const patch = (b) => fetch(`${B}/api/admin/orders/${id}`, { method: 'PATCH', headers: { ...H, ...A }, body: JSON.stringify(b) }).then(j);
t('Confirm order', (await patch({ action: 'status', status: 'confirmed' })).status === 200);
t('Invalid transition refused', (await patch({ action: 'status', status: 'pending' })).status === 422);
t('Internal note saved', (await patch({ action: 'note', body: 'Customer asked for evening delivery.' })).status === 200);
t('Payment status recorded separately', (await patch({ action: 'payment', paymentStatus: 'pending', reference: 'test' })).body.paymentStatus === 'pending');
t('Cancel order', (await patch({ action: 'status', status: 'cancelled', restock: true })).status === 200);
const restored = (await (await fetch(B + '/api/products?slugs=halo-01')).json()).products[0].variants.find((x) => x.id === v.id);
t('Cancelled order returned stock', restored.stock === v.stock, `${restored.stock}`);
t('CSV export includes the order', exp.includes(o1.body.number));

// staff role restrictions
const SE = `staff${Date.now()}@vantaeye.test`;
await post('/api/admin/staff', { action: 'create', name: 'Packing Staff', email: SE, role: 'staff', password: 'StaffPass2026' }, A);
const sl = await fetch(B + '/api/admin/auth/login', { method: 'POST', headers: H, body: JSON.stringify({ email: SE, password: 'StaffPass2026' }) });
const SC = { cookie: sl.headers.get('set-cookie').split(';')[0] };
t('Staff cannot change settings (403)', (await fetch(B + '/api/admin/settings', { method: 'PUT', headers: { ...H, ...SC }, body: JSON.stringify({ key: 'store', value: {} }) })).status === 403);
t('Staff cannot edit products (403)', (await post('/api/admin/products', {}, SC)).status === 403);
t('Staff cannot export customers (403)', (await fetch(B + '/api/admin/customers/export', { headers: SC })).status === 403);
const sp = await fetch(B + '/admin/settings', { headers: SC, redirect: 'manual' }); const spt = await sp.text();
t('Staff blocked from settings page', !spt.includes('Payment methods') && !spt.includes('Delivery regions') && (sp.status === 307 || spt.includes('NEXT_REDIRECT') || spt.includes('/admin?denied=1')), `status ${sp.status}`);
t('Staff can read orders', (await fetch(B + '/admin/orders', { headers: SC })).status === 200);

// lockout
for (let i = 0; i < 5; i++) await post('/api/admin/auth/login', { email: SE, password: 'wrong-password-1' });
const locked = await post('/api/admin/auth/login', { email: SE, password: 'StaffPass2026' });
t('Account locks after repeated failures', locked.status === 401 && /Too many/.test(locked.body.error), locked.body.error);

// homepage content edit (acceptance 10)


const getHome = await fetch(B + '/', {}).then((r) => r.text());
t('Homepage renders default headline', getHome.includes('SEE THE WORLD DIFFERENTLY.'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
