import { z } from 'zod';

const str = (max = 300) => z.string().max(max).default('');
const href = z.string().max(300).refine((v) => !v || v.startsWith('/') || /^https?:\/\//.test(v), 'Links must start with / or https://').default('');
const media = z.string().uuid().nullable().optional();

export const CONTENT = {
  home: z.object({
    announcement: z.object({ enabled: z.boolean(), text: str(200), href }),
    hero: z.object({
      eyebrow: str(80), headline: z.string().trim().min(2, 'Headline is required.').max(80), text: str(400),
      primaryLabel: str(40), primaryHref: href, secondaryLabel: str(40), secondaryHref: href, imageMediaId: media,
      modelShape: z.enum(['aviator', 'round', 'square', 'cat-eye', 'wayfarer', 'shield', 'hexagon', 'oval']),
      frameHex: z.string().regex(/^#[0-9a-fA-F]{6}$/), lensHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    }),
    sections: z.array(z.object({ key: z.string().max(30), enabled: z.boolean(), title: str(120), text: str(600), href: href.optional(), label: str(40).optional(), productSlug: str(120).optional() })).max(20),
    campaignImages: z.array(z.string().uuid()).max(4).default([]),
    featuredProductSlugs: z.array(z.string().max(120)).max(12).default([]),
    bestsellerSlugs: z.array(z.string().max(120)).max(12).default([]),
  }),
  about: z.object({
    headline: str(120), intro: str(1200), story: str(3000), philosophy: str(3000),
    process: z.array(z.object({ title: str(80), text: str(600) })).max(8),
    timeline: z.array(z.object({ year: str(20), title: str(80), text: str(600) })).max(20),
    difference: z.array(z.object({ title: str(80), text: str(600) })).max(6),
    values: z.array(z.string().max(40)).max(10),
    images: z.array(z.string().uuid()).max(6).default([]),
  }),
  contact: z.object({ intro: str(600), faqs: z.array(z.object({ group: str(40), q: z.string().min(3).max(200), a: z.string().min(3).max(2000) })).max(60) }),
  policies: z.object({ shipping: str(10000), returns: str(10000), privacy: str(20000), terms: str(20000) }),
  footer: z.object({ about: str(400), newsletterTitle: str(60), newsletterText: str(200), copyright: str(120) }),
};

const email = z.string().trim().email('Enter a valid email.').or(z.literal(''));
export const SETTINGS = {
  store: z.object({
    name: z.string().trim().min(2, 'Store name is required.').max(60), tagline: str(120), logoMediaId: media,
    currency: z.string().trim().length(3, 'Use a 3-letter currency code.').toUpperCase(),
    email, phone: str(40), whatsapp: str(40), address: str(300), hours: str(120), showMap: z.boolean(), mapUrl: href,
    social: z.object({ instagram: href, facebook: href, tiktok: href, x: href }),
    seoTitle: str(70), seoDescription: str(170),
    lowStockThreshold: z.coerce.number().int().min(0).max(1000),
    taxRate: z.coerce.number().min(0).max(50), taxIncluded: z.boolean(), taxLabel: str(40),
    paymentMethods: z.object({ cod: z.boolean(), online: z.boolean() }),
    codFee: z.coerce.number().int().min(0).max(1000000),
    notifyEmail: email, notifyOnNewOrder: z.boolean(), notifyCustomerOnStatus: z.boolean(),
  }).refine((s) => s.paymentMethods.cod || s.paymentMethods.online, { message: 'Enable at least one payment method.', path: ['paymentMethods'] }),
  shipping: z.object({
    freeShippingOver: z.coerce.number().int().min(0),
    regions: z.array(z.object({ name: z.string().trim().min(2).max(60), fee: z.coerce.number().int().min(0).max(10000000), days: str(20), cities: z.array(z.string().trim().min(1).max(60)).max(80) })).min(1, 'Add at least one delivery region.').max(40),
  }),
};
