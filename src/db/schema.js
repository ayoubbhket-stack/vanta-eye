// VANTA EYE — relational schema (PostgreSQL).
// Money is stored as integer piasters (1 EGP = 100) to avoid float rounding.
import {
  pgTable, text, integer, boolean, timestamp, jsonb, uuid, serial,
  primaryKey, uniqueIndex, index, customType, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const bytea = customType({ dataType: () => 'bytea' });
const now = (name = 'created_at') => timestamp(name, { withTimezone: true }).notNull().defaultNow();

/* ---------- Admin & auth ---------- */
export const adminUsers = pgTable('admin_users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  name: text().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text().notNull().default('staff'), // owner | manager | staff
  active: boolean().notNull().default(true),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: now(),
}, (t) => [check('role_chk', sql`${t.role} in ('owner','manager','staff')`)]);

export const adminSessions = pgTable('admin_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: uuid('user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ip: text(),
  userAgent: text('user_agent'),
  createdAt: now(),
});

export const passwordResets = pgTable('password_resets', {
  tokenHash: text('token_hash').primaryKey(),
  userId: uuid('user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: now(),
});

/* ---------- Media (images + 3D models) ---------- */
export const media = pgTable('media', {
  id: uuid().primaryKey().defaultRandom(),
  filename: text().notNull(),
  mime: text().notNull(),
  size: integer().notNull(),
  data: bytea().notNull(),
  createdAt: now(),
});

/* ---------- Catalog ---------- */
export const categories = pgTable('categories', {
  id: serial().primaryKey(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  description: text().notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  published: boolean().notNull().default(true),
});

export const collections = pgTable('collections', {
  id: serial().primaryKey(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  tagline: text().notNull().default(''),
  description: text().notNull().default(''),
  coverMediaId: uuid('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
  theme: text().notNull().default('signature'), // layout treatment
  sortOrder: integer('sort_order').notNull().default(0),
  published: boolean().notNull().default(true),
  featuredHome: boolean('featured_home').notNull().default(true),
});

export const products = pgTable('products', {
  id: serial().primaryKey(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  sku: text().notNull().unique(),
  description: text().notNull().default(''),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  price: integer().notNull(),
  salePrice: integer('sale_price'),
  costPrice: integer('cost_price'), // optional unit cost, used for gross-profit reporting
  frameShape: text('frame_shape').notNull().default('square'),
  material: text().notNull().default(''),
  specs: jsonb().notNull().default({}), // { lensWidth, bridge, temple, weight, uv, ... }
  modelMediaId: uuid('model_media_id').references(() => media.id, { onDelete: 'set null' }),
  status: text().notNull().default('draft'), // draft | published | archived
  featured: boolean().notNull().default(false),
  newArrival: boolean('new_arrival').notNull().default(false),
  seoTitle: text('seo_title').notNull().default(''),
  seoDescription: text('seo_description').notNull().default(''),
  createdAt: now(),
  updatedAt: now('updated_at'),
}, (t) => [
  check('price_chk', sql`${t.price} >= 0`),
  check('sale_chk', sql`${t.salePrice} is null or (${t.salePrice} >= 0 and ${t.salePrice} < ${t.price})`),
  check('status_chk', sql`${t.status} in ('draft','published','archived')`),
  index('products_status_idx').on(t.status),
]);

export const productCollections = pgTable('product_collections', {
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  collectionId: integer('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.productId, t.collectionId] })]);

export const productImages = pgTable('product_images', {
  id: serial().primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  mediaId: uuid('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  alt: text().notNull().default(''),
  frameColor: text('frame_color'), // ties an image to a frame-colour variant
  sortOrder: integer('sort_order').notNull().default(0),
});

export const productVariants = pgTable('product_variants', {
  id: serial().primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sku: text().notNull().unique(),
  frameColor: text('frame_color').notNull(),
  frameHex: text('frame_hex').notNull().default('#111111'),
  lensColor: text('lens_color').notNull(),
  lensHex: text('lens_hex').notNull().default('#222222'),
  size: text().notNull().default('M'),
  stock: integer().notNull().default(0),
  active: boolean().notNull().default(true),
}, (t) => [
  check('stock_chk', sql`${t.stock} >= 0`),
  uniqueIndex('variant_combo_uq').on(t.productId, t.frameColor, t.lensColor, t.size),
]);

export const stockMovements = pgTable('stock_movements', {
  id: serial().primaryKey(),
  variantId: integer('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  delta: integer().notNull(),
  stockAfter: integer('stock_after').notNull(),
  reason: text().notNull(), // initial | sale | cancel | refund | adjustment | restock | damage | count
  note: text().notNull().default(''),
  orderId: integer('order_id'),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: now(),
}, (t) => [index('sm_variant_idx').on(t.variantId)]);

/* ---------- Customers & orders ---------- */
export const customers = pgTable('customers', {
  id: serial().primaryKey(),
  name: text().notNull(),
  phone: text().notNull().unique(),
  email: text().notNull().default(''),
  region: text().notNull().default(''),
  city: text().notNull().default(''),
  address: text().notNull().default(''),
  createdAt: now(),
});

export const discounts = pgTable('discounts', {
  id: serial().primaryKey(),
  code: text().notNull().unique(),
  description: text().notNull().default(''),
  type: text().notNull(), // percent | fixed
  value: integer().notNull(), // percent: 1-100 ; fixed: piasters
  minOrder: integer('min_order').notNull().default(0),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').notNull().default(0),
  perCustomerOnce: boolean('per_customer_once').notNull().default(false),
  appliesTo: text('applies_to').notNull().default('all'), // all | category | collection
  targetId: integer('target_id'),
  active: boolean().notNull().default(true),
  createdAt: now(),
}, (t) => [check('type_chk', sql`${t.type} in ('percent','fixed')`)]);

export const orders = pgTable('orders', {
  id: serial().primaryKey(),
  number: text().notNull().unique(),
  accessToken: text('access_token').notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  name: text().notNull(),
  phone: text().notNull(),
  email: text().notNull().default(''),
  region: text().notNull(),
  city: text().notNull(),
  address: text().notNull(),
  customerNote: text('customer_note').notNull().default(''),
  subtotal: integer().notNull(),
  discountTotal: integer('discount_total').notNull().default(0),
  shippingFee: integer('shipping_fee').notNull().default(0),
  codFee: integer('cod_fee').notNull().default(0),
  taxTotal: integer('tax_total').notNull().default(0), // tax added on top (0 when prices include tax)
  total: integer().notNull(),
  discountId: integer('discount_id').references(() => discounts.id, { onDelete: 'set null' }),
  discountCode: text('discount_code'),
  paymentMethod: text('payment_method').notNull(), // cod | online
  paymentStatus: text('payment_status').notNull().default('unpaid'), // unpaid | pending | paid | failed | refunded
  status: text().notNull().default('pending'),
  stockRestored: boolean('stock_restored').notNull().default(false),
  createdAt: now(),
  updatedAt: now('updated_at'),
}, (t) => [
  check('order_status_chk', sql`${t.status} in ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')`),
  index('orders_created_idx').on(t.createdAt),
]);

export const orderItems = pgTable('order_items', {
  id: serial().primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  name: text().notNull(),
  sku: text().notNull(),
  variantLabel: text('variant_label').notNull(),
  unitPrice: integer('unit_price').notNull(),
  unitCost: integer('unit_cost'), // snapshot of product cost at time of sale (null if unknown)
  qty: integer().notNull(),
  lineTotal: integer('line_total').notNull(),
}, (t) => [check('qty_chk', sql`${t.qty} > 0`)]);

export const orderEvents = pgTable('order_events', {
  id: serial().primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  kind: text().notNull(), // status | payment | note | created
  fromValue: text('from_value'),
  toValue: text('to_value'),
  body: text().notNull().default(''),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: now(),
});

export const payments = pgTable('payments', {
  id: serial().primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  provider: text().notNull(), // cod | paymob | manual
  status: text().notNull(), // pending | paid | failed | refunded
  amount: integer().notNull(),
  reference: text().notNull().default(''),
  raw: jsonb().notNull().default({}),
  createdAt: now(),
});

export const discountRedemptions = pgTable('discount_redemptions', {
  id: serial().primaryKey(),
  discountId: integer('discount_id').notNull().references(() => discounts.id, { onDelete: 'cascade' }),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  customerId: integer('customer_id'),
  amount: integer().notNull(),
  createdAt: now(),
});

/* ---------- Community ---------- */
export const reviews = pgTable('reviews', {
  id: serial().primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  city: text().notNull().default(''),
  rating: integer().notNull(),
  title: text().notNull().default(''),
  body: text().notNull(),
  status: text().notNull().default('pending'), // pending | approved | rejected
  createdAt: now(),
}, (t) => [check('rating_chk', sql`${t.rating} between 1 and 5`)]);

export const subscribers = pgTable('subscribers', {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  createdAt: now(),
});

export const contactMessages = pgTable('contact_messages', {
  id: serial().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
  phone: text().notNull().default(''),
  subject: text().notNull().default(''),
  body: text().notNull(),
  read: boolean().notNull().default(false),
  createdAt: now(),
});

/* ---------- Settings & editable content ---------- */
// keys: store, shipping, home, about, contact, policies, footer
export const settings = pgTable('settings', {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: now('updated_at'),
});
