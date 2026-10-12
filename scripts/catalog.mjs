// Initial sample catalogue. Loaded into the database by `npm run db:seed`;
// after that, everything is edited from /admin. Prices are in EGP.

export const categories = [
  { name: 'Sunglasses', slug: 'sunglasses', description: 'Tinted, mirrored and polarised lenses with full UV400 protection.', sortOrder: 1 },
  { name: 'Eyeglasses', slug: 'eyeglasses', description: 'Optical frames supplied with clear demo lenses, ready for your prescription.', sortOrder: 2 },
];

export const collections = [
  { slug: 'signature', name: 'Signature', theme: 'signature', tagline: 'The house silhouettes.', description: 'The frames that define VANTA EYE: precise lines, heavy hinges and lenses tuned for hard Cairo light.', sortOrder: 1 },
  { slug: 'sport', name: 'Sport', theme: 'sport', tagline: 'Built to move.', description: 'Wrap shields and light frames with grip at the temples, made for desert runs and coastal roads.', sortOrder: 2 },
  { slug: 'minimal', name: 'Minimal', theme: 'minimal', tagline: 'Less frame, more face.', description: 'Clean geometry with nothing extra. Everyday frames that sit quietly and wear well.', sortOrder: 3 },
  { slug: 'retro', name: 'Retro', theme: 'retro', tagline: 'Old shapes, new lenses.', description: 'Round wire, cat-eye and thick 70s squares, rebuilt with modern lenses and hinges.', sortOrder: 4 },
  { slug: 'limited', name: 'Limited Edition', theme: 'limited', tagline: 'Numbered runs. No restock.', description: 'Small numbered runs in finishes we will not repeat. When a run sells out, it is gone.', sortOrder: 5 },
];

const C = {
  black: ['Matte Black', '#121212'], gloss: ['Gloss Black', '#0a0a0a'], gold: ['Brushed Gold', '#c9a24a'], gun: ['Gunmetal', '#55585c'],
  silver: ['Silver', '#b8b8b8'], orange: ['Signal Orange', '#ff6a00'], ivory: ['Ivory', '#e9e2d0'], white: ['Arctic White', '#e6e6e6'],
  grey: ['Crystal Grey', '#6d7074'], amber: ['Smoked Amber', '#5a2d0c'], rust: ['Rust', '#9a3f12'], sand: ['Sand', '#c2a27a'],
  chrome: ['Black Chrome', '#2a2a2e'], ochrome: ['Orange Chrome', '#ff7a1a'], olive: ['Olive', '#4b5a3a'],
};
const L = {
  smoke: ['Smoke', '#1c1c1c'], g15: ['G-15 Green', '#2f3d2a'], brown: ['Brown', '#3e2414'], omirror: ['Orange Mirror', '#ff5a00'],
  ice: ['Ice Blue Mirror', '#4fa3d9'], red: ['Red Mirror', '#c0281b'], rose: ['Rose', '#8a4a4f'], blue: ['Deep Blue', '#1d2f5a'],
  grey: ['Grey Gradient', '#3b3d40'], gold: ['Gold Mirror', '#c99a2e'], clear: ['Clear Demo Lens', '#e8eef2'],
};

