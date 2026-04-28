'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/upload', label: 'Upload' },
  { href: '/requirements', label: 'Requirements' },
  { href: '/reports', label: 'Reports' },
  { href: '/traceability', label: 'Traceability' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen">
      <div className="px-4 py-5 border-b border-gray-100">
        <span className="text-lg font-bold text-gray-900">ReqLens</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${pathname.startsWith(href) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-gray-100">
        <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
      </div>
    </aside>
  );
}
