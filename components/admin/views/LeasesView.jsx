'use client';

import FormDialog from '@/components/admin/FormDialog';
import {
  EmptyRow,
  Field,
  FilterTabs,
  PageHeader,
  QueryState,
  Select,
  StatusBadge,
  TableShell,
  Td,
  Th,
  money,
  shortDate,
} from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAdminAction, useLeases, useTenants, useUnits } from '@/hooks/use-admin';
import * as admin from '@/lib/admin';
import { Plus } from 'lucide-react';
import { useState } from 'react';

function defaultEnd() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function NewLeaseDialog() {
  const { data: units } = useUnits();
  const { data: tenants } = useTenants();
  const available = (units ?? []).filter((u) => u.status !== 'occupied' && !u.lease_id);
  const unleasedTenants = (tenants ?? []).filter((t) => !t.lease_id);

  return (
    <FormDialog
      title='New lease'
      description='Starting today or earlier makes the lease active and marks the unit occupied.'
      submitLabel='Create lease'
      action={admin.createLease}
      trigger={
        <Button>
          <Plus /> New lease
        </Button>
      }
    >
      <Field label='Unit' htmlFor='unitId' className='sm:col-span-2'>
        <Select id='unitId' name='unitId' required defaultValue=''>
          <option value='' disabled>
            {available.length ? 'Choose a unit' : 'No available units'}
          </option>
          {available.map((u) => (
            <option key={u.id} value={u.id}>
              {u.property_name} · {u.name} ({money(u.market_rent_cents)}/mo)
            </option>
          ))}
        </Select>
      </Field>
      <Field label='Tenant' htmlFor='tenantId' className='sm:col-span-2' hint='Add new people on the Tenants page first.'>
        <Select id='tenantId' name='tenantId' required defaultValue=''>
          <option value='' disabled>
            Choose a tenant
          </option>
          {unleasedTenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.first_name} {t.last_name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label='Start date' htmlFor='startDate'>
        <Input id='startDate' name='startDate' type='date' required defaultValue={admin.todayIso()} />
      </Field>
      <Field label='End date' htmlFor='endDate'>
        <Input id='endDate' name='endDate' type='date' required defaultValue={defaultEnd()} />
      </Field>
      <Field label='Monthly rent ($)' htmlFor='rent'>
        <Input id='rent' name='rent' inputMode='decimal' required />
      </Field>
      <Field label='Security deposit ($)' htmlFor='deposit'>
        <Input id='deposit' name='deposit' inputMode='decimal' />
      </Field>
      <Field label='Rent due day' htmlFor='dueDay' hint='1–28 of each month'>
        <Input id='dueDay' name='dueDay' type='number' min='1' max='28' defaultValue='1' required />
      </Field>
      <Field label='Late fee ($)' htmlFor='lateFee'>
        <Input id='lateFee' name='lateFee' inputMode='decimal' />
      </Field>
      <Field label='Notes' htmlFor='lease-notes' className='sm:col-span-2'>
        <Textarea id='lease-notes' name='notes' rows={2} />
      </Field>
    </FormDialog>
  );
}

export default function LeasesView() {
  const [filter, setFilter] = useState('current');
  const { data: leases, error, isLoading } = useLeases();
  const { run, pending } = useAdminAction();
  const today = admin.todayIso();

  const current = (leases ?? []).filter((l) => l.status === 'active' || l.status === 'upcoming');
  const visible = filter === 'current' ? current : (leases ?? []).filter((l) => !current.includes(l));

  return (
    <>
      <PageHeader title='Leases' description='Terms, rent, and deposits for every unit. Ending a lease puts the unit into turnover.'>
        <NewLeaseDialog />
      </PageHeader>
      <FilterTabs
        label='Filter leases'
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'current', label: 'Current', count: current.length },
          { value: 'past', label: 'Past', count: (leases?.length ?? 0) - current.length },
        ]}
      />
      <QueryState error={error} isLoading={isLoading}>
        <TableShell label='Leases'>
          <thead>
            <tr>
              <Th>Tenant</Th>
              <Th>Unit</Th>
              <Th>Landlord</Th>
              <Th>Term</Th>
              <Th className='text-right'>Rent</Th>
              <Th className='text-right'>Deposit</Th>
              <Th>Status</Th>
              <Th className='text-right'>
                <span className='sr-only'>Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <EmptyRow colSpan={8}>No leases here yet.</EmptyRow>}
            {visible.map((l) => {
              const daysLeft = Math.ceil((new Date(l.end_date) - new Date(today)) / 86_400_000);
              return (
                <tr key={l.id} className='hover:bg-secondary/20'>
                  <Td className='font-medium'>
                    {l.first_name ? `${l.first_name} ${l.last_name}` : 'No tenant'}
                  </Td>
                  <Td className='text-muted-foreground'>
                    {l.property_name} · {l.unit_name}
                  </Td>
                  <Td className='text-muted-foreground'>{l.owner_name ?? '—'}</Td>
                  <Td className='tabular-nums'>
                    <span className='text-muted-foreground'>{shortDate(l.start_date)} – </span>
                    {shortDate(l.end_date)}
                    {l.status === 'active' && daysLeft <= 60 && (
                      <span className='ml-2 text-xs font-semibold text-primary'>
                        {daysLeft < 0 ? 'past end' : `${daysLeft}d left`}
                      </span>
                    )}
                  </Td>
                  <Td className='text-right tabular-nums'>{money(l.rent_cents)}</Td>
                  <Td className='text-right tabular-nums text-muted-foreground'>{money(l.deposit_cents)}</Td>
                  <Td>
                    <StatusBadge status={l.status} />
                  </Td>
                  <Td className='text-right'>
                    {(l.status === 'active' || l.status === 'upcoming') && (
                      <Button
                        size='sm'
                        variant='ghost'
                        disabled={pending}
                        onClick={() => {
                          if (window.confirm(`End the lease for ${l.property_name} · ${l.unit_name}?`)) {
                            run(() => admin.endLease(l.id));
                          }
                        }}
                      >
                        {l.status === 'active' ? 'End lease' : 'Cancel'}
                      </Button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      </QueryState>
    </>
  );
}
