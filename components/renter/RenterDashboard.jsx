'use client';

import {
  EmptyRow,
  PageHeader,
  QueryState,
  StatusBadge,
  TableShell,
  Td,
  Th,
  humanize,
  money,
  monthLabel,
  shortDate,
} from '@/components/admin/primitives';
import WorkTicketDialog from '@/components/renter/WorkTicketDialog';
import WorkTickets from '@/components/renter/WorkTickets';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/SessionContext';
import { useRenterAccount } from '@/hooks/use-renter';
import { DEV_ACCOUNTS } from '@/lib/dev';
import { buildReceiptPdf, downloadPdf } from '@/lib/receipt';
import { CreditCard, Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { toast } from 'react-toastify';

const PayDialog = dynamic(() => import('@/components/renter/PayDialog'), { ssr: false });

const COMPANY = 'Timeless Carat Properties';

/** Builds and downloads a PDF covering `payments` made against one charge. */
function downloadReceipt(account, charge, payments, number) {
  try {
    const { tenant, user, lease } = account;
    const bytes = buildReceiptPdf({
      number,
      company: COMPANY,
      tenantName: [tenant.first_name, tenant.last_name].filter(Boolean).join(' ') || user.email,
      email: tenant.email ?? user.email,
      property: charge.property_name ?? lease?.property_name,
      unit: charge.unit_name ?? lease?.unit_name,
      charge,
      payments,
      issuedOn: new Date().toISOString(),
    });
    downloadPdf(bytes, `receipt-${number.toLowerCase()}.pdf`);
  } catch (error) {
    toast.error(`Could not create the receipt: ${error.message}`);
  }
}

const METHOD_LABELS = { ach: 'Bank transfer (ACH)', card: 'Card', check: 'Check', cash: 'Cash', other: 'Other' };

function Summary({ label, value, tone }) {
  return (
    <div className='flex flex-col gap-1 rounded-xl border border-border/70 bg-card/40 p-5'>
      <dt className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>{label}</dt>
      <dd className={`font-display text-3xl font-bold tabular-nums ${tone ?? ''}`}>{value}</dd>
    </div>
  );
}

function NoLease({ email }) {
  const { isDevBypass, signIn } = useSession();
  return (
    <div className='flex flex-col items-start gap-4 rounded-xl border border-dashed border-border p-8'>
      <h2 className='font-display text-2xl font-bold'>No lease is linked to this account</h2>
      <p className='max-w-xl text-pretty leading-relaxed text-muted-foreground'>
        Rent is matched to the email on your tenant record. {email} has none yet — ask management to add this address to
        your lease.
      </p>
      {isDevBypass && (
        <Button variant='outline' onClick={() => signIn(DEV_ACCOUNTS[2])}>
          Switch to the demo renter (Riley)
        </Button>
      )}
    </div>
  );
}

export default function RenterDashboard() {
  const { userId } = useSession();
  const { data: account, error, isLoading } = useRenterAccount(userId);
  const [paying, setPaying] = useState(null);

  const nextDue = account?.charges
    ?.filter((c) => c.balance_cents > 0)
    .toSorted((a, b) => a.due_date.localeCompare(b.due_date))[0];

  return (
    <section className='container flex flex-col gap-8 py-10'>
      <PageHeader
        title='My rent'
        description={
          account?.lease
            ? `${account.lease.unit_name}, ${account.lease.property_name} · lease ends ${shortDate(account.lease.end_date)}`
            : 'Review what you owe and pay securely online.'
        }
      >
        {account?.lease && (
          <WorkTicketDialog unitLabel={`${account.lease.unit_name}, ${account.lease.property_name}`} />
        )}
        {nextDue && (
          <Button size='lg' onClick={() => setPaying(nextDue)}>
            <CreditCard /> Pay {money(nextDue.balance_cents, { precise: true })}
          </Button>
        )}
      </PageHeader>

      <QueryState error={error} isLoading={isLoading}>
        {account && !account.tenant && <NoLease email={account.user.email} />}

        {account?.tenant && (
          <>
            <dl className='grid gap-4 sm:grid-cols-3'>
              <Summary label='Balance due' value={money(account.balanceCents, { precise: true })} />
              <Summary
                label='Past due'
                value={money(account.overdueCents, { precise: true })}
                tone={account.overdueCents > 0 ? 'text-destructive' : undefined}
              />
              <Summary label='Monthly rent' value={money(account.lease?.rent_cents ?? 0, { precise: true })} />
            </dl>

            <div className='flex flex-col gap-3'>
              <h2 className='font-display text-xl font-bold'>Charges</h2>
              <TableShell label='Rent charges'>
                <thead>
                  <tr>
                    <Th>Month</Th>
                    <Th>Due</Th>
                    <Th className='text-right'>Amount</Th>
                    <Th className='text-right'>Balance</Th>
                    <Th>Status</Th>
                    <Th>
                      <span className='sr-only'>Pay</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {account.charges.length === 0 && <EmptyRow colSpan={6}>No rent has been charged yet.</EmptyRow>}
                  {account.charges.map((charge) => (
                    <tr key={charge.id}>
                      <Td className='font-medium'>{monthLabel(charge.period)}</Td>
                      <Td>{shortDate(charge.due_date)}</Td>
                      <Td className='text-right tabular-nums'>{money(charge.amount_cents, { precise: true })}</Td>
                      <Td className='text-right font-medium tabular-nums'>{money(charge.balance_cents, { precise: true })}</Td>
                      <Td>
                        <StatusBadge status={charge.status} />
                      </Td>
                      <Td className='text-right'>
                        {charge.balance_cents > 0 && (
                          <Button size='sm' variant='outline' onClick={() => setPaying(charge)}>
                            Pay
                            <span className='sr-only'> {monthLabel(charge.period)}</span>
                          </Button>
                        )}
                        {charge.status === 'paid' && (
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() =>
                              downloadReceipt(
                                account,
                                charge,
                                account.payments.filter((p) => p.charge_id === charge.id),
                                `INV-${charge.period}-${charge.id}`
                              )
                            }
                          >
                            <Download /> Receipt
                            <span className='sr-only'> for {monthLabel(charge.period)}</span>
                          </Button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>

            <div className='flex flex-col gap-3'>
              <h2 className='font-display text-xl font-bold'>Payment history</h2>
              <TableShell label='Payment history'>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>For</Th>
                    <Th>Method</Th>
                    <Th>Reference</Th>
                    <Th className='text-right'>Amount</Th>
                    <Th>
                      <span className='sr-only'>Receipt</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {account.payments.length === 0 && <EmptyRow colSpan={6}>No payments yet.</EmptyRow>}
                  {account.payments.map((payment) => (
                    <tr key={payment.id}>
                      <Td>{shortDate(payment.paid_on)}</Td>
                      <Td>{monthLabel(payment.period)}</Td>
                      <Td>{METHOD_LABELS[payment.method] ?? humanize(payment.method)}</Td>
                      <Td className='max-w-[14rem] truncate text-muted-foreground'>{payment.reference ?? '—'}</Td>
                      <Td className='text-right font-medium tabular-nums'>{money(payment.amount_cents, { precise: true })}</Td>
                      <Td className='text-right'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => {
                            const charge = account.charges.find((c) => c.id === payment.charge_id);
                            if (charge) {
                              downloadReceipt(account, charge, [payment], `RCT-${String(payment.id).padStart(5, '0')}`);
                            }
                          }}
                        >
                          <Download /> Receipt
                          <span className='sr-only'> for payment on {shortDate(payment.paid_on)}</span>
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>

            <WorkTickets
              tickets={account.workOrders}
              unitLabel={account.lease ? `${account.lease.unit_name}, ${account.lease.property_name}` : undefined}
            />
          </>
        )}
      </QueryState>

      {paying && <PayDialog charge={paying} userId={userId} onClose={() => setPaying(null)} />}
    </section>
  );
}
