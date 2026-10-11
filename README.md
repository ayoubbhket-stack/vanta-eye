# VANTA EYE — 3D eyewear store with admin panel

A complete, multi-page ecommerce website for sunglasses and eyeglasses, with interactive Three.js visuals, a PostgreSQL database and a role-protected admin control panel. Brand name, content, products, prices and settings are all editable from `/admin`.

- **Storefront:** home, shop (search, filters, sort, grid/list, load more, quick view), product pages (gallery, 3D viewer, variants, stock, reviews, related, recently viewed), collections, about, cart, checkout, order confirmation, contact + FAQ, wishlist, policy pages, 404.
- **Admin (`/admin`):** dashboard, orders, products, categories & collections, inventory, customers, website content (homepage, about, FAQ, policies, footer), discounts, reports, inbox (messages, review moderation, newsletter), store settings, staff & roles.
- **Backend:** Next.js route handlers, PostgreSQL via Drizzle ORM, SQL migrations, server-side validation of prices / stock / discounts / totals, transactions with row locks, idempotent checkout.

---

## 1. Quick start (local)

Requirements: **Node.js 18.18+** (tested on Node 22).

```bash
npm install
cp .env.example .env            # defaults work locally
npm run setup                   # create tables + load sample catalogue
npm run admin:create -- --email you@yourbrand.com --name "Your Name"
#   → prints a strong one-time password (or pass --password '...')
npm run dev                     # http://localhost:3000  ·  admin: /admin
```

With `DATABASE_URL` empty, the app uses **PGlite** — a real PostgreSQL engine embedded in Node — stored in `./data/pglite`. No database server is needed for development.

> **Important with PGlite:** only one process may open `./data/pglite` at a time. Stop `npm run dev` before running `npm run setup`, `db:seed`, `admin:create` or `admin:reset-link`. This limitation does not exist with a normal PostgreSQL server.

Reset the sample catalogue (wipes products, orders, customers): `npm run db:seed -- --force`.

## 2. First administrator

Two secure options:

1. **Command line (recommended):** `npm run admin:create -- --email … --name … [--role owner|manager|staff] [--password …]`. Running it again for an existing email resets that password and signs out its sessions.
2. **Web setup:** set `SETUP_TOKEN` in the environment, open `/admin/setup`, enter the token and the owner details. The page refuses to work once any admin exists. Remove `SETUP_TOKEN` afterwards.

**Password recovery:** an owner can create a one-time reset link for any staff member (Admin → Staff → *Reset link*). If the owner is locked out: `npm run admin:reset-link -- --email owner@… --site https://yourdomain.com` prints a link valid for 60 minutes, usable once.

### Roles (checked on the server for every page and API call)

| Area | Owner | Manager | Staff |
|---|---|---|---|
| Dashboard, orders (view + update), inventory | ✓ | ✓ | ✓ |
| Revenue figures, reports | ✓ | ✓ | — |
| Products, categories, collections, website content, discounts | ✓ | ✓ | — |
| Customers list | ✓ | ✓ | — |
| Customer / order CSV exports | ✓ (customers), ✓ (orders) | orders only | — |
| Store settings, staff accounts | ✓ | — | — |

Security details: bcrypt password hashes; random session tokens stored hashed in the database; `httpOnly` + `SameSite=Lax` cookies (`Secure` in production); account lockout after 5 failed sign-ins (15 min); per-IP rate limits on login, checkout, contact and reviews; cross-site write requests rejected; the middleware is only a fast pre-check — every admin page and API verifies the session and role against the database.

## 3. Deploying to production

Any Node host works (Vercel, Railway, Render, a VPS). Example with **Vercel + Neon (or Supabase) Postgres**:

1. Create a Postgres database and copy its connection string.
2. On your computer, point `.env` at it and initialise it:
   ```bash
   DATABASE_URL="postgres://…?sslmode=require" npm run setup
   DATABASE_URL="postgres://…?sslmode=require" npm run admin:create -- --email … --name …
   ```
3. Create the Vercel project from this folder and set environment variables: `DATABASE_URL`, `SITE_URL` (e.g. `https://vantaeye.com`), plus optional Paymob / Resend keys below.
4. Deploy (`npm run build` / `npm start` on other hosts).

Future schema changes: edit `src/db/schema.js`, run `npm run db:generate` to create a new SQL migration in `./drizzle`, then `npm run db:migrate` against each database.

**Images and 3D models** are stored in the database (`media` table) and served from `/api/media/:id` with immutable caching, so uploads persist on serverless hosts without extra services. For very large catalogues you can move them to S3 / Cloudflare R2 by changing `src/app/api/admin/upload/route.js` and `src/app/api/media/[id]/route.js`; nothing else needs to change.

## 4. Payments (Paymob, Egypt)

Cash on delivery works out of the box. **Online payment stays hidden at checkout until all four variables are set**, and the admin shows it as “Not connected” until then:

```
PAYMOB_SECRET_KEY=        # Dashboard → Settings → Account info → Secret key
PAYMOB_PUBLIC_KEY=        # Public key
PAYMOB_INTEGRATION_ID=    # Online card (or wallet) integration id
PAYMOB_HMAC_SECRET=       # HMAC secret
```

