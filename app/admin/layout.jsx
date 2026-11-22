import AdminShell from '@/components/admin/AdminShell';

export const metadata = {
  title: { default: 'Management | Timeless Carat Properties', template: '%s | Management' },
  description: 'Manage units, tenants, leases, rent collection, maintenance, and landlords.',
  robots: { index: false },
};

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
