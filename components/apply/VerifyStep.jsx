'use client';

import FlatIcon from '@/components/FlatIcon';
import { StatusBadge, money } from '@/components/admin/primitives';
import PlaidLauncher from '@/components/renter/PlaidLauncher';
import { Button } from '@/components/ui/button';
import { postJson } from '@/lib/payments-client';
import { useRef, useState } from 'react';

const COPY = {
  identity: {
    icon: 'shield-check',
    title: 'Verify your identity',
    intro: 'Plaid confirms you are who you say you are. Your ID and bank login are never shared with the landlord.',
    button: 'Verify with Plaid',
    linking: 'Complete the verification in the Plaid window.',
    footnote: 'Handled by Plaid. We keep only the result, not your ID or bank login.',
  },
  income: {
    icon: 'bank',
    title: 'Verify your income',
    intro: 'Optional, but verified income makes your application easier to approve. Connect the account your pay goes into and Plaid reports the deposits.',
    button: 'Verify income with Plaid',
    linking: 'Choose the account your income is paid into.',
    footnote: 'Read-only. Plaid sends us total income, not your balance or transactions.',
  },
};

const IDV_STEP_LABELS = {
  documentary_verification: 'Photo ID',
  selfie_check: 'Selfie',
  kyc_check: 'Identity records',
  watchlist_screening: 'Watchlist',
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function IdentityResult({ value }) {
  if (value.method === 'plaid_idv') {
    return (
      <ul className='flex flex-wrap gap-2' aria-label='Identity checks'>
        {Object.entries(IDV_STEP_LABELS)
          .filter(([key]) => value.steps?.[key] && value.steps[key] !== 'not_applicable')
          .map(([key, label]) => {
            const ok = value.steps[key] === 'success';
            return (
              <li key={key} className='flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium'>
                <FlatIcon name={ok ? 'check-circle' : 'cross-circle'} className={ok ? 'text-primary' : 'text-destructive'} />
                {label} {ok ? 'passed' : 'needs review'}
              </li>
            );
          })}
      </ul>
    );
  }
  const checks = value.checks ?? {};
  return (
    <ul className='flex flex-wrap gap-2' aria-label='Identity checks'>
      {[
        ['name', 'Name'],
        ['email', 'Email'],
        ['phone', 'Phone'],
      ].map(([key, label]) => (
        <li key={key} className='flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium'>
          <FlatIcon name={checks[key] ? 'check-circle' : 'cross-circle'} className={checks[key] ? 'text-primary' : 'text-destructive'} />
          {label} {checks[key] ? 'matched' : 'not matched'}
        </li>
      ))}
    </ul>
  );
}

function IncomeResult({ value }) {
  return (
    <p className='text-sm leading-relaxed'>
      Plaid verified about <strong className='tabular-nums'>{money(value.monthlyCents)}</strong> a month across{' '}
      {value.sources?.length ?? 0} income {value.sources?.length === 1 ? 'source' : 'sources'} over the last {value.days} days.
    </p>
  );
}

/**
 * Runs one Plaid check for the applicant. The server creates the Link token (Identity Verification or Income) and
 * reads the result back from Plaid, so what the landlord sees never comes from the browser.
 */
export default function VerifyStep({ kind, applicant, applicantId, value, onChange, disabled, disabledReason, unavailable }) {
  const copy = COPY[kind];
  const [phase, setPhase] = useState('idle');
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const headingId = `verify-${kind}`;
  const checking = useRef(false);

  async function start() {
    setError(null);
    setPhase('creating');
    try {
      const body = { step: kind, applicantId, applicant };
      setSession(await postJson('/api/plaid/applicant/link-token', body));
      setPhase('linking');
    } catch (e) {
      setError(e.message);
      setPhase('idle');
    }
  }

  async function onLinked(publicToken, metadata) {
    if (checking.current) return;
    checking.current = true;
    setPhase('checking');
    try {
      const payload = {
        step: kind,
        method: session.method,
        applicantId,
        applicant,
        publicToken,
        institution: metadata?.institution?.name,
        plaidUserId: session.plaidUserId,
      };
      let result = await postJson('/api/plaid/applicant/complete', payload);
      // Plaid builds income and ID results asynchronously after Link closes.
      for (let attempt = 0; result.status === 'pending' && attempt < 8; attempt += 1) {
        await wait(3000);
        result = await postJson('/api/plaid/applicant/complete', payload);
      }
      if (result.status === 'pending') throw new Error('Plaid is still processing. Try again in a minute.');
      onChange(result);
      if (result.status === 'failed') {
        setError(kind === 'identity' ? 'We could not match your details to the verification. Check your name and try again.' : 'Plaid found no income deposits in that account.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      checking.current = false;
      setSession(null);
      setPhase('idle');
    }
  }

  function onExit(exitError) {
    if (phase === 'checking') return;
    if (exitError) setError(exitError.display_message ?? exitError.error_message ?? 'The connection was closed');
    setSession(null);
    setPhase('idle');
  }

  if (phase === 'linking' && session) {
    return (
      <PlaidLauncher
        token={session.linkToken}
        onSuccess={onLinked}
        onExit={onExit}
        title={copy.title}
        description={copy.linking}
        footnote={copy.footnote}
      />
    );
  }

  const done = value && value.status !== 'failed';
  return (
    <section aria-labelledby={headingId} className='flex flex-col gap-3 rounded-xl border border-border/70 bg-card/40 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h3 id={headingId} className='flex items-center gap-2 font-display text-base font-bold'>
          <FlatIcon name={copy.icon} className='text-primary' />
          {copy.title}
        </h3>
        {value && <StatusBadge status={value.status} />}
      </div>

      {value && value.status !== 'failed' ? (
        <>
          {kind === 'identity' ? <IdentityResult value={value} /> : <IncomeResult value={value} />}
          {value.status === 'review' && (
            <p className='text-sm text-muted-foreground'>
              Plaid flagged something for a manual look. You can still submit and the landlord will review it.
            </p>
          )}
        </>
      ) : (
        <p className='text-pretty text-sm leading-relaxed text-muted-foreground'>{unavailable ?? copy.intro}</p>
      )}

      {error && (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      )}
      {disabled && disabledReason && !unavailable && <p className='text-xs text-muted-foreground'>{disabledReason}</p>}

      <div>
        <Button
          type='button'
          variant={done ? 'outline' : 'default'}
          onClick={start}
          disabled={disabled || Boolean(unavailable) || phase === 'creating' || phase === 'checking'}
        >
          <FlatIcon name='bank' />
          {phase === 'creating' ? 'Preparing…' : phase === 'checking' ? 'Checking with Plaid…' : done ? 'Verify again' : copy.button}
        </Button>
      </div>
    </section>
  );
}