// pairs: [frame key, lens key]
export const products = [
  { name: 'Halo 01', slug: 'halo-01', sku: 'VE-HAL01', category: 'sunglasses', shape: 'aviator', price: 4850, collections: ['signature'], featured: true,
    material: 'Beta-titanium frame, nylon lenses', pairs: [['gold', 'g15'], ['gun', 'smoke'], ['chrome', 'omirror']], sizes: ['M', 'L'],
    description: 'A teardrop aviator cut in thin beta-titanium. The double brow bar keeps the frame rigid while the lenses stay light. Adjustable silicone pads and spring hinges.',
    specs: { lensWidth: '58 mm', bridge: '14 mm', temple: '145 mm', weight: '22 g', uv: 'UV400', polarised: 'Yes' } },
  { name: 'Nox', slug: 'nox', sku: 'VE-NOX', category: 'sunglasses', shape: 'wayfarer', price: 3600, collections: ['signature', 'minimal'], featured: true, newArrival: true,
    material: 'Hand-polished acetate, 5-barrel hinges', pairs: [['gloss', 'smoke'], ['amber', 'brown'], ['orange', 'smoke']], sizes: ['M'],
    description: 'Our heaviest acetate, polished for three days. A flat brow and squared lens give Nox a hard, graphic line across the face.',
    specs: { lensWidth: '52 mm', bridge: '20 mm', temple: '145 mm', weight: '31 g', uv: 'UV400', polarised: 'No' } },
  { name: 'Ember Cat', slug: 'ember-cat', sku: 'VE-EMB', category: 'sunglasses', shape: 'cat-eye', price: 3950, salePrice: 3450, collections: ['retro', 'signature'], featured: true,
    material: 'Acetate front, metal-core temples', pairs: [['orange', 'brown'], ['black', 'smoke'], ['ivory', 'rose']], sizes: ['S', 'M'],
    description: 'A lifted cat-eye with a sharp outer flick. The thick acetate front catches light along its bevel.',
    specs: { lensWidth: '53 mm', bridge: '18 mm', temple: '140 mm', weight: '27 g', uv: 'UV400', polarised: 'No' } },
  { name: 'Strata Shield', slug: 'strata-shield', sku: 'VE-STR', category: 'sunglasses', shape: 'shield', price: 5200, collections: ['sport'], featured: true, newArrival: true,
    material: 'Grilamid TR-90, impact-rated polycarbonate lenses', pairs: [['white', 'omirror'], ['black', 'ice'], ['grey', 'smoke']], sizes: ['M', 'L'],
    description: 'A wide wrap shield that covers peripheral glare. TR-90 flexes instead of snapping, and the rubber temple tips hold through sweat.',
    specs: { lensWidth: '64 mm', bridge: '12 mm', temple: '130 mm', weight: '26 g', uv: 'UV400', polarised: 'Yes' } },
  { name: 'Pulse', slug: 'pulse', sku: 'VE-PLS', category: 'sunglasses', shape: 'shield', price: 4400, collections: ['sport'], newArrival: true,
    material: 'TR-90 frame, mirrored polycarbonate', pairs: [['black', 'red'], ['orange', 'smoke'], ['white', 'ice']], sizes: ['M'],
    description: 'A lighter sport frame for daily training. Vented lenses resist fogging on hot mornings.',
    specs: { lensWidth: '62 mm', bridge: '13 mm', temple: '128 mm', weight: '21 g', uv: 'UV400', polarised: 'No' } },
  { name: 'Mono Square', slug: 'mono-square', sku: 'VE-MON', category: 'sunglasses', shape: 'square', price: 3200, collections: ['minimal'], featured: true,
    material: 'Acetate, stainless steel core wire', pairs: [['black', 'smoke'], ['grey', 'grey'], ['sand', 'brown']], sizes: ['S', 'M', 'L'],
    description: 'A plain square with soft corners. Nothing on the temples, nothing on the front.',
    specs: { lensWidth: '51 mm', bridge: '19 mm', temple: '145 mm', weight: '25 g', uv: 'UV400', polarised: 'No' } },
  { name: 'Orbit', slug: 'orbit', sku: 'VE-ORB', category: 'sunglasses', shape: 'round', price: 3750, collections: ['retro'],
    material: 'Stainless steel wire frame', pairs: [['silver', 'blue'], ['gold', 'brown'], ['gun', 'g15']], sizes: ['M'],
    description: 'A thin round wire frame from the 70s playbook, with a keyhole bridge and acetate temple tips.',
    specs: { lensWidth: '49 mm', bridge: '21 mm', temple: '145 mm', weight: '18 g', uv: 'UV400', polarised: 'No' } },
  { name: 'Hex Field', slug: 'hex-field', sku: 'VE-HEX', category: 'sunglasses', shape: 'hexagon', price: 6900, collections: ['limited'], featured: true,
    material: 'Titanium, numbered run of 150', pairs: [['chrome', 'omirror'], ['gold', 'grey']], sizes: ['M'],
    description: 'Six flat sides in brushed titanium with an orange mirror lens. Numbered run of 150 pieces.',
    specs: { lensWidth: '52 mm', bridge: '19 mm', temple: '145 mm', weight: '19 g', uv: 'UV400', polarised: 'Yes', edition: '150 pieces' } },
  { name: 'Afterglow LE', slug: 'afterglow-le', sku: 'VE-AFT', category: 'sunglasses', shape: 'cat-eye', price: 7500, collections: ['limited'], soldOut: true,
    material: 'Orange chrome-plated acetate, numbered run of 80', pairs: [['ochrome', 'gold']], sizes: ['M'],
    description: 'A cat-eye coated in orange chrome with a gold mirror lens. Run of 80. Sold out; shown for the archive.',
    specs: { lensWidth: '54 mm', bridge: '17 mm', temple: '140 mm', weight: '29 g', uv: 'UV400', polarised: 'No', edition: '80 pieces' } },
  { name: 'Dune Oval', slug: 'dune-oval', sku: 'VE-DUN', category: 'sunglasses', shape: 'oval', price: 2950, salePrice: 2500, collections: ['minimal'],
    material: 'Acetate', pairs: [['sand', 'brown'], ['black', 'smoke']], sizes: ['S', 'M'],
    description: 'A narrow oval with a keyhole bridge. Small enough for narrower faces, light enough for all day.',
    specs: { lensWidth: '50 mm', bridge: '20 mm', temple: '140 mm', weight: '20 g', uv: 'UV400', polarised: 'No' } },
  { name: 'Kiln 70', slug: 'kiln-70', sku: 'VE-KLN', category: 'sunglasses', shape: 'square', price: 3400, collections: ['retro'], newArrival: true,
    material: 'Thick-cut acetate', pairs: [['rust', 'g15'], ['olive', 'brown'], ['gloss', 'gold']], sizes: ['M', 'L'],
    description: 'A thick 70s square in rust and olive acetate, with a deep keyhole and wide temples.',
    specs: { lensWidth: '54 mm', bridge: '20 mm', temple: '145 mm', weight: '33 g', uv: 'UV400', polarised: 'No' } },
  { name: 'Index', slug: 'index-optical', sku: 'VE-IDX', category: 'eyeglasses', shape: 'square', price: 2600, collections: ['minimal'], featured: true, clear: true,
    material: 'Acetate, demo lenses', pairs: [['black', 'clear'], ['grey', 'clear'], ['orange', 'clear']], sizes: ['S', 'M', 'L'],
    description: 'An everyday optical square. Supplied with clear demo lenses that any optician can replace with your prescription.',
    specs: { lensWidth: '51 mm', bridge: '18 mm', temple: '145 mm', weight: '22 g', uv: 'Prescription-ready', polarised: 'n/a' } },
  { name: 'Draft Round', slug: 'draft-round', sku: 'VE-DRF', category: 'eyeglasses', shape: 'round', price: 2850, collections: ['retro'], clear: true, newArrival: true,
    material: 'Stainless steel wire', pairs: [['gold', 'clear'], ['silver', 'clear']], sizes: ['M'],
    description: 'A round wire optical frame with adjustable pads. Light on the nose for long reading days.',
    specs: { lensWidth: '48 mm', bridge: '21 mm', temple: '140 mm', weight: '15 g', uv: 'Prescription-ready', polarised: 'n/a' } },
  { name: 'Frame 9', slug: 'frame-9', sku: 'VE-FR9', category: 'eyeglasses', shape: 'wayfarer', price: 2700, collections: ['signature'], clear: true,
    material: 'Acetate', pairs: [['gloss', 'clear'], ['orange', 'clear']], sizes: ['M', 'L'],
    description: 'The Nox silhouette as an optical frame. Heavy brow, clear lens.',
    specs: { lensWidth: '52 mm', bridge: '19 mm', temple: '145 mm', weight: '27 g', uv: 'Prescription-ready', polarised: 'n/a' } },
  { name: 'Grid Hex', slug: 'grid-hex', sku: 'VE-GRD', category: 'eyeglasses', shape: 'hexagon', price: 3100, collections: ['minimal', 'limited'], clear: true,
    material: 'Titanium', pairs: [['gun', 'clear'], ['gold', 'clear']], sizes: ['M'],
    description: 'A hexagonal titanium optical frame. Thin rims, sharp corners.',
    specs: { lensWidth: '50 mm', bridge: '20 mm', temple: '145 mm', weight: '14 g', uv: 'Prescription-ready', polarised: 'n/a' } },
  { name: 'Vale Oval', slug: 'vale-oval', sku: 'VE-VAL', category: 'eyeglasses', shape: 'oval', price: 2400, collections: ['minimal'], clear: true,
    material: 'Acetate', pairs: [['amber', 'clear'], ['grey', 'clear']], sizes: ['S', 'M'],
    description: 'A soft oval optical frame in smoked amber or crystal grey acetate.',
    specs: { lensWidth: '49 mm', bridge: '19 mm', temple: '140 mm', weight: '19 g', uv: 'Prescription-ready', polarised: 'n/a' } },
];

