'use client';

import { StatusBadge, money, shortDate } from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/SessionContext';
import { refreshDb } from '@/hooks/use-data';
import { useMyApplications } from '@/hooks/use-apply';
import { withdrawApplication } from '@/lib/apply';
import { toast } from 'react-toastify';

const STATUS_COPY = {
  new: 'Submitted. The landlord has not looked at it yet.',
  screening: 'The landlord is reviewing your application.',
  approved: 'Approved. The landlord will be in touch about the lease.',
  declined: 'Not approved.',
  withdrawn: 'You withdrew this application.',
};

export default function MyApplications() {
  const { userId } = useSession();
  const { data: apps } = useMyApplications(userId);

  async function withdraw(id) {
    try {
      const result = await withdrawApplication(id);
      await refreshDb();
      toast.success(result.message);
    } catch (error) {
      toast.error(error.message);
    }
  }

  if (!apps?.length) return null;
  return (
    <section aria-labelledby='my-apps' className='flex flex-col gap-3'>
      <h2 id='my-apps' className='font-display text-lg font-bold'>
        Your applications
      </h2>
      <ul className='flex flex-col gap-3'>
        {apps.map((app) => (
          <li key={app.id} className='flex flex-col gap-2 rounded-xl border border-border/70 bg-card/40 p-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <p className='font-medium'>
                {app.property_name} · {app.unit_name}
              </p>
              <StatusBadge status={app.status} />
            </div>
            <p className='text-sm text-muted-foreground'>
              {STATUS_COPY[app.status]} Submitted {shortDate(app.created_at)}.
            </p>
            <p className='flex flex-wrap gap-x-4 text-xs text-muted-foreground'>
              <span>
                Identity: <span className='capitalize'>{app.idv_status.replace('_', ' ')}</span>
              </span>
              <span>
                Income:{' '}
                {app.income_status === 'verified' ? `${money(app.income_verified_cents)}/mo verified` : 'not verified'}
              </span>
            </p>
            {app.decision_note && <p className='rounded-lg bg-muted p-3 text-sm'>Landlord note: {app.decision_note}</p>}
            {(app.status === 'new' || app.status === 'screening') && (
              <div>
                <Button size='sm' variant='outline' onClick={() => withdraw(app.id)}>
                  Withdraw
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
