import { z } from 'zod';
import { normalizePhone } from './orders';

const trim = (min, max, msg) => z.string({ required_error: msg }).trim().min(min, msg).max(max, `Use at most ${max} characters.`);

export const cartItems = z.array(z.object({ variantId: z.coerce.number().int().positive(), qty: z.coerce.number().int().min(1).max(20) })).max(50);

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(16).max(80),
  items: cartItems.min(1, 'Your cart is empty.'),
  name: trim(3, 80, 'Enter your full name.'),
  phone: z.string().trim().transform(normalizePhone).refine((p) => /^01[0125]\d{8}$/.test(p), 'Enter an Egyptian mobile number, e.g. 010 1234 5678.'),
  email: z.string().trim().max(120).email('Enter a valid email address.').or(z.literal('')).optional().default(''),
  region: trim(2, 60, 'Choose your region.'),
  city: trim(2, 60, 'Choose or enter your city.'),
  address: trim(8, 300, 'Enter the street, building and apartment.'),
  note: z.string().trim().max(500).optional().default(''),
  code: z.string().trim().max(40).optional().default(''),
  paymentMethod: z.enum(['cod', 'online'], { errorMap: () => ({ message: 'Choose a payment method.' }) }),
  expectedTotal: z.number().int().nonnegative().optional(),
});

export const contactSchema = z.object({
  name: trim(2, 80, 'Enter your name.'),
  email: z.string().trim().email('Enter a valid email address.').max(120),
  phone: z.string().trim().max(30).optional().default(''),
  subject: z.string().trim().max(80).optional().default(''),
  body: trim(10, 4000, 'Write at least a short message (10 characters).'),
});

export const reviewSchema = z.object({
  productId: z.coerce.number().int().positive(),
  name: trim(2, 60, 'Enter your name.'),
  city: z.string().trim().max(60).optional().default(''),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional().default(''),
  body: trim(10, 2000, 'Write at least 10 characters.'),
});
