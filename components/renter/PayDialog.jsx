'use client';

import { Field, money, monthLabel } from '@/components/admin/primitives';
import PlaidLauncher from '@/components/renter/PlaidLauncher';
import StripeCheckout from '@/components/renter/StripeCheckout';
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
import { useAdminAction } from '@/hooks/use-admin';
import { usePaymentConfig } from '@/hooks/use-renter';
import { toCents } from '@/lib/admin';
import { getCheckoutResult, postJson } from '@/lib/payments-client';
import { prepareRenterPayment, recordRenterPayment } from '@/lib/renter';
import { cn } from '@/lib/utils';
import { Building, CheckCircle2, CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';

const METHODS = [
  { value: 'card', label: 'Card', hint: 'Debit or credit via Stripe', icon: CreditCard },
  { value: 'bank', label: 'Bank account', hint: 'ACH transfer verified by Plaid', icon: Building },
];

export default function PayDialog({ charge, userId, onClose }) {
  const { data: config } = usePaymentConfig();
  const { run } = useAdminAction();
  const [chosen, setChosen] = useState(null);
  const [amountText, setAmountText] = useState((charge.balance_cents / 100).toFixed(2));
  const [step, setStep] = useState('choose');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [linkToken, setLinkToken] = useState(null);
  const [bank, setBank] = useState(null);
  const [linked, setLinked] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const method = chosen ?? (config?.card ? 'card' : config?.bank ? 'bank' : 'card');
  const available = { card: Boolean(config?.card), bank: Boolean(config?.bank) };
  const locked = step === 'confirming' || busy;

  async function start(event) {
    event.preventDefault();
    const cents = toCents(amountText);
    if (!Number.isInteger(cents) || cents < 100) return setError('Enter an amount of at least $1.00');
    if (cents > charge.balance_cents) {
      return setError(`You owe ${money(charge.balance_cents, { precise: true })} on this charge`);
    }
    setBusy(true);
    setError('');
    try {
      const prepared = await prepareRenterPayment(charge.id, cents);
      const next = { chargeId: charge.id, amountCents: cents, ...prepared };
      setPayment(next);
      if (method === 'card') {
        setCheckout(await postJson('/api/stripe/checkout', next));
        setStep('card');
      } else {
        const { linkToken: token } = await postJson('/api/plaid/link-token', { userId });
        setLinkToken(token);
        setStep('linking');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function settle(confirmed, label) {
    const saved = await run(() => recordRenterPayment(confirmed));
    if (!saved) {
      setError(`Your payment went through but could not be saved here. Keep reference ${confirmed.reference}.`);
      setStep('problem');
      return;
    }
    setReceipt({ amountCents: confirmed.amountCents, label, reference: confirmed.reference });
    setStep('done');
  }

  async function finishCard() {
    setStep('confirming');
    try {
      const result = await getCheckoutResult(checkout.sessionId);
      if (result.paymentStatus !== 'paid' || result.chargeId !== charge.id) {
        throw new Error('Stripe has not confirmed this payment. You have not been charged.');
      }
      await settle(
        { chargeId: charge.id, amountCents: result.amountCents, method: 'card', reference: result.reference },
        'Card'
      );
    } catch (err) {
      setError(err.message);
      setStep('problem');
    }
  }

  async function payFromBank() {
    setStep('confirming');
    try {
      const result = await postJson('/api/plaid/pay', { ...payment, publicToken: bank.publicToken, accountId: bank.accountId });
      await settle(
        { chargeId: charge.id, amountCents: result.amountCents, method: 'ach', reference: result.reference },
        bank.label
      );
    } catch (err) {
      setError(err.message);
      setStep('problem');
    }
  }

  function accountLabel(institution, account) {
    return `${institution ?? 'Bank'} · ${account.name}${account.mask ? ` ••${account.mask}` : ''}`;
  }

  function chooseAccount(publicToken, institution, account) {
    setBank({ publicToken, accountId: account.id, label: accountLabel(institution, account) });
    setStep('bank-confirm');
  }

  function onLinked(publicToken, metadata) {
    const institution = metadata.institution?.name;
    const accounts = metadata.accounts ?? [];
    if (accounts.length === 0) {
      setError('No eligible checking or savings account was selected');
      setStep('choose');
    } else if (accounts.length === 1) {
      chooseAccount(publicToken, institution, accounts[0]);
    } else {
      setLinked({ publicToken, institution, accounts });
      setStep('pick-account');
    }
  }

  function onLinkExit(err) {
    setLinkToken(null);
    setError(err ? (err.display_message ?? err.error_message ?? 'The bank connection was interrupted') : '');
    setStep('choose');
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !locked && onClose()}>
      <DialogContent className={cn('max-h-[90vh] overflow-y-auto', step === 'card' ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <DialogHeader>
          <DialogTitle>Pay rent for {monthLabel(charge.period)}</DialogTitle>
          <DialogDescription>
            {charge.unit_name}, {charge.property_name} · {money(charge.balance_cents, { precise: true })} outstanding
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' && (
          <form id='pay-form' onSubmit={start} className='flex flex-col gap-5'>
            <Field label='Amount to pay' htmlFor='pay-amount' hint='Pay the full balance or a partial amount.'>
              <Input
                id='pay-amount'
                inputMode='decimal'
                autoComplete='off'
                value={amountText}
                onChange={(event) => setAmountText(event.target.value)}
              />
            </Field>

            <fieldset className='flex flex-col gap-2'>
              <legend className='mb-1.5 text-sm font-medium'>Payment method</legend>
              {METHODS.map(({ value, label, hint, icon: Icon }) => (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                    method === value && 'border-primary bg-primary/10',
                    !available[value] && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <input
                    type='radio'
                    name='method'
                    value={value}
                    className='sr-only'
                    checked={method === value}
                    disabled={!available[value]}
                    onChange={() => setChosen(value)}
                  />
                  <Icon className='size-5 text-primary' aria-hidden='true' />
                  <span className='flex flex-col'>
                    <span className='text-sm font-semibold'>{label}</span>
                    <span className='text-xs text-muted-foreground'>
                      {available[value] ? hint : value === 'bank' ? 'Needs Plaid credentials to be added' : 'Stripe is not configured'}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            {error && (
              <p role='alert' className='text-sm text-destructive'>
                {error}
              </p>
            )}
          </form>
        )}

        {step === 'card' && checkout && <StripeCheckout clientSecret={checkout.clientSecret} onComplete={finishCard} />}

        {step === 'linking' && linkToken && <PlaidLauncher token={linkToken} onSuccess={onLinked} onExit={onLinkExit} />}

        {step === 'pick-account' && linked && (
          <div className='flex flex-col gap-3'>
            <p className='text-sm text-muted-foreground'>Choose the account to pay from.</p>
            <ul className='flex flex-col gap-2'>
              {linked.accounts.map((account) => (
                <li key={account.id}>
                  <button
                    type='button'
                    onClick={() => chooseAccount(linked.publicToken, linked.institution, account)}
                    className='flex w-full items-center justify-between gap-3 rounded-lg border border-border/70 p-3 text-left transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  >
                    <span className='text-sm font-semibold'>{account.name}</span>
                    <span className='text-xs capitalize text-muted-foreground'>
                      {account.subtype}
                      {account.mask ? ` ••${account.mask}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 'bank-confirm' && bank && (
          <div className='flex flex-col gap-4'>
            <dl className='flex flex-col gap-3 rounded-lg border border-border/70 bg-card/40 p-4 text-sm'>
              <div className='flex justify-between gap-4'>
                <dt className='text-muted-foreground'>From</dt>
                <dd className='text-right font-medium'>{bank.label}</dd>
              </div>
              <div className='flex justify-between gap-4'>
                <dt className='text-muted-foreground'>Amount</dt>
                <dd className='font-semibold tabular-nums'>{money(payment.amountCents, { precise: true })}</dd>
              </div>
            </dl>
            <p className='text-xs leading-relaxed text-muted-foreground'>
              By continuing you authorize Timeless Carat Properties to debit this account once for the amount above. ACH
              transfers can take several business days to settle.
            </p>
          </div>
        )}

        {step === 'confirming' && (
          <p role='status' className='flex items-center justify-center gap-2 py-10 text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' aria-hidden='true' />
            Confirming your payment…
          </p>
        )}

        {step === 'done' && receipt && (
          <div role='status' className='flex flex-col items-center gap-3 py-6 text-center'>
            <CheckCircle2 className='size-10 text-primary' aria-hidden='true' />
            <p className='font-display text-2xl font-bold tabular-nums'>{money(receipt.amountCents, { precise: true })}</p>
            <p className='text-sm text-muted-foreground'>Paid with {receipt.label}</p>
            <p className='break-all text-xs text-muted-foreground'>Reference {receipt.reference}</p>
          </div>
        )}

        {step === 'problem' && (
          <p role='alert' className='py-4 text-sm leading-relaxed text-destructive'>
            {error}
          </p>
        )}

        <DialogFooter>
          {step === 'choose' && (
            <>
              <Button variant='outline' onClick={onClose}>
                Cancel
              </Button>
              <Button type='submit' form='pay-form' disabled={busy || !available[method]}>
                {busy ? 'Preparing…' : 'Continue'}
              </Button>
            </>
          )}
          {step === 'bank-confirm' && (
            <>
              <Button variant='outline' onClick={() => setStep(linked?.accounts.length > 1 ? 'pick-account' : 'choose')}>
                Back
              </Button>
              <Button onClick={payFromBank}>Pay {money(payment.amountCents, { precise: true })}</Button>
            </>
          )}
          {(step === 'card' || step === 'problem' || step === 'linking' || step === 'pick-account') && (
            <Button variant='outline' onClick={onClose}>
              Close
            </Button>
          )}
          {step === 'done' && <Button onClick={onClose}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
