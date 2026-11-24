'use client';

import FlatIcon from '@/components/FlatIcon';
import { Field, StatusBadge, humanize, money, shortDate, titleCase } from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAdminAction } from '@/hooks/use-admin';
import * as admin from '@/lib/admin';
import { useState } from 'react';

const IDV_STEP_LABELS = {
  documentary_verification: 'Photo ID',
  selfie_check: 'Selfie match',
  kyc_check: 'Identity records',
  watchlist_screening: 'Watchlist screening',
  risk_check: 'Fraud risk',
};

const INCOME_BAR = 3;

function parse(json) {
  try {
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

function Check({ ok, children }) {
  return (
    <li className='flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium'>
      <FlatIcon name={ok ? 'check-circle' : 'cross-circle'} className={ok ? 'text-primary' : 'text-destructive'} />
      {children}
    </li>
  );
}

function Panel({ icon, title, status, children }) {
  return (
    <section className='flex flex-col gap-3 rounded-xl border border-border/70 bg-card/40 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h3 className='flex items-center gap-2 font-display text-base font-bold'>
          <FlatIcon name={icon} className='text-primary' />
          {title}
        </h3>
        <StatusBadge status={status} />
      </div>
      {children}
    </section>
  );
}

function IdentityPanel({ app }) {
  const idv = parse(app.idv_json);
  return (
    <Panel icon='shield-check' title='Identity' status={app.idv_status}>
      {!idv ? (
        <p className='text-sm text-muted-foreground'>This applicant was entered by hand and has not been verified with Plaid.</p>
      ) : (
        <>
          <ul className='flex flex-wrap gap-2' aria-label='Identity checks'>
            {idv.method === 'plaid_idv'
              ? Object.entries(IDV_STEP_LABELS)
                  .filter(([key]) => idv.steps?.[key] && idv.steps[key] !== 'not_applicable')
                  .map(([key, label]) => (
                    <Check key={key} ok={idv.steps[key] === 'success'}>
                      {label} {idv.steps[key] === 'success' ? 'passed' : humanize(idv.steps[key])}
                    </Check>
                  ))
              : [
                  ['name', 'Name'],
                  ['email', 'Email'],
                  ['phone', 'Phone'],
                ].map(([key, label]) => (
                  <Check key={key} ok={Boolean(idv.checks?.[key])}>
                    {label} {idv.checks?.[key] ? 'matched' : 'not matched'}
                  </Check>
                ))}
            {idv.method === 'plaid_idv' && idv.nameMatches !== null && (
              <Check ok={idv.nameMatches}>Name {idv.nameMatches ? 'matches application' : 'differs from application'}</Check>
            )}
          </ul>
          <p className='text-sm text-muted-foreground'>
            {idv.method === 'plaid_idv' ? 'Plaid Identity Verification' : 'Bank account ownership via Plaid Identity'} ·{' '}
            {shortDate(app.idv_checked_at)}
            {idv.institution ? ` · ${idv.institution}` : ''}
          </p>
          {app.idv_status === 'review' && (
            <p className='text-sm text-primary'>Plaid flagged this for a manual look. Confirm the details before approving.</p>
          )}
        </>
      )}
    </Panel>
  );
}

function IncomePanel({ app }) {
  const income = parse(app.income_json);
  const rent = app.market_rent_cents;
  const verified = app.income_verified_cents;
  const ratio = rent && verified ? verified / rent : null;
  return (
    <Panel icon='bank' title='Income' status={app.income_status}>
      <dl className='grid grid-cols-3 gap-3 text-sm'>
        <div>
          <dt className='text-xs uppercase tracking-wide text-muted-foreground'>Stated</dt>
          <dd className='tabular-nums'>{app.monthly_income_cents ? money(app.monthly_income_cents) : '—'}</dd>
        </div>
        <div>
          <dt className='text-xs uppercase tracking-wide text-muted-foreground'>Verified</dt>
          <dd className='tabular-nums font-semibold'>{verified ? money(verified) : 'Not verified'}</dd>
        </div>
        <div>
          <dt className='text-xs uppercase tracking-wide text-muted-foreground'>Rent</dt>
          <dd className='tabular-nums'>{rent ? money(rent) : '—'}</dd>
        </div>
      </dl>
      {ratio !== null && (
        <p className={`text-sm ${ratio < INCOME_BAR ? 'font-semibold text-primary' : ''}`}>
          Verified income is {ratio.toFixed(1)}× rent{ratio < INCOME_BAR ? `, below the usual ${INCOME_BAR}× bar` : ''}.
        </p>
      )}
      {income?.sources?.length > 0 && (
        <ul className='flex flex-col gap-1.5 text-sm'>
          {income.sources.map((source, i) => (
            <li key={`${source.description}-${i}`} className='flex flex-wrap items-baseline justify-between gap-2'>
              <span>
                {source.description}
                <span className='text-muted-foreground'>
                  {' '}
                  · {titleCase(source.category)} · {humanize(source.payFrequency)}
                </span>
              </span>
              <span className='tabular-nums'>{money(source.monthlyCents)}/mo</span>
            </li>
          ))}
        </ul>
      )}
      {income && (
        <p className='text-sm text-muted-foreground'>
          Plaid Income · last {income.days} days · {shortDate(app.income_checked_at)}
        </p>
      )}
    </Panel>
  );
}

function Decision({ app, onDone }) {
  const { run, pending } = useAdminAction();
  const [note, setNote] = useState(app.decision_note ?? '');
  const locked = Boolean(app.tenant_id);

  async function decide(status) {
    if (await run(() => admin.decideApplication(app.id, status, note))) onDone();
  }

  return (
    <section className='flex flex-col gap-3'>
      <Field label='Note to the applicant' htmlFor='decision-note' hint='Required when declining, so you can tell them why.'>
        <Textarea id='decision-note' rows={3} value={note} onChange={(e) => setNote(e.target.value)} disabled={locked} />
      </Field>
      <div className='flex flex-wrap gap-2'>
        <Button type='button' disabled={pending || locked} onClick={() => decide('approved')}>
          Approve
        </Button>
        <Button type='button' variant='secondary' disabled={pending || locked} onClick={() => decide('screening')}>
          Keep screening
        </Button>
        <Button
          type='button'
          variant='outline'
          className='text-destructive'
          disabled={pending || locked || !note.trim()}
          onClick={() => decide('declined')}
        >
          Decline
        </Button>
      </div>
    </section>
  );
}

export default function ApplicationReview({ app, open, onOpenChange }) {
  if (!app) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex flex-wrap items-center gap-2'>
            {app.first_name} {app.last_name}
            <StatusBadge status={app.status} />
          </DialogTitle>
          <DialogDescription>
            {[app.email, app.phone].filter(Boolean).join(' · ') || 'No contact details'}
            {app.property_name ? ` · ${app.property_name} · ${app.unit_name}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <dl className='grid grid-cols-3 gap-3 text-sm'>
            <div>
              <dt className='text-xs uppercase tracking-wide text-muted-foreground'>Employer</dt>
              <dd>{app.employer || '—'}</dd>
            </div>
            <div>
              <dt className='text-xs uppercase tracking-wide text-muted-foreground'>Move-in</dt>
              <dd className='tabular-nums'>{shortDate(app.desired_move_in)}</dd>
            </div>
            <div>
              <dt className='text-xs uppercase tracking-wide text-muted-foreground'>Applied</dt>
              <dd className='tabular-nums'>{shortDate(app.created_at)}</dd>
            </div>
          </dl>
          {app.notes && <p className='rounded-lg bg-muted p-3 text-sm'>{app.notes}</p>}
          <IdentityPanel app={app} />
          <IncomePanel app={app} />
          <Decision key={app.id} app={app} onDone={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
