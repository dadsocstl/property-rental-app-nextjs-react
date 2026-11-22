import RequireSession from '@/components/RequireSession';
import RenterDashboard from '@/components/renter/RenterDashboard';

export const metadata = {
  title: 'My rent',
  description: 'View your rent charges and pay by card or bank transfer.',
};

export default function RenterPage() {
  return (
    <RequireSession message='Sign in to view and pay your rent'>
      <RenterDashboard />
    </RequireSession>
  );
}
