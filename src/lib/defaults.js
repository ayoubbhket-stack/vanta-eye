// Default editable content and store settings. Every key is stored in the
// `settings` table and edited from /admin; these values are only used to fill
// gaps (e.g. a field added in a later version).

export const DEFAULTS = {
  store: {
    name: 'VANTA EYE',
    tagline: 'Eyewear for hard light.',
    logoMediaId: null,
    currency: 'EGP',
    email: 'hello@vantaeye.example',
    phone: '+20 100 000 0000',
    whatsapp: '+20 100 000 0000',
    address: 'Showroom address placeholder, Cairo, Egypt',
    hours: 'Sat–Thu, 11:00–21:00',
    showMap: true,
    mapUrl: 'https://maps.google.com/?q=Cairo,Egypt',
    social: { instagram: 'https://instagram.com/', facebook: 'https://facebook.com/', tiktok: 'https://tiktok.com/', x: '' },
    seoTitle: 'VANTA EYE — Sunglasses & Eyeglasses in Egypt',
    seoDescription: 'Sunglasses and optical frames designed for hard light. Shop online with cash on delivery across Egypt.',
    lowStockThreshold: 3,
    taxRate: 14, // percent
    taxIncluded: true, // true: catalogue prices include tax (shown for information); false: tax added at checkout
    taxLabel: 'VAT (included)',
    paymentMethods: { cod: true, online: true },
    codFee: 0, // piasters
    notifyEmail: '',
    notifyOnNewOrder: true,
    notifyCustomerOnStatus: true,
  },
  shipping: {
    freeShippingOver: 500000, // piasters; 0 = never free
    regions: [
      { name: 'Cairo', fee: 6000, days: '1–2', cities: ['Nasr City', 'Heliopolis', 'Maadi', 'New Cairo', 'Downtown', 'Zamalek', 'Shorouk', 'Madinaty', 'Other'] },
      { name: 'Giza', fee: 6000, days: '1–2', cities: ['Dokki', 'Mohandessin', 'Sheikh Zayed', '6th of October', 'Haram', 'Other'] },
      { name: 'Alexandria', fee: 7500, days: '2–3', cities: ['Smouha', 'Sidi Gaber', 'Miami', 'Agami', 'Borg El Arab', 'Other'] },
      { name: 'Delta', fee: 8500, days: '2–4', cities: ['Mansoura', 'Tanta', 'Zagazig', 'Damanhour', 'Kafr El Sheikh', 'Shebin El Kom', 'Other'] },
      { name: 'Canal', fee: 8500, days: '2–4', cities: ['Port Said', 'Ismailia', 'Suez', 'Other'] },
      { name: 'Upper Egypt', fee: 10000, days: '3–5', cities: ['Minya', 'Assiut', 'Sohag', 'Qena', 'Luxor', 'Aswan', 'Other'] },
      { name: 'Red Sea & Sinai', fee: 12000, days: '3–6', cities: ['Hurghada', 'El Gouna', 'Sharm El Sheikh', 'Dahab', 'Marsa Alam', 'Other'] },
      { name: 'North Coast', fee: 9500, days: '2–4', cities: ['Sahel', 'Marsa Matrouh', 'El Alamein', 'Other'] },
    ],
  },
  home: {
    announcement: { enabled: true, text: 'Free shipping across Egypt on orders over EGP 5,000 · Cash on delivery', href: '/shop' },
    hero: {
      eyebrow: 'FW26 — Hard Light',
      headline: 'SEE THE WORLD DIFFERENTLY.',
      text: 'Sunglasses and optical frames cut for Egyptian sun. Titanium, thick acetate and mirrored lenses, delivered anywhere in the country.',
      primaryLabel: 'SHOP SUNGLASSES', primaryHref: '/shop?category=sunglasses',
      secondaryLabel: 'EXPLORE COLLECTION', secondaryHref: '/collections',
      imageMediaId: null, // optional poster image; the 3D model renders on top
      modelShape: 'aviator', frameHex: '#2a2a2e', lensHex: '#ff5a00',
    },
    sections: [
      { key: 'promo', enabled: true, title: 'The Limited run is live', text: 'Hex Field, 150 numbered pieces. No restock.', href: '/shop?collection=limited', label: 'Shop limited' },
      { key: 'featured', enabled: true, title: 'Featured frames', text: 'The pairs we reach for first this season.' },
      { key: 'collections', enabled: true, title: 'Five collections', text: 'Each with its own lens, its own line.' },
      { key: 'showcase', enabled: true, title: 'The full line-up', text: 'Drag or scroll sideways.' },
      { key: 'philosophy', enabled: true, title: 'Built for the light we live in', text: 'Egyptian sun is hard, bright and reflected off stone, sea and sand. We design every lens for that light first, and every frame to survive a summer of it.' },
      { key: 'shapes', enabled: true, title: 'Find your shape', text: 'Eight frame shapes, eleven lens colours. Tap to compare.' },
      { key: 'spotlight', enabled: true, title: 'Turn it over', text: 'Drag to inspect every bevel and hinge.', productSlug: 'hex-field' },
      { key: 'campaign', enabled: true, title: 'Hard Light', text: 'Shot after midday, when the sun is at its worst and the lenses are at their best.' },
      { key: 'bestsellers', enabled: true, title: 'Best sellers', text: 'Ranked by units ordered.' },
      { key: 'newarrivals', enabled: true, title: 'New arrivals', text: 'Just landed.' },
      { key: 'reviews', enabled: true, title: 'Worn in Egypt', text: 'What customers say after a summer in their frames.' },
      { key: 'newsletter', enabled: true, title: 'First to know', text: 'New runs, restocks and limited drops. One email a month, no spam.' },
    ],
    campaignImages: [], // media ids for the campaign section
    featuredProductSlugs: [], // empty = use products flagged "featured"
    bestsellerSlugs: [], // empty = calculated from orders
  },
  about: {
    headline: 'WE MAKE FRAMES FOR HARD LIGHT.',
    intro: 'VANTA EYE is a placeholder brand story. Replace this paragraph with who you are, where you started and why you make eyewear.',
    story: 'Write the origin of the brand here: the first frame, the first customer, the moment the idea became a business. Keep it short and specific.',
    philosophy: 'Describe how you think about design. For example: one strong line per frame, lenses chosen before frames, nothing added that does not do a job.',
    process: [
      { title: 'Shape', text: 'Describe how a silhouette is chosen and refined.' },
      { title: 'Material', text: 'Describe how you choose acetate, metal or TR-90 for each frame.' },
      { title: 'Lens', text: 'Describe how lens tints, coatings and protection levels are selected.' },
      { title: 'Finish', text: 'Describe the polishing, hinges and final checks.' },
    ],
    timeline: [
      { year: 'Year 1', title: 'First sketch', text: 'Add your first milestone.' },
      { year: 'Year 2', title: 'First collection', text: 'Add the launch of your first collection.' },
      { year: 'Year 3', title: 'Online store', text: 'Add when you started selling online.' },
      { year: 'Now', title: 'Hard Light', text: 'Add your current chapter.' },
    ],
    difference: [
      { title: 'Lens first', text: 'Explain what is different about your lenses.' },
      { title: 'Weight', text: 'Explain how you approach comfort and weight.' },
      { title: 'Runs, not seasons', text: 'Explain how you release products.' },
    ],
    values: ['Precision', 'Durability', 'Honest pricing', 'Local service'],
    images: [], // media ids for editorial photography
  },
  contact: {
    intro: 'Questions about sizing, orders or prescriptions? Write to us and we reply within one working day.',
    faqs: [
      { group: 'Orders', q: 'How do I pay?', a: 'Cash on delivery is available across Egypt. Card payment appears at checkout when it is enabled for the store.' },
      { group: 'Orders', q: 'Can I change my order after placing it?', a: 'Contact us with your order number before it ships and we will update it.' },
      { group: 'Shipping', q: 'How long does delivery take?', a: 'Cairo and Giza: 1–2 working days. Other regions: 2–6 working days depending on the city.' },
      { group: 'Shipping', q: 'How much is shipping?', a: 'Shipping is calculated by region at checkout. Orders above the free-shipping threshold ship free.' },
      { group: 'Returns', q: 'What is your return policy?', a: 'Unworn frames in original packaging can be returned within 14 days of delivery.' },
      { group: 'Returns', q: 'Can I add prescription lenses?', a: 'All optical frames ship with clear demo lenses that any optician can replace with your prescription.' },
    ],
  },
  policies: {
    shipping: 'Orders are prepared within one working day.\n\nDelivery times and fees depend on your region and are shown at checkout before you confirm.\n\nYou will be contacted by phone before delivery.',
    returns: 'You can return unworn frames in their original packaging within 14 days of delivery.\n\nContact us with your order number to arrange a pickup. Refunds are issued after the item is inspected.\n\nLimited Edition frames can be returned only if faulty.',
    privacy: 'This is placeholder privacy policy text. Describe what personal data you collect (name, phone, email, address), why you collect it (to deliver orders and provide support), how long you keep it and how customers can request deletion.\n\nHave this text reviewed before launch.',
    terms: 'This is placeholder terms and conditions text. Describe ordering, pricing, payment, delivery, returns, warranty and liability.\n\nHave this text reviewed before launch.',
  },
  footer: {
    about: 'Sunglasses and optical frames designed for hard light. Delivered across Egypt.',
    newsletterTitle: 'Join the list',
    newsletterText: 'New runs and restocks, once a month.',
    copyright: 'VANTA EYE. All rights reserved.',
  },
};
