import ApplyView from '@/components/views/ApplyView';
import { Suspense } from 'react';

export const metadata = {
  title: 'Apply | Timeless Carat Properties',
  description: 'Apply for a rental and verify your identity and income securely with Plaid.',
};

export default function ApplyPage() {
  return (
    <Suspense fallback={null}>
      <ApplyView />
    </Suspense>
  );
}
