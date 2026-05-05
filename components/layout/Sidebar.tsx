'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOrgContext } from '@/lib/context/OrgContext';
import { OrgSwitcher } from '@/components/org/OrgSwitcher';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeOrg } = useOrgContext();
  const m = activeOrg?.member;

  const NAV = [
    { href: '/upload',            label: 'Upload',       show: m?.can_upload ?? true },
    { href: '/requirements',      label: 'Requirements', show: m?.can_review ?? true },
    { href: '/reports',           label: 'Reports',      show: m?.can_review ?? true },
    { href: '/traceability',      label: 'Traceability', show: m?.can_review ?? true },
    { href: '/settings/members',  label: 'Members',      show: m?.can_manage_users ?? false },
  ];

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
        {NAV.filter(n => n.show).map(({ href, label }) => (
          <Link key={href} href={href}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${pathname.startsWith(href) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-gray-100 space-y-2">
        <OrgSwitcher />
        <button onClick={signOut} className="w-full text-left px-3 py-1 text-sm text-gray-500 hover:text-gray-700">
          Sign out
        </button>
      </div>
    </aside>
  );
}
