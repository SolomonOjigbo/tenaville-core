import { redirect } from 'next/navigation';

export default function Home() {
  // There is no landing page: every surface is behind authentication (PROP-9).
  redirect('/dashboard');
}
