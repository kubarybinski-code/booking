'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const links = [
  ['Dashboard', '/admin'],
  ['Bookings', '/admin/bookings'],
  ['Flights', '/admin/flights'],
  ['Add-ons', '/admin/addons'],
  ['Discount codes', '/admin/discount-codes'],
  ['Slot templates', '/admin/slot-templates'],
  ['Daily slots', '/admin/daily-slots'],
  ['Settings', '/admin/settings'],
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  return (
    <aside className="w-full rounded-lg border bg-white p-3 md:w-64">
      <p className="mb-2 text-sm font-semibold text-slate-700">Admin Panel</p>
      <nav className="space-y-1">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className={`block rounded px-2 py-1 text-sm ${pathname === href ? 'bg-sky-100 text-sky-900' : 'text-slate-700 hover:bg-slate-100'}`}>
            {label}
          </Link>
        ))}
      </nav>
      <button onClick={signOut} className="mt-3 w-full rounded border px-2 py-1 text-sm">Sign out</button>
    </aside>
  );
}
