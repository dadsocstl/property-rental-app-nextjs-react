'use client';

import { EmptyRow, PageHeader, QueryState, Select, StatusBadge, TableShell, Td, Th, humanize, money } from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { useAdminAction, useVacancies } from '@/hooks/use-admin';
import * as admin from '@/lib/admin';
import Link from 'next/link';

export default function VacanciesView() {
  const { data, error, isLoading } = useVacancies();
  const { run, pending } = useAdminAction();
  const rows = data ?? [];
  const loss = rows.reduce((sum, u) => sum + u.market_rent_cents, 0);

  return (
    <>
      <PageHeader
        title='Vacancies'
        description='Every unit without a tenant, oldest first. Publish the listing, work the applicants, then lease it.'
      />
      <QueryState error={error} isLoading={isLoading}>
        <p className='flex flex-wrap items-baseline gap-x-3 text-muted-foreground'>
          <span className='font-display text-4xl font-bold tabular-nums text-foreground'>{rows.length}</span>
          vacant {rows.length === 1 ? 'unit' : 'units'} costing
          <span className='font-semibold tabular-nums text-destructive'>{money(loss)}</span> a month in unearned market rent.
        </p>

        <TableShell label='Vacant units'>
          <thead>
            <tr>
              <Th>Unit</Th>
              <Th>Status</Th>
              <Th>Days</Th>
              <Th className='text-right'>Market rent</Th>
              <Th>Applicants</Th>
              <Th>Listing</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={6}>Every unit is leased.</EmptyRow>}
            {rows.map((u) => (
              <tr key={u.id} className='transition-colors hover:bg-muted/30'>
                <Td>
                  <Link href={`/admin/properties/${u.property_id}`} className='font-medium hover:text-primary hover:underline'>
                    {u.property_name} · {u.name}
                  </Link>
                  <p className='text-sm text-muted-foreground'>
                    {u.bedrooms} bd · {u.bathrooms} ba{u.sqft ? ` · ${u.sqft.toLocaleString()} sqft` : ''}
                  </p>
                </Td>
                <Td>
                  <Select
                    aria-label={`Status of ${u.property_name} ${u.name}`}
                    value={u.status}
                    disabled={pending}
                    className='w-36'
                    onChange={(e) => run(() => admin.setUnitStatus(u.id, e.target.value))}
                  >
                    {admin.UNIT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {humanize(s)}
                      </option>
                    ))}
                  </Select>
                </Td>
                <Td className='tabular-nums'>
                  <span className={u.days_vacant > 30 ? 'font-semibold text-destructive' : ''}>{u.days_vacant}d</span>
                </Td>
                <Td className='text-right tabular-nums'>{money(u.market_rent_cents)}</Td>
                <Td>
                  <Link href='/admin/applications' className='text-sm hover:underline'>
                    {u.applicants} in review{u.approved ? ` · ${u.approved} approved` : ''}
                  </Link>
                </Td>
                <Td>
                  <div className='flex items-center gap-2'>
                    <StatusBadge status={u.listing_status} />
                    {u.listing_status !== 'published' && (
                      <Button variant='ghost' size='sm' disabled={pending} onClick={() => run(() => admin.setListingStatus(u.property_id, 'published'))}>
                        Publish<span className='sr-only'> {u.property_name}</span>
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </QueryState>
    </>
  );
}
