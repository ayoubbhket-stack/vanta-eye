const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, viewBox: '0 0 24 24' };
export const SearchIcon = () => <svg {...P}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>;
export const HeartIcon = () => <svg {...P}><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" /></svg>;
export const BagIcon = () => <svg {...P}><path d="M5 8h14l-1.2 12H6.2L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>;
export const MenuIcon = () => <svg {...P}><path d="M4 8h16M4 16h10" /></svg>;
export const CloseIcon = () => <svg {...P}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const GridIcon = () => <svg {...P}><rect x="4" y="4" width="6.5" height="6.5" /><rect x="13.5" y="4" width="6.5" height="6.5" /><rect x="4" y="13.5" width="6.5" height="6.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" /></svg>;
export const ListIcon = () => <svg {...P}><rect x="4" y="5" width="5" height="5" /><path d="M12 7.5h8" /><rect x="4" y="14" width="5" height="5" /><path d="M12 16.5h8" /></svg>;
export const ArrowIcon = ({ dir = 'right' }) => <svg {...P} style={{ width: 18, height: 18, transform: dir === 'left' ? 'scaleX(-1)' : undefined }}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const FilterIcon = () => <svg {...P} style={{ width: 18, height: 18 }}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>;
export const EyeIcon = () => <svg {...P} style={{ width: 16, height: 16 }}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
export function LogoMark({ className = 'logo-mark' }) {
  return (
    <svg className={className} viewBox="0 0 60 30" aria-hidden="true">
      <circle cx="14" cy="15" r="11" fill="none" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="46" cy="15" r="11" fill="#FF6A00" />
      <path d="M25 12.5c3-2 7-2 10 0" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
// Outline glyphs for each frame shape (used by the shape comparator).
export function ShapeGlyph({ shape }) {
  const d = {
    aviator: 'M6 10c0-3 4-4 9-4s6 1 6 3c0 5-3 11-8 11S6 15 6 10Z',
    round: 'M14 6a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z',
    square: 'M6 7h15v12H6z',
    'cat-eye': 'M5 8c4 0 12-1 17-4-1 6-1 15-9 15S5 13 5 8Z',
    wayfarer: 'M4 7h18l-2 11H7z',
    shield: 'M3 8c6-2 14-2 19 0l-1 8c-1 3-5 4-9 4s-7-2-8-5z',
    hexagon: 'M9 5h9l4 8-4 8H9l-4-8z',
    oval: 'M13.5 7c5 0 8 2.5 8 6s-3 6-8 6-8-2.5-8-6 3-6 8-6Z',
  }[shape] || 'M6 7h15v12H6z';
  return (
    <svg viewBox="0 0 54 26" fill="none" strokeWidth="1.8" aria-hidden="true">
      <path d={d} /><path d={d} transform="matrix(-1 0 0 1 54 0)" /><path d="M22 10c2-1.6 8-1.6 10 0" />
    </svg>
  );
}
