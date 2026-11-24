'use client';

import ApplyForm from '@/components/apply/ApplyForm';
import MyApplications from '@/components/apply/MyApplications';
import RequireSession from '@/components/RequireSession';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function ApplyView() {
  const params = useSearchParams();
  const propertyId = params.get('property');
  const unitId = params.get('unit');
  const [submitted, setSubmitted] = useState(false);

  return (
    <RequireSession message='Sign in to apply'>
      <section className='container m-auto flex max-w-3xl flex-col gap-10 px-6 py-10'>
        <header className='flex flex-col gap-2'>
          <h1 className='text-balance font-display text-3xl font-bold'>Apply for a rental</h1>
          <p className='text-pretty text-muted-foreground'>
            Verify your identity and income with Plaid so the landlord can review a complete application.
          </p>
        </header>

        {submitted ? (
          <div role='status' className='flex flex-col items-start gap-3 rounded-xl border border-border/70 bg-card/40 p-6'>
            <p className='font-display text-xl font-bold'>Application submitted</p>
            <p className='text-muted-foreground'>The landlord can now see your verified details. You can track the decision below.</p>
            <Button asChild variant='outline'>
              <Link href='/properties'>Keep browsing</Link>
            </Button>
          </div>
        ) : propertyId ? (
          <ApplyForm propertyId={propertyId} initialUnitId={unitId} onSubmitted={() => setSubmitted(true)} />
        ) : (
          <p className='text-muted-foreground'>
            Pick a property to apply for.{' '}
            <Link href='/properties' className='font-medium text-primary hover:underline'>
              Browse properties
            </Link>
          </p>
        )}

        <MyApplications />
      </section>
    </RequireSession>
  );
}
