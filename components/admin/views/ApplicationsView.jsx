'use client';

import ApplicationReview from '@/components/admin/ApplicationReview';
import FormDialog from '@/components/admin/FormDialog';
import {
  EmptyRow,
  Field,
  PageHeader,
  QueryState,
  Select,
  StatusBadge,
  TableShell,
  Td,
  Th,
  humanize,
  money,
  shortDate,
} from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminAction, useApplications, useUnits } from '@/hooks/use-admin';
import * as admin from '@/lib/admin';
import { Plus, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

function AddApplicationDialog() {
  const { data: units } = useUnits();
  const open = (units ?? []).filter((u) => !u.lease_id);
  return (
    <FormDialog
      title='Record application'
      submitLabel='Save application'
      action={admin.addApplication}
      trigger={
        <Button>
          <Plus /> Record application
        </Button>
      }
    >
      <Field label='First name' htmlFor='app-first'>
        <Input id='app-first' name='firstName' required />
      </Field>
      <Field label='Last name' htmlFor='app-last'>
        <Input id='app-last' name='lastName' required />
      </Field>
      <Field label='Email' htmlFor='app-email'>
        <Input id='app-email' name='email' type='email' />
      </Field>
      <Field label='Phone' htmlFor='app-phone'>
        <Input id='app-phone' name='phone' type='tel' />
      </Field>
      <Field label='Employer' htmlFor='app-employer'>
        <Input id='app-employer' name='employer' />
      </Field>
      <Field label='Monthly income ($)' htmlFor='app-income'>
        <Input id='app-income' name='monthlyIncome' inputMode='decimal' />
      </Field>
      <Field label='Unit applied for' htmlFor='app-unit'>
        <Select id='app-unit' name='unitId' defaultValue=''>
          <option value=''>Any available</option>
          {open.map((u) => (
            <option key={u.id} value={u.id}>
              {u.property_name} · {u.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label='Desired move-in' htmlFor='app-move-in'>
        <Input id='app-move-in' name='desiredMoveIn' type='date' />
      </Field>
    </FormDialog>
  );
}

function ApplicationRow({ app, onReview }) {
  const { run, pending } = useAdminAction();
  const ratio = app.market_rent_cents && app.monthly_income_cents ? app.monthly_income_cents / app.market_rent_cents : null;
  return (
    <tr className='hover:bg-secondary/20'>
      <Td className='font-medium'>
        {app.first_name} {app.last_name}
        <span className='block text-xs font-normal text-muted-foreground'>{app.email ?? app.phone ?? 'No contact'}</span>
      </Td>
      <Td className='text-muted-foreground'>{app.property_name ? `${app.property_name} · ${app.unit_name}` : 'Any'}</Td>
      <Td className='tabular-nums text-muted-foreground'>{shortDate(app.desired_move_in)}</Td>
      <Td className='text-right tabular-nums'>
        {app.monthly_income_cents ? money(app.monthly_income_cents) : '—'}
        {ratio !== null && (
          <span className={`block text-xs ${ratio < 3 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
            {ratio.toFixed(1)}× rent
          </span>
        )}
      </Td>
      <Td>
        <div className='flex flex-col items-start gap-1'>
          <StatusBadge status={app.idv_status === 'not_started' ? 'unverified' : app.idv_status} className='text-[11px]' />
          <span className='text-xs text-muted-foreground'>
            {app.income_status === 'verified' ? `${money(app.income_verified_cents)}/mo verified` : 'Income unverified'}
          </span>
        </div>
      </Td>
      <Td>
        <Select
          aria-label={`Status of ${app.first_name} ${app.last_name}`}
          value={app.status}
          disabled={pending || Boolean(app.tenant_id)}
          className='w-36'
          onChange={(e) => run(() => admin.setApplicationStatus(app.id, e.target.value))}
        >
          {admin.APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
      </Td>
      <Td className='flex items-center justify-end gap-2 text-right'>
        <Button size='sm' variant='outline' onClick={() => onReview(app)}>
          Review
        </Button>
        {app.tenant_id ? (
          <Link href='/admin/leases' className='text-sm font-medium text-primary hover:underline'>
            Tenant · write lease
          </Link>
        ) : (
          app.status !== 'declined' &&
          app.status !== 'withdrawn' && (
            <Button size='sm' variant='secondary' disabled={pending} onClick={() => run(() => admin.convertApplication(app.id))}>
              <UserCheck /> Approve as tenant
            </Button>
          )
        )}
      </Td>
    </tr>
  );
}

export default function ApplicationsView() {
  const { data: apps, error, isLoading } = useApplications();
  const [reviewingId, setReviewingId] = useState(null);
  const reviewing = (apps ?? []).find((a) => a.id === reviewingId) ?? null;
  return (
    <>
      <PageHeader
        title='Applications'
        description='Screen applicants against rent (3× income is the usual bar), then approve them into tenants.'
      >
        <AddApplicationDialog />
      </PageHeader>
      <QueryState error={error} isLoading={isLoading}>
        <TableShell label='Rental applications'>
          <thead>
            <tr>
              <Th>Applicant</Th>
              <Th>Unit</Th>
              <Th>Move-in</Th>
              <Th className='text-right'>Income</Th>
              <Th>Verification</Th>
              <Th>Status</Th>
              <Th className='text-right'>
                <span className='sr-only'>Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {apps?.length === 0 && <EmptyRow colSpan={7}>No applications yet.</EmptyRow>}
            {(apps ?? []).map((a) => (
              <ApplicationRow key={a.id} app={a} onReview={(app) => setReviewingId(app.id)} />
            ))}
          </tbody>
        </TableShell>
      </QueryState>
      <ApplicationReview app={reviewing} open={Boolean(reviewing)} onOpenChange={(open) => !open && setReviewingId(null)} />
    </>
  );
}
