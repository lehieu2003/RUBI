import { redirect } from 'next/navigation';

// Single-factory app: no public landing page. The middleware already
// redirects "/" by session; this is only the fallback.
export default function HomePage() {
  redirect('/login');
}