In the Paymob dashboard set the integration’s **Transaction processed callback** to `https://YOUR_DOMAIN/api/payments/paymob/webhook`. Flow: the order is created (stock reserved, payment `pending`) → the customer is redirected to Paymob Unified Checkout → Paymob calls the webhook → the HMAC signature and amount are verified → only then is the order marked **paid**. Failed or abandoned payments stay `pending`/`failed`; cancel the order in the admin to return its stock.

> This integration follows Paymob’s Intention API and HMAC documentation but has **not been run against a live Paymob account**. Place a test transaction in Paymob’s test mode and confirm the webhook marks the order paid before going live. The code is in `src/lib/payments/paymob.js`.

## 5. Notifications (optional)

Set `RESEND_API_KEY` and `MAIL_FROM` (a verified sender at resend.com) to enable: new-order alerts to the address in *Settings → Notifications*, order confirmation emails to customers, and status emails (confirmed / shipped / delivered / cancelled). Without these keys nothing is sent and the admin says so. SMS/WhatsApp and courier integrations (e.g. Bosta) are **not** included; shipping fees come from the configurable delivery regions, and the customer’s phone number is on every order.

## 6. How the pieces fit

```
src/
  app/(store)/…        storefront pages (server components read the DB directly)
  app/admin/…          admin login/setup/reset + (panel)/ protected pages
  app/api/…            public APIs (quote, checkout, search, reviews, contact, media, webhook)
  app/api/admin/…      admin APIs (all call requireAdminApi(permission))
  components/store/    header, cart drawer, product card, filters, checkout…
  components/admin/    shell, editors, tables, charts
  components/three/    lazy-loaded Three.js engine + React viewer
  db/schema.js         all tables, constraints and indexes
  lib/                 auth, orders (pricing/checkout/stock), catalog, reports, settings, validation
drizzle/               SQL migrations
scripts/               migrate, seed, create-admin, reset-link, 3D asset renderer
seed-assets/           sample product photos, campaign images and GLB models
tests/                 API and browser acceptance tests
```

Key rules implemented in `src/lib/orders.js`:
- Prices, discounts, shipping, COD fee and tax are recomputed on the server; a client total that does not match is rejected with the new total.
- Checkout runs in one transaction with `SELECT … FOR UPDATE` on the variants, decrements stock with a `stock >= qty` guard and records stock movements; a `CHECK (stock >= 0)` constraint backs it up.
- Every checkout carries an idempotency key, so double-clicks and retries return the same order.
- Cancelling or refunding an order can return items to stock (once) and frees the discount usage.
- Order status and payment status are separate; every change is logged in the order history.

Revenue on the dashboard excludes cancelled and refunded orders. **Gross profit (est.)** is item revenue minus the product’s cost price and discounts, only for products with a cost price set; shipping and operating costs are not included.

## 7. 3D and imagery

- The storefront renders a procedural, physically-based glasses model (`src/lib/three/glasses.js`) for all eight frame shapes, with reflective lenses, metal/acetate materials and a custom studio environment. Three.js is loaded lazily after first paint; a still image shows until it is ready and stays if WebGL is unavailable. Animations respect `prefers-reduced-motion`.
- Upload a **GLB** per product in the product editor to replace the generated model. Name frame meshes/materials `frame` and lens meshes `lens` so colours follow the selected variant.
- All sample photography was rendered from the same 3D models. Regenerate with `npm run render:assets` (needs `npx playwright install chromium`). Replace with real product photography from the admin at any time.

## 8. Content placeholders to replace before launch

Brand story, about-page texts, timeline, policies (privacy and terms need legal review), contact details, social links and map link are placeholders. The 8 seeded reviews are labelled **“Sample review”** — delete them in *Admin → Inbox & reviews*. Seeded discount codes: `WELCOME10` (10% once per customer, min EGP 1,500) and `SPORT500` (EGP 500 off Sport). The tax default is “14% included in prices”; confirm with your accountant.

## 9. Arabic / RTL

The root layout sets `lang` and `dir`; layouts use logical CSS properties (`inline-start/end`) so switching to `dir="rtl"` mirrors the interface. Adding Arabic means adding translated strings and an Arabic display font; the database fields are UTF-8 and accept Arabic content today.

## 10. Tests

With the app running and the sample data loaded:

```bash
BASE_URL=http://localhost:3000 ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run test:api
npx playwright install chromium && BASE_URL=http://localhost:3000 ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run test:e2e
```

`test:api` (36 checks): unauthorised access, forged cookies, cross-site writes, server pricing, regional shipping, discount rules, validation, oversell protection, total tampering, duplicate submissions, stock decrement/restore, status transitions, staff permissions, account lockout.
`test:e2e` (18 steps, real browser): admin signs in, creates and publishes a product with an uploaded image, finds it in search and filters, adds variants to the cart, updates quantity, applies a code, refreshes, checks out with validation, confirms the order total in the admin, ships it, adjusts stock, edits the homepage headline, and checks mobile layouts. Both suites create real test orders/products — run them on a development database.

## 11. Known limitations

- Cart and wishlist are stored per browser (no customer accounts), so they do not follow a shopper across devices. Checkout always re-validates on the server.
- Rate limiting is in memory per server instance; behind several instances use a shared store (e.g. Redis) or your host’s firewall.
- Discount start/end times entered in the admin are interpreted in the server’s time zone (set `TZ=Africa/Cairo` on the host).
- PGlite is for development only; use PostgreSQL in production.
