import { siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/cart', '/checkout', '/order', '/wishlist'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
