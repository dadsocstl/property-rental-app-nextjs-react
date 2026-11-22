'use client';

import { EmptyRow, PageHeader, QueryState, TableShell, Td, Th, money } from '@/components/admin/primitives';
import { useLandlords } from '@/hooks/use-admin';

export default function LandlordsView() {
  const { data: landlords, error, isLoading } = useLandlords();
  return (
    <>
      <PageHeader
        title='Landlords'
        description='Each owner’s portfolio: listings, units, occupancy, monthly rent roll, arrears, and open repairs.'
      />
      <QueryState error={error} isLoading={isLoading}>
        <TableShell label='Landlord portfolios'>
          <thead>
            <tr>
              <Th>Landlord</Th>
              <Th className='text-right'>Listings</Th>
              <Th className='text-right'>Units</Th>
              <Th>Occupancy</Th>
              <Th className='text-right'>Rent roll</Th>
              <Th className='text-right'>Arrears</Th>
              <Th className='text-right'>Open repairs</Th>
            </tr>
          </thead>
          <tbody>
            {landlords?.length === 0 && <EmptyRow colSpan={7}>No landlords own listings yet.</EmptyRow>}
            {(landlords ?? []).map((l) => {
              const pct = l.unit_count ? Math.round((l.occupied_count / l.unit_count) * 100) : 0;
              return (
                <tr key={l.id} className='hover:bg-secondary/20'>
                  <Td className='font-medium'>
                    {l.username}
                    {l.role === 'admin' && <span className='ml-2 text-xs font-semibold text-primary'>admin</span>}
                    <span className='block text-xs font-normal text-muted-foreground'>{l.email}</span>
                  </Td>
                  <Td className='text-right tabular-nums'>{l.listing_count}</Td>
                  <Td className='text-right tabular-nums'>{l.unit_count}</Td>
                  <Td>
                    <div className='flex items-center gap-3'>
                      <div
                        className='h-2 w-24 overflow-hidden rounded-full bg-muted'
                        role='img'
                        aria-label={`${l.occupied_count} of ${l.unit_count} units occupied`}
                      >
                        <div className='h-full bg-primary' style={{ width: `${pct}%` }} />
                      </div>
                      <span className='text-sm tabular-nums text-muted-foreground'>
                        {l.occupied_count}/{l.unit_count}
                      </span>
                    </div>
                  </Td>
                  <Td className='text-right font-semibold tabular-nums'>{money(l.rent_roll_cents)}</Td>
                  <Td className={`text-right tabular-nums ${l.arrears_cents ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                    {money(l.arrears_cents)}
                  </Td>
                  <Td className='text-right tabular-nums'>{l.open_work_orders}</Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      </QueryState>
    </>
  );
}
