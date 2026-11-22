'use client';

import FormDialog from '@/components/admin/FormDialog';
import { EmptyRow, Field, PageHeader, QueryState, TableShell, Td, Th, money } from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTenants } from '@/hooks/use-admin';
import * as admin from '@/lib/admin';
import { Pencil, Plus, Search } from 'lucide-react';
import { useDeferredValue, useState } from 'react';

function TenantFields({ tenant }) {
  return (
    <>
      <Field label='First name' htmlFor='firstName'>
        <Input id='firstName' name='firstName' required autoComplete='off' defaultValue={tenant?.first_name} />
      </Field>
      <Field label='Last name' htmlFor='lastName'>
        <Input id='lastName' name='lastName' required autoComplete='off' defaultValue={tenant?.last_name} />
      </Field>
      <Field label='Email' htmlFor='email'>
        <Input id='email' name='email' type='email' autoComplete='off' defaultValue={tenant?.email ?? ''} />
      </Field>
      <Field label='Phone' htmlFor='phone'>
        <Input id='phone' name='phone' type='tel' autoComplete='off' defaultValue={tenant?.phone ?? ''} />
      </Field>
      <Field label='Employer' htmlFor='employer'>
        <Input id='employer' name='employer' defaultValue={tenant?.employer ?? ''} />
      </Field>
      <Field label='Monthly income ($)' htmlFor='monthlyIncome'>
        <Input
          id='monthlyIncome'
          name='monthlyIncome'
          inputMode='decimal'
          defaultValue={tenant?.monthly_income_cents ? tenant.monthly_income_cents / 100 : ''}
        />
      </Field>
      <Field label='Emergency contact' htmlFor='emergencyContact' className='sm:col-span-2'>
        <Input id='emergencyContact' name='emergencyContact' defaultValue={tenant?.emergency_contact ?? ''} />
      </Field>
      <Field label='Notes' htmlFor='tenant-notes' className='sm:col-span-2'>
        <Textarea id='tenant-notes' name='notes' rows={2} defaultValue={tenant?.notes ?? ''} />
      </Field>
    </>
  );
}

export default function TenantsView() {
  const { data: tenants, error, isLoading } = useTenants();
  const [search, setSearch] = useState('');
  const term = useDeferredValue(search.trim().toLowerCase());

  const visible = (tenants ?? []).filter((t) =>
    !term
      ? true
      : [t.first_name, t.last_name, t.email, t.phone, t.property_name].some((v) => v?.toLowerCase().includes(term))
  );

  return (
    <>
      <PageHeader title='Tenants' description='Contact details, current unit, rent-to-income, and outstanding balance.'>
        <FormDialog
          title='Add tenant'
          submitLabel='Add tenant'
          action={admin.addTenant}
          trigger={
            <Button>
              <Plus /> Add tenant
            </Button>
          }
        >
          <TenantFields />
        </FormDialog>
      </PageHeader>

      <div className='relative max-w-sm'>
        <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden='true' />
        <Input
          type='search'
          placeholder='Search name, email, phone, property'
          aria-label='Search tenants'
          className='pl-9'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <QueryState error={error} isLoading={isLoading}>
        <TableShell label='Tenants'>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Contact</Th>
              <Th>Current unit</Th>
              <Th className='text-right'>Rent / income</Th>
              <Th className='text-right'>Balance</Th>
              <Th className='text-right'>
                <span className='sr-only'>Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <EmptyRow colSpan={6}>{term ? 'No tenants match that search.' : 'No tenants yet.'}</EmptyRow>}
            {visible.map((t) => {
              const ratio = t.rent_cents && t.monthly_income_cents ? t.rent_cents / t.monthly_income_cents : null;
              return (
                <tr key={t.id} className='hover:bg-secondary/20'>
                  <Td className='font-medium'>
                    {t.first_name} {t.last_name}
                    {t.employer && <span className='block text-xs font-normal text-muted-foreground'>{t.employer}</span>}
                  </Td>
                  <Td className='text-muted-foreground'>
                    {t.email ? (
                      <a href={`mailto:${t.email}`} className='hover:text-primary hover:underline'>
                        {t.email}
                      </a>
                    ) : (
                      '—'
                    )}
                    {t.phone && <span className='block text-xs tabular-nums'>{t.phone}</span>}
                  </Td>
                  <Td>
                    {t.lease_id ? (
                      <>
                        {t.property_name} · {t.unit_name}
                        <span className='block text-xs text-muted-foreground tabular-nums'>{money(t.rent_cents)}/mo</span>
                      </>
                    ) : (
                      <span className='text-muted-foreground'>No active lease</span>
                    )}
                  </Td>
                  <Td className='text-right tabular-nums'>
                    {ratio === null ? (
                      <span className='text-muted-foreground'>—</span>
                    ) : (
                      <span className={ratio > 0.4 ? 'font-semibold text-primary' : ''}>{Math.round(ratio * 100)}%</span>
                    )}
                  </Td>
                  <Td className='text-right tabular-nums'>
                    {t.balance_cents ? (
                      <span className={t.overdue_cents ? 'font-semibold text-destructive' : 'font-semibold'}>
                        {money(t.balance_cents)}
                        {t.overdue_cents > 0 && <span className='block text-xs font-normal'>overdue</span>}
                      </span>
                    ) : (
                      <span className='text-muted-foreground'>$0</span>
                    )}
                  </Td>
                  <Td className='text-right'>
                    <FormDialog
                      title={`Edit ${t.first_name} ${t.last_name}`}
                      submitLabel='Save changes'
                      action={(values) => admin.updateTenant(t.id, values)}
                      trigger={
                        <Button size='icon' variant='ghost' className='size-8'>
                          <Pencil />
                          <span className='sr-only'>Edit {t.first_name}</span>
                        </Button>
                      }
                    >
                      <TenantFields tenant={t} />
                    </FormDialog>
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
