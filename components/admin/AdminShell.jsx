'use client';

import RequireSession from '@/components/RequireSession';
import { useSession } from '@/context/SessionContext';
import { cn } from '@/lib/utils';
import {
  Building2,
  ClipboardList,
  DoorOpen,
  FileSignature,
  Home,
  LayoutDashboard,
  Receipt,
  ShieldAlert,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/properties', label: 'Properties', icon: Home },
  { href: '/admin/vacancies', label: 'Vacancies', icon: DoorOpen },
  { href: '/admin/rent', label: 'Rent ledger', icon: Receipt },
  { href: '/admin/leases', label: 'Leases', icon: FileSignature },
  { href: '/admin/tenants', label: 'Tenants', icon: Users },
  { href: '/admin/units', label: 'Units', icon: Building2 },
  { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/admin/applications', label: 'Applications', icon: ClipboardList },
  { href: '/admin/landlords', label: 'Landlords', icon: UserRound },
];

function AdminGate({ children }) {
  const { session } = useSession();
  if (session?.user.role !== 'admin') {
    return (
      <section className='flex flex-col items-center gap-4 px-4 py-32 text-center'>
        <ShieldAlert className='size-10 text-primary' aria-hidden='true' />
        <h1 className='text-balance font-display text-3xl font-bold'>Administrators only</h1>
        <p className='max-w-md text-pretty leading-relaxed text-muted-foreground'>
          {"Your account doesn't have access to property management. Ask an administrator to grant you the admin role."}
        </p>
      </section>
    );
  }
  return children;
}

function AdminNav() {
  const pathname = usePathname();
  const isActive = (href) => (href === '/admin' ? pathname === href : pathname.startsWith(href));
  return (
    <nav aria-label='Management' className='lg:sticky lg:top-28 lg:self-start'>
      <p className='mb-3 hidden px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:block'>
        Management
      </p>
      <ul className='-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0'>
        {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
          <li key={href} className='shrink-0'>
            <Link
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground',
                isActive(href) && 'bg-secondary text-foreground'
              )}
            >
              <Icon className={cn('size-4', isActive(href) && 'text-primary')} aria-hidden='true' />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function AdminShell({ children }) {
  return (
    <RequireSession message='Sign in to manage properties'>
      <AdminGate>
        <div className='container flex flex-col gap-6 py-8 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 lg:py-12'>
          <AdminNav />
          <main className='flex min-w-0 flex-col gap-8'>{children}</main>
        </div>
      </AdminGate>
    </RequireSession>
  );
}