export const colorTable = { C, L };

// deterministic pseudo-random stock levels
export function stockFor(seed) {
  let x = 0; for (const ch of seed) x = (x * 31 + ch.charCodeAt(0)) % 9973;
  const v = x % 17;
  return v < 2 ? 0 : v < 4 ? 2 : v; // some sold-out and low-stock variants
}

export const sampleReviews = [
  ['halo-01', 'Omar H.', 'Cairo', 5, 'Light and sharp', 'Wore them for a full week in Sahel. The pads are adjustable and they never slipped.'],
  ['halo-01', 'Nour A.', 'Alexandria', 4, 'Good lenses', 'The G-15 lens is very clear. I wish the case was a little smaller.'],
  ['nox', 'Youssef M.', 'Giza', 5, 'Heavy in a good way', 'The acetate feels expensive and the hinges are solid.'],
  ['ember-cat', 'Salma K.', 'Cairo', 5, 'Exactly like the photos', 'The orange is bright without being cheap. Got compliments on day one.'],
  ['strata-shield', 'Karim F.', 'Hurghada', 5, 'Stays on while running', 'Ran 10K in them and they did not move. The orange mirror looks great.'],
  ['mono-square', 'Mariam S.', 'Mansoura', 4, 'Simple and clean', 'Exactly what I wanted. Size M fits a medium face well.'],
  ['index-optical', 'Ahmed R.', 'Cairo', 5, 'My optician loved the frame', 'Swapped in my prescription lenses in one day. Very comfortable.'],
  ['orbit', 'Laila G.', 'Cairo', 4, 'Classic round', 'Light on the nose. Lens is a little dark for evening driving.'],
];
