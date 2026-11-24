'use client';

import FlatIcon from '@/components/FlatIcon';
import VerifyIdentity from '@/components/admin/crm/VerifyIdentity';
import { Field, Select, StatusBadge, money, shortDate, titleCase } from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAdminAction, useLeadActivities } from '@/hooks/use-admin';
import * as crm from '@/lib/crm';
import Link from 'next/link';
import { useState } from 'react';

const KIND_ICONS = {
  note: 'comment-alt',
  call: 'phone-call',
  email: 'envelope',
  tour: 'calendar-check',
  verification: 'shield-check',
  stage: 'time-fast',
};

function when(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function LogActivity({ leadId }) {
  const { run, pending } = useAdminAction();
  const [kind, setKind] = useState('note');
  const [body, setBody] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (await run(() => crm.logActivity(leadId, { kind, body }))) setBody('');
  }

  return (
    <form onSubmit={submit} className='flex flex-col gap-2'>
      <div className='flex gap-2'>
        <Select aria-label='Activity type' value={kind} onChange={(e) => setKind(e.target.value)} className='w-32 shrink-0'>
          {crm.ACTIVITY_KINDS.map((k) => (
            <option key={k} value={k}>
              {titleCase(k)}
            </option>
          ))}
        </Select>
        <Input aria-label='Activity details' placeholder='What happened?' value={body} onChange={(e) => setBody(e.target.value)} />
        <Button type='submit' disabled={pending || !body.trim()}>
          Log
        </Button>
      </div>
    </form>
  );
}

function Timeline({ leadId }) {
  const { data: activities } = useLeadActivities(leadId);
  if (!activities?.length) return <p className='text-sm text-muted-foreground'>No activity yet.</p>;
  return (
    <ol className='flex flex-col gap-3'>
      {activities.map((a) => (
        <li key={a.id} className='flex gap-3'>
          <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary'>
            <FlatIcon name={KIND_ICONS[a.kind] ?? 'comment-alt'} />
          </span>
          <div className='flex min-w-0 flex-col'>
            <p className='text-pretty text-sm leading-relaxed'>{a.body}</p>
            <p className='text-xs capitalize text-muted-foreground'>
              {a.kind} · {when(a.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function LeadDialog({ lead, onClose }) {
  const { run, pending } = useAdminAction();
  if (!lead) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex flex-wrap items-center gap-2'>
            {lead.first_name} {lead.last_name}
            <StatusBadge status={lead.stage} />
          </DialogTitle>
          <DialogDescription>
            {[lead.email, lead.phone].filter(Boolean).join(' · ') || 'No contact details'} · from {lead.source}
          </DialogDescription>
        </DialogHeader>

        <dl className='grid gap-4 text-sm sm:grid-cols-3'>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Interested in</dt>
            <dd>{lead.unit_name ? `${lead.property_name} · ${lead.unit_name}` : 'No unit chosen'}</dd>
          </div>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Budget</dt>
            <dd>{lead.budget_cents ? `${money(lead.budget_cents)}/mo` : '—'}</dd>
          </div>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Desired move-in</dt>
            <dd>{shortDate(lead.desired_move_in)}</dd>
          </div>
        </dl>

        <div className='grid gap-4 sm:grid-cols-2'>
          <Field label='Stage' htmlFor='lead-stage'>
            <Select
              id='lead-stage'
              value={lead.stage}
              disabled={pending}
              onChange={(e) => run(() => crm.setLeadStage(lead.id, e.target.value))}
            >
              {crm.LEAD_STAGES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label='Follow up on' htmlFor='lead-follow'>
            <Input
              id='lead-follow'
              type='date'
              defaultValue={lead.follow_up_on ?? ''}
              disabled={pending}
              onChange={(e) => run(() => crm.setFollowUp(lead.id, e.target.value))}
            />
          </Field>
        </div>

        <VerifyIdentity lead={lead} />

        <section aria-labelledby='activity-heading' className='flex flex-col gap-3'>
          <h3 id='activity-heading' className='font-display text-base font-bold'>
            Activity
          </h3>
          <LogActivity leadId={lead.id} />
          <Timeline leadId={lead.id} />
        </section>

        {lead.notes && (
          <Field label='Notes' htmlFor='lead-notes'>
            <Textarea id='lead-notes' readOnly value={lead.notes} rows={2} />
          </Field>
        )}

        <div className='flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4'>
          <Button
            variant='ghost'
            className='text-destructive hover:text-destructive'
            disabled={pending}
            onClick={async () => {
              if (window.confirm(`Remove ${lead.first_name} ${lead.last_name} and their activity history?`)) {
                if (await run(() => crm.deleteLead(lead.id))) onClose();
              }
            }}
          >
            <FlatIcon name='trash' /> Remove lead
          </Button>
          {lead.application_id ? (
            <Link href='/admin/applications' className='text-sm font-medium text-primary hover:underline'>
              Application on file · review
            </Link>
          ) : (
            <Button disabled={pending} onClick={() => run(() => crm.promoteLead(lead.id))}>
              <FlatIcon name='user-add' /> Create application
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
