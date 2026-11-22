'use client';

import { EmptyRow, FilterTabs, PageHeader, QueryState, StatusBadge, TableShell, Td, Th, money } from '@/components/admin/primitives';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminAction, usePortfolio } from '@/hooks/use-admin';
import * as admin from '@/lib/admin';
import { Download, Plus, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

function exportCsv(rows) {
  const header = ['Property', 'City', 'State', 'Owner', 'Listing', 'Units', 'Occupied', 'Vacant', 'Rent roll', 'Vacancy loss', 'Open work orders'];
  const lines = rows.map((p) =>
    [
      p.name,
      p.city,
      p.state,
      p.owner_name,
      p.listing_status,
      p.unit_count,
      p.occupied_count,
      p.vacant_count,
      (p.rent_roll_cents / 100).toFixed(2),
      (p.vacancy_loss_cents / 100).toFixed(2),
      p.open_work_orders,
    ]
      .map(csvCell)
      .join(',')
  );
  const url = URL.createObjectURL(new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: 'portfolio.csv' });
  link.click();
  URL.revokeObjectURL(url);
}

function Summary({ rows }) {
  const totals = rows.reduce(
    (sum, p) => ({
      units: sum.units + p.unit_count,
      occupied: sum.occupied + p.occupied_count,
      rentRoll: sum.rentRoll + p.rent_roll_cents,
      loss: sum.loss + p.vacancy_loss_cents,
    }),
    { units: 0, occupied: 0, rentRoll: 0, loss: 0 }
  );
  const occupancy = totals.units ? Math.round((totals.occupied / totals.units) * 100) : 0;

  return (
    <dl className='grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 lg:grid-cols-5'>
      {[
        ['Properties', rows.length, `${rows.filter((p) => p.listing_status === 'published').length} published`],
        ['Units', totals.units, `${totals.units - totals.occupied} not leased`],
        ['Occupancy', `${occupancy}%`, `${totals.occupied} of ${totals.units} units`],
        ['Rent roll', money(totals.rentRoll), 'active leases / mo'],
        ['Vacancy loss', money(totals.loss), 'market rent unearned / mo'],
      ].map(([label, value, hint]) => (
        <div key={label} className='flex flex-col gap-1 bg-card/70 p-5'>
          <dt className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>{label}</dt>
          <dd className='font-display text-2xl font-bold tabular-nums'>{value}</dd>
          <dd className='text-xs text-muted-foreground'>{hint}</dd>
        </div>
      ))}
    </dl>
  );
}

function OccupancyBar({ occupied, total }) {
  const pct = total ? (occupied / total) * 100 : 0;
  return (
    <div className='flex min-w-28 flex-col gap-1.5'>
      <span className='text-sm tabular-nums'>
        {occupied}/{total} leased
      </span>
      <div
        className='h-1.5 overflow-hidden rounded-full bg-muted'
        role='img'
        aria-label={`${Math.round(pct)}% occupied`}
      >
        <div className='h-full bg-primary' style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function PropertiesView() {
  const { data, error, isLoading } = usePortfolio();
  const { run, pending } = useAdminAction();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => data ?? [], [data]);
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (filter === 'vacant' && p.vacant_count === 0) return false;
      if (filter === 'draft' && p.listing_status !== 'draft') return false;
      if (filter === 'published' && p.listing_status !== 'published') return false;
      return !needle || `${p.name} ${p.city} ${p.state} ${p.owner_name ?? ''}`.toLowerCase().includes(needle);
    });
  }, [rows, filter, search]);

  const options = [
    { value: 'all', label: 'All', count: rows.length },
    { value: 'published', label: 'Published', count: rows.filter((p) => p.listing_status === 'published').length },
    { value: 'draft', label: 'Drafts', count: rows.filter((p) => p.listing_status === 'draft').length },
    { value: 'vacant', label: 'Has vacancies', count: rows.filter((p) => p.vacant_count > 0).length },
  ];

  return (
    <>
      <PageHeader title='Properties' description='Your whole portfolio: occupancy, income, and listing status per property.'>
        <Button variant='outline' disabled={!rows.length} onClick={() => exportCsv(visible)}>
          <Download /> Export CSV
        </Button>
        <Link href='/properties/add' className={buttonVariants()}>
          <Plus /> New listing
        </Link>
      </PageHeader>

      <QueryState error={error} isLoading={isLoading}>
        <Summary rows={rows} />

        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <FilterTabs label='Filter properties' value={filter} onChange={setFilter} options={options} />
          <Input
            type='search'
            aria-label='Search properties'
            placeholder='Search name, city, or landlord'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='sm:max-w-72'
          />
        </div>

        <TableShell label='Properties'>
          <thead>
            <tr>
              <Th>Property</Th>
              <Th>Occupancy</Th>
              <Th className='text-right'>Rent roll</Th>
              <Th className='text-right'>Vacancy loss</Th>
              <Th>Open work</Th>
              <Th>Listing</Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <EmptyRow colSpan={6}>No properties match.</EmptyRow>}
            {visible.map((p) => (
              <tr key={p.id} className='transition-colors hover:bg-muted/30'>
                <Td>
                  <div className='flex items-center gap-3'>
                    {p.image ? (
                      <Image src={p.image} alt='' width={64} height={48} className='h-12 w-16 shrink-0 rounded-md object-cover' />
                    ) : (
                      <div className='h-12 w-16 shrink-0 rounded-md bg-muted' aria-hidden='true' />
                    )}
                    <div className='min-w-0'>
                      <Link href={`/admin/properties/${p.id}`} className='flex items-center gap-1.5 font-medium hover:text-primary hover:underline'>
                        <span className='truncate'>{p.name}</span>
                        {p.is_featured && <Star className='size-3.5 shrink-0 fill-primary text-primary' aria-label='Featured' />}
                      </Link>
                      <p className='truncate text-sm text-muted-foreground'>
                        {p.city}, {p.state} · {p.owner_name ?? 'No owner'}
                      </p>
                    </div>
                  </div>
                </Td>
                <Td>
                  {p.unit_count ? (
                    <OccupancyBar occupied={p.occupied_count} total={p.unit_count} />
                  ) : (
                    <span className='text-sm text-muted-foreground'>No units</span>
                  )}
                </Td>
                <Td className='text-right tabular-nums'>{money(p.rent_roll_cents)}</Td>
                <Td className='text-right tabular-nums'>
                  {p.vacancy_loss_cents ? (
                    <span className='font-semibold text-destructive'>{money(p.vacancy_loss_cents)}</span>
                  ) : (
                    <span className='text-muted-foreground'>—</span>
                  )}
                </Td>
                <Td>
                  <span className='text-sm tabular-nums'>
                    {p.open_work_orders} work · {p.pending_applications} applicants
                  </span>
                </Td>
                <Td>
                  <div className='flex items-center gap-2'>
                    <StatusBadge status={p.listing_status} />
                    <Button
                      variant='ghost'
                      size='sm'
                      disabled={pending}
                      onClick={() => run(() => admin.setListingStatus(p.id, p.listing_status === 'published' ? 'draft' : 'published'))}
                    >
                      {p.listing_status === 'published' ? 'Unpublish' : 'Publish'}
                      <span className='sr-only'> {p.name}</span>
                    </Button>
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
