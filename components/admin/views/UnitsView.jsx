'use client';

import FormDialog from '@/components/admin/FormDialog';
import { Field, PageHeader, QueryState, Select, StatusBadge, humanize, money } from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminAction, useListingsForUnits, useUnits } from '@/hooks/use-admin';
import * as admin from '@/lib/admin';
import { Plus } from 'lucide-react';
import Link from 'next/link';

function AddUnitDialog() {
  const { data: listings } = useListingsForUnits();
  return (
    <FormDialog
      title='Add unit'
      description='Split a listing into separately leased units, e.g. Unit A and Unit B.'
      submitLabel='Add unit'
      action={admin.addUnit}
      trigger={
        <Button>
          <Plus /> Add unit
        </Button>
      }
    >
      <Field label='Property' htmlFor='propertyId' className='sm:col-span-2'>
        <Select id='propertyId' name='propertyId' required defaultValue=''>
          <option value='' disabled>
            Choose a property
          </option>
          {(listings ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label='Unit name' htmlFor='unit-name'>
        <Input id='unit-name' name='name' required placeholder='Unit C' />
      </Field>
      <Field label='Market rent ($/mo)' htmlFor='marketRent'>
        <Input id='marketRent' name='marketRent' inputMode='decimal' />
      </Field>
      <Field label='Bedrooms' htmlFor='bedrooms'>
        <Input id='bedrooms' name='bedrooms' type='number' min='0' step='0.5' defaultValue='1' />
      </Field>
      <Field label='Bathrooms' htmlFor='bathrooms'>
        <Input id='bathrooms' name='bathrooms' type='number' min='0' step='0.5' defaultValue='1' />
      </Field>
      <Field label='Square feet' htmlFor='sqft'>
        <Input id='sqft' name='sqft' type='number' min='0' />
      </Field>
    </FormDialog>
  );
}

export default function UnitsView() {
  const { data: units, error, isLoading } = useUnits();
  const { run, pending } = useAdminAction();

  const groups = [];
  for (const unit of units ?? []) {
    const last = groups.at(-1);
    if (last?.id === unit.property_id) last.units.push(unit);
    else groups.push({ id: unit.property_id, name: unit.property_name, city: unit.city, state: unit.state, owner: unit.owner_name, units: [unit] });
  }

  return (
    <>
      <PageHeader title='Units' description='Every leasable unit, grouped by property, with its current occupant.'>
        <AddUnitDialog />
      </PageHeader>
      <QueryState error={error} isLoading={isLoading}>
        {groups.length === 0 && <p className='py-12 text-center text-muted-foreground'>No units yet.</p>}
        <div className='flex flex-col gap-6'>
          {groups.map((group) => {
            const occupied = group.units.filter((u) => u.status === 'occupied').length;
            return (
              <section key={group.id} aria-labelledby={`property-${group.id}`} className='overflow-hidden rounded-2xl border border-border/70 bg-card/40'>
                <header className='flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-card/70 px-5 py-4'>
                  <div>
                    <h2 id={`property-${group.id}`} className='font-display text-lg font-semibold'>
                      <Link href={`/properties/${group.id}`} className='hover:text-primary hover:underline'>
                        {group.name}
                      </Link>
                    </h2>
                    <p className='text-sm text-muted-foreground'>
                      {group.city}, {group.state} · Landlord {group.owner ?? 'unknown'}
                    </p>
                  </div>
                  <p className='text-sm tabular-nums text-muted-foreground'>
                    {occupied}/{group.units.length} occupied
                  </p>
                </header>
                <ul className='divide-y divide-border/40'>
                  {group.units.map((u) => (
                    <li key={u.id} className='flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between'>
                      <div className='min-w-0'>
                        <p className='font-medium'>{u.name}</p>
                        <p className='text-sm text-muted-foreground'>
                          {u.bedrooms} bd · {u.bathrooms} ba{u.sqft ? ` · ${u.sqft.toLocaleString()} sqft` : ''} · Market{' '}
                          {money(u.market_rent_cents)}
                        </p>
                      </div>
                      <div className='flex flex-wrap items-center gap-3'>
                        <span className='text-sm'>
                          {u.tenant_id ? (
                            <>
                              {u.first_name} {u.last_name}{' '}
                              <span className='tabular-nums text-muted-foreground'>· {money(u.rent_cents)}/mo</span>
                            </>
                          ) : (
                            <span className='text-muted-foreground'>No tenant</span>
                          )}
                        </span>
                        {u.lease_id ? (
                          <StatusBadge status='occupied' />
                        ) : (
                          <Select
                            aria-label={`Status of ${group.name} ${u.name}`}
                            value={u.status}
                            disabled={pending}
                            className='w-36'
                            onChange={(e) => run(() => admin.setUnitStatus(u.id, e.target.value))}
                          >
                            {admin.UNIT_STATUSES.filter((s) => s !== 'occupied').map((s) => (
                              <option key={s} value={s} className='capitalize'>
                                {humanize(s)}
                              </option>
                            ))}
                          </Select>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </QueryState>
    </>
  );
}
