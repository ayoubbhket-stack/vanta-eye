import './admin.css';

export const metadata = { title: { default: 'Admin', template: '%s · Admin' }, robots: { index: false, follow: false } };

export default function AdminRoot({ children }) {
  return children;
}
