'use client';

import { PageHeader, QueryState, StatusBadge, money, monthLabel, shortDate } from '@/components/admin/primitives';
import { buttonVariants } from '@/components/ui/button';
import { useOverview } from '@/hooks/use-admin';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

function CollectionBar({ month }) {
  const { dueCents, collectedCents, overdueCents } = month;
  const outstanding = Math.max(dueCents - collectedCents - overdueCents, 0);
  const pct = (part) => (dueCents ? (part / dueCents) * 100 : 0);
  const collectedPct = Math.round(pct(collectedCents));

  return (
    <section aria-labelledby='collection-heading' className='flex flex-col gap-5 rounded-2xl border border-border/70 bg-card p-6'>
      <div className='flex flex-wrap items-baseline justify-between gap-2'>
        <h2 id='collection-heading' className='text-lg font-semibold'>
          Rent collection
        </h2>
        <span className='text-sm text-muted-foreground'>{monthLabel(month.period)}</span>
      </div>

      <p className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
        <span className='font-display text-5xl font-bold tabular-nums'>{money(collectedCents)}</span>
        <span className='text-muted-foreground'>
          collected of <span className='font-semibold text-foreground tabular-nums'>{money(dueCents)}</span> due
        </span>
      </p>

      <div
        className='flex h-4 w-full overflow-hidden rounded-full bg-muted'
        role='img'
        aria-label={`${collectedPct}% collected, ${money(outstanding)} outstanding, ${money(overdueCents)} overdue`}
      >
        <div className='bg-primary transition-[width] duration-700' style={{ width: `${pct(collectedCents)}%` }} />
        <div className='bg-secondary' style={{ width: `${pct(outstanding)}%` }} />
        <div className='bg-destructive' style={{ width: `${pct(overdueCents)}%` }} />
      </div>

      <dl className='grid grid-cols-1 gap-4 text-sm sm:grid-cols-3'>
        {[
          ['Collected', collectedCents, 'bg-primary'],
          ['Not yet due', outstanding, 'bg-secondary'],
          ['Overdue', overdueCents, 'bg-destructive'],
        ].map(([label, value, swatch]) => (
          <div key={label} className='flex items-center gap-3'>
            <span className={`size-2.5 rounded-full ${swatch}`} aria-hidden='true' />
            <dt className='text-muted-foreground'>{label}</dt>
            <dd className='ml-auto font-semibold tabular-nums sm:ml-0'>{money(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Panel({ title, href, linkLabel, children }) {
  return (
    <section className='flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/50 p-6'>
      <div className='flex items-center justify-between gap-2'>
        <h2 className='text-lg font-semibold'>{title}</h2>
        <Link href={href} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          {linkLabel} <ArrowRight />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <p className='py-6 text-center text-sm text-muted-foreground'>{children}</p>;
}

export default function OverviewView() {
  const { data, error, isLoading } = useOverview();

  return (
    <>
      <PageHeader title='Overview' description='Who has paid, what needs fixing, and which leases need attention.' />
      <QueryState error={error} isLoading={isLoading}>
        {data && (
          <div className='flex flex-col gap-6'>
            <div className='grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
              <CollectionBar month={{ ...data.month, period: data.period }} />
              <dl className='grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70'>
                {[
                  ['Occupancy', `${data.occupiedUnits}/${data.totalUnits}`, 'units leased'],
                  ['Vacant', data.vacantUnits, 'incl. turnover'],
                  ['Arrears', money(data.arrearsCents), 'all months'],
                  ['Applicants', data.pendingApplications, 'awaiting review'],
                ].map(([label, value, hint]) => (
                  <div key={label} className='flex flex-col gap-1 bg-card/70 p-5'>
                    <dt className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>{label}</dt>
                    <dd className='font-display text-2xl font-bold tabular-nums'>{value}</dd>
                    <dd className='text-xs text-muted-foreground'>{hint}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className='grid gap-6 lg:grid-cols-2'>
              <Panel title='Who still owes' href='/admin/rent' linkLabel='Rent ledger'>
                {data.owing.length ? (
                  <ul className='flex flex-col divide-y divide-border/50'>
                    {data.owing.slice(0, 6).map((c) => (
                      <li key={c.id} className='flex items-center justify-between gap-4 py-3'>
                        <div className='min-w-0'>
                          <p className='truncate font-medium'>{c.tenant_name}</p>
                          <p className='truncate text-sm text-muted-foreground'>
                            {c.property_name} · {c.unit_name} · {monthLabel(c.period)}
                          </p>
                        </div>
                        <div className='flex shrink-0 items-center gap-3'>
                          <span className='font-semibold tabular-nums'>{money(c.balance_cents)}</span>
                          <StatusBadge status={c.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>Everyone is paid up.</Empty>
                )}
              </Panel>

              <Panel title='Open maintenance' href='/admin/maintenance' linkLabel='All work orders'>
                {data.workOrders.length ? (
                  <ul className='flex flex-col divide-y divide-border/50'>
                    {data.workOrders.slice(0, 6).map((w) => (
                      <li key={w.id} className='flex items-center justify-between gap-4 py-3'>
                        <div className='min-w-0'>
                          <p className='truncate font-medium'>{w.title}</p>
                          <p className='truncate text-sm text-muted-foreground'>
                            {w.property_name ?? 'No property'} · {w.unit_name ?? '—'}
                          </p>
                        </div>
                        <div className='flex shrink-0 gap-2'>
                          <StatusBadge status={w.priority} />
                          <StatusBadge status={w.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>No open work orders.</Empty>
                )}
              </Panel>
            </div>

            <Panel title='Leases ending in the next 60 days' href='/admin/leases' linkLabel='All leases'>
              {data.expiring.length ? (
                <ul className='flex flex-col divide-y divide-border/50'>
                  {data.expiring.map((l) => (
                    <li key={l.id} className='flex flex-wrap items-center justify-between gap-2 py-3'>
                      <p>
                        <span className='font-medium'>{l.tenant_name}</span>{' '}
                        <span className='text-muted-foreground'>
                          · {l.property_name} · {l.unit_name}
                        </span>
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        Ends <span className='font-semibold text-foreground'>{shortDate(l.end_date)}</span> ·{' '}
                        {money(l.rent_cents)}/mo
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No leases end in the next 60 days.</Empty>
              )}
            </Panel>
          </div>
        )}
      </QueryState>
    </>
  );
}
