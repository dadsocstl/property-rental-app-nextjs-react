'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const STEPS = [
  { key: 'open', label: 'Received' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
];

export function TicketProgress({ status }) {
  if (status === 'cancelled') {
    return <p className='rounded-lg border border-border/70 bg-secondary/40 px-3 py-2 text-sm'>This ticket was withdrawn.</p>;
  }
  const current = STEPS.findIndex((step) => step.key === status);
  return (
    <ol className='grid grid-cols-4 gap-2' aria-label='Ticket progress'>
      {STEPS.map((step, index) => {
        const reached = index <= current;
        return (
          <li key={step.key} className='flex flex-col gap-1.5' aria-current={index === current ? 'step' : undefined}>
            <span className={cn('h-1.5 rounded-full', reached ? 'bg-primary' : 'bg-border')} aria-hidden='true' />
            <span className={cn('text-xs', reached ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {step.label}
              <span className='sr-only'>{reached ? ' (reached)' : ' (not yet)'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const stamp = (iso) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function TicketTimeline({ events, viewerRole }) {
  if (!events?.length) return <p className='text-sm text-muted-foreground'>No activity yet.</p>;
  return (
    <ol className='flex flex-col gap-3'>
      {events.map((event) => {
        const isMessage = event.kind === 'comment';
        const mine = event.author_role === viewerRole;
        const who = mine ? 'You' : event.author_name || (event.author_role === 'landlord' ? 'Management' : 'Tenant');
        return (
          <li
            key={event.id}
            className={cn(
              'rounded-lg border px-3 py-2.5 text-sm',
              isMessage ? 'border-border/70 bg-card/60' : 'border-transparent bg-secondary/30',
              event.internal ? 'border-dashed border-primary/60 bg-primary/10' : ''
            )}
          >
            <p className='flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground'>
              <span className='font-semibold text-foreground'>
                {who}
                {event.internal ? ' · internal note' : ''}
              </span>
              <time dateTime={event.created_at}>{stamp(event.created_at)}</time>
            </p>
            <p className={cn('mt-1 text-pretty leading-relaxed', !isMessage && 'text-muted-foreground')}>{event.body}</p>
          </li>
        );
      })}
    </ol>
  );
}

/** `onSend(body, internal)` should resolve truthy when the message was saved. */
export function TicketComposer({ onSend, pending, allowInternal = false, placeholder = 'Write a message…' }) {
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!body.trim()) return;
    if (await onSend(body, internal)) setBody('');
  }

  return (
    <form onSubmit={submit} className='flex flex-col gap-2'>
      <label htmlFor='ticket-message' className='sr-only'>
        Message
      </label>
      <Textarea
        id='ticket-message'
        rows={3}
        value={body}
        maxLength={2000}
        placeholder={internal ? 'Internal note — the tenant will not see this' : placeholder}
        onChange={(event) => setBody(event.target.value)}
      />
      <div className='flex flex-wrap items-center justify-between gap-3'>
        {allowInternal ? (
          <label className='flex items-center gap-2 text-sm text-muted-foreground'>
            <input
              type='checkbox'
              checked={internal}
              onChange={(event) => setInternal(event.target.checked)}
              className='size-4 accent-primary'
            />
            Internal note (hidden from tenant)
          </label>
        ) : (
          <span />
        )}
        <Button type='submit' size='sm' disabled={pending || !body.trim()}>
          {internal ? 'Save note' : 'Send message'}
        </Button>
      </div>
    </form>
  );
}
