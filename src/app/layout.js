import '@fontsource-variable/unbounded';
import '@fontsource-variable/instrument-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './globals.css';
import { getSetting } from '@/lib/settings';
import { siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const store = await getSetting('store');
  const base = siteUrl();
  return {
    metadataBase: new URL(base),
    title: { default: store.seoTitle || store.name, template: `%s — ${store.name}` },
    description: store.seoDescription,
    openGraph: { siteName: store.name, type: 'website', locale: 'en_EG', title: store.seoTitle, description: store.seoDescription, images: [{ url: '/opengraph.jpg' }] },
    twitter: { card: 'summary_large_image' },
    icons: { icon: '/icon.svg' },
  };
}

export const viewport = { themeColor: '#080808', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  // `dir` is set here so an Arabic/RTL locale can be added later by switching
  // lang/dir; layout CSS uses logical properties (inline-start/end) throughout.
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
