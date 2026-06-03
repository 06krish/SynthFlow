import { cookies } from 'next/headers';
import LandingPageClient from './LandingPageClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cookieStore = await cookies();
  const email = cookieStore.get('user_email')?.value || null;
  const role = cookieStore.get('user_role')?.value || null;

  return (
    <LandingPageClient initialUser={{ email, role }} />
  );
}

