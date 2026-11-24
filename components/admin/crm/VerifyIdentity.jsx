'use client';

import FlatIcon from '@/components/FlatIcon';
import { StatusBadge, shortDate } from '@/components/admin/primitives';
import PlaidLauncher from '@/components/renter/PlaidLauncher';
import { Button } from '@/components/ui/button';
import { useAdminAction } from '@/hooks/use-admin';
import * as crm from '@/lib/crm';
import { postJson } from '@/lib/payments-client';
import { useState } from 'react';

const CHECK_LABELS = { name: 'Name', email: 'Email', phone: 'Phone' };

function parseStored(json) {
  try {
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

function CheckList({ checks }) {
  return (
    <ul className='flex flex-wrap gap-2' aria-label='Identity checks'>
      {Object.entries(CHECK_LABELS).map(([key, label]) => (
        <li
          key={key}
          className='flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground'
        >
          <FlatIcon name={checks[key] ? 'check-circle' : 'cross-circle'} className={checks[key] ? 'text-primary' : 'text-destructive'} />
          {label} {checks[key] ? 'matched' : 'not matched'}
        </li>
      ))}
    </ul>
  );
}

export default function VerifyIdentity({ lead }) {
  const [step, setStep] = useState('idle');
  const [linkToken, setLinkToken] = useState(null);
  const [error, setError] = useState(null);
  const { run } = useAdminAction();
  const stored = parseStored(lead.verification_json);
  const missingName = !lead.first_name || !lead.last_name;

  async function start() {
    setError(null);
    setStep('creating');
    try {
      const { linkToken: token } = await postJson('/api/plaid/link-token', { userId: `lead-${lead.id}`, purpose: 'verify' });
      setLinkToken(token);
      setStep('linking');
    } catch (e) {
      setError(e.message);
      setStep('idle');
    }
  }

  async function onLinked(publicToken, metadata) {
    setStep('checking');
    try {
      const result = await postJson('/api/plaid/verify', {
        publicToken,
        institution: metadata?.institution?.name,
        lead: { firstName: lead.first_name, lastName: lead.last_name, email: lead.email, phone: lead.phone },
      });
      await run(() => crm.recordVerification(lead.id, result));
    } catch (e) {
      setError(e.message);
    } finally {
      setLinkToken(null);
      setStep('idle');
    }
  }

  function onExit(exitError) {
    if (step === 'checking') return;
    if (exitError) setError(exitError.display_message ?? exitError.error_message ?? 'The bank connection was closed');
    setLinkToken(null);
    setStep('idle');
  }

  if (step === 'linking' && linkToken) {
    return (
      <PlaidLauncher
        token={linkToken}
        onSuccess={onLinked}
        onExit={onExit}
        title='Verify identity'
        description={`${lead.first_name} signs in to their bank in the Plaid window. We only compare the account holder's details.`}
        footnote='One-time check. No bank access is kept afterwards.'
      />
    );
  }

  return (
    <section aria-labelledby='verify-heading' className='flex flex-col gap-3 rounded-xl border border-border/70 bg-card/40 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h3 id='verify-heading' className='flex items-center gap-2 font-display text-base font-bold'>
          <FlatIcon name='shield-check' className='text-primary' />
          Identity verification
        </h3>
        <StatusBadge status={lead.verification_status} />
      </div>

      {stored ? (
        <>
          <CheckList checks={stored.checks} />
          <p className='text-sm text-muted-foreground'>
            Checked with Plaid on {shortDate(lead.verified_at)}
            {stored.institution ? ` through ${stored.institution}` : ''}
            {stored.accountMask ? `, account ending ${stored.accountMask}` : ''}.
          </p>
        </>
      ) : (
        <p className='text-pretty text-sm leading-relaxed text-muted-foreground'>
          Have the lead link a bank account through Plaid. We compare the account holder&apos;s name, email and phone to what you have
          on file.
        </p>
      )}

      {error && (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      )}

      <div>
        <Button
          variant={stored ? 'outline' : 'default'}
          onClick={start}
          disabled={missingName || step === 'creating' || step === 'checking'}
        >
          <FlatIcon name='bank' />
          {step === 'creating' ? 'Preparing…' : step === 'checking' ? 'Checking identity…' : stored ? 'Verify again' : 'Verify with Plaid'}
        </Button>
      </div>
    </section>
  );
}
