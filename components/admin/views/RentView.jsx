'use client';

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
  monthLabel,
  shortDate,
} from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAdminAction, useChargePayments, useCharges } from '@/hooks/use-admin';
import * as admin from '@/lib/admin';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

function shiftPeriod(period, delta) {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function PaymentDialog({ charge, onClose }) {
  const { run, pending } = useAdminAction();
  const { data: payments } = useChargePayments(charge?.id);

  async function onSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await run(() => admin.recordPayment(charge.id, Object.fromEntries(form)));
    if (result) onClose();
  }

  return (
    <Dialog open={Boolean(charge)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {charge && (
          <>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>
                {charge.tenant_name} · {charge.property_name} {charge.unit_name} · {monthLabel(charge.period)}. Balance{' '}
                <span className='font-semibold text-foreground'>{money(charge.balance_cents, { precise: true })}</span> of{' '}
                {money(charge.amount_cents, { precise: true })}.
              </DialogDescription>
            </DialogHeader>

            {charge.balance_cents > 0 && (
              <form id='payment-form' onSubmit={onSubmit} className='grid gap-4 sm:grid-cols-2'>
                <Field label='Amount' htmlFor='amount'>
                  <Input
                    id='amount'
                    name='amount'
                    inputMode='decimal'
                    required
                    defaultValue={(charge.balance_cents / 100).toFixed(2)}
                  />
                </Field>
                <Field label='Paid on' htmlFor='paidOn'>
                  <Input id='paidOn' name='paidOn' type='date' required defaultValue={admin.todayIso()} />
                </Field>
                <Field label='Method' htmlFor='method'>
                  <Select id='method' name='method' defaultValue='ach'>
                    {admin.PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m.toUpperCase()}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label='Reference' htmlFor='reference' hint='Check number or transaction ID'>
                  <Input id='reference' name='reference' autoComplete='off' />
                </Field>
              </form>
            )}

            {payments?.length > 0 && (
              <div className='flex flex-col gap-2'>
                <h3 className='text-sm font-semibold'>Payments on this charge</h3>
                <ul className='flex flex-col divide-y divide-border/50 rounded-lg border border-border/60'>
                  {payments.map((p) => (
                    <li key={p.id} className='flex items-center justify-between gap-3 px-3 py-2 text-sm'>
                      <span className='tabular-nums'>
                        {shortDate(p.paid_on)} · {p.method.toUpperCase()}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </span>
                      <span className='flex items-center gap-2'>
                        <span className='font-semibold tabular-nums'>{money(p.amount_cents, { precise: true })}</span>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-8'
                          disabled={pending}
                          onClick={() => run(() => admin.deletePayment(p.id))}
                        >
                          <Trash2 />
                          <span className='sr-only'>Remove payment</span>
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button variant='outline' onClick={onClose}>
                Close
              </Button>
              {charge.balance_cents > 0 && (
                <Button type='submit' form='payment-form' disabled={pending}>
                  {pending ? 'Saving…' : 'Record payment'}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
];

export default function RentView() {
  const [period, setPeriod] = useState(admin.currentPeriod);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const { data: charges, error, isLoading } = useCharges(period);
  const { run, pending } = useAdminAction();

  const counts = useMemo(() => {
    const list = charges ?? [];
    return {
      all: list.length,
      unpaid: list.filter((c) => c.balance_cents > 0).length,
      overdue: list.filter((c) => c.status === 'overdue').length,
      paid: list.filter((c) => c.status === 'paid').length,
    };
  }, [charges]);

  const visible = (charges ?? []).filter((c) => {
    if (filter === 'unpaid') return c.balance_cents > 0;
    if (filter === 'overdue') return c.status === 'overdue';
    if (filter === 'paid') return c.status === 'paid';
    return true;
  });
  const selected = charges?.find((c) => c.id === selectedId) ?? null;
  const totals = (charges ?? []).reduce(
    (acc, c) => ({ due: acc.due + (c.waived ? 0 : c.amount_cents), balance: acc.balance + c.balance_cents }),
    { due: 0, balance: 0 }
  );

  return (
    <>
      <PageHeader title='Rent ledger' description='One charge per active lease per month. Status follows from the payments recorded.'>
        <Button onClick={() => run(() => admin.generateCharges(period))} disabled={pending}>
          <Plus /> Generate charges
        </Button>
      </PageHeader>

      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='icon' onClick={() => setPeriod((p) => shiftPeriod(p, -1))}>
            <ChevronLeft />
            <span className='sr-only'>Previous month</span>
          </Button>
          <p className='min-w-40 text-center font-display text-lg font-semibold' aria-live='polite'>
            {monthLabel(period)}
          </p>
          <Button variant='outline' size='icon' onClick={() => setPeriod((p) => shiftPeriod(p, 1))}>
            <ChevronRight />
            <span className='sr-only'>Next month</span>
          </Button>
        </div>
        <FilterTabs
          label='Filter charges'
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
        />
      </div>

      <QueryState error={error} isLoading={isLoading}>
        <TableShell label={`Rent charges for ${monthLabel(period)}`}>
          <thead>
            <tr>
              <Th>Tenant</Th>
              <Th>Unit</Th>
              <Th>Due</Th>
              <Th className='text-right'>Charged</Th>
              <Th className='text-right'>Paid</Th>
              <Th className='text-right'>Balance</Th>
              <Th>Status</Th>
              <Th className='text-right'>
                <span className='sr-only'>Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <EmptyRow colSpan={8}>
                {charges?.length
                  ? 'No charges match this filter.'
                  : 'No charges for this month yet. Use “Generate charges” to bill every active lease.'}
              </EmptyRow>
            )}
            {visible.map((c) => (
              <tr key={c.id} className='transition-colors hover:bg-secondary/20'>
                <Td className='font-medium'>{c.tenant_name}</Td>
                <Td className='text-muted-foreground'>
                  {c.property_name} · {c.unit_name}
                </Td>
                <Td className='tabular-nums text-muted-foreground'>{shortDate(c.due_date)}</Td>
                <Td className='text-right tabular-nums'>{money(c.amount_cents)}</Td>
                <Td className='text-right tabular-nums text-muted-foreground'>{money(c.paid_cents)}</Td>
                <Td className='text-right font-semibold tabular-nums'>{money(c.balance_cents)}</Td>
                <Td>
                  <StatusBadge status={c.status} />
                </Td>
                <Td className='text-right'>
                  <div className='flex justify-end gap-1'>
                    {!c.waived && (
                      <Button size='sm' variant={c.balance_cents > 0 ? 'secondary' : 'ghost'} onClick={() => setSelectedId(c.id)}>
                        {c.balance_cents > 0 ? 'Record payment' : 'Payments'}
                      </Button>
                    )}
                    {c.paid_cents === 0 && (
                      <Button
                        size='sm'
                        variant='ghost'
                        disabled={pending}
                        onClick={() => run(() => admin.setChargeWaived(c.id, !c.waived))}
                      >
                        {c.waived ? 'Restore' : 'Waive'}
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
          {charges?.length > 0 && (
            <tfoot>
              <tr className='text-sm'>
                <Td className='font-semibold' colSpan={3}>
                  Month total
                </Td>
                <Td className='text-right font-semibold tabular-nums'>{money(totals.due)}</Td>
                <Td className='text-right tabular-nums text-muted-foreground'>{money(totals.due - totals.balance)}</Td>
                <Td className='text-right font-semibold tabular-nums text-primary'>{money(totals.balance)}</Td>
                <Td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </TableShell>
      </QueryState>

      <PaymentDialog charge={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}
