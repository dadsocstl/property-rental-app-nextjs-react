'use client';

import FlatIcon from '@/components/FlatIcon';
import LeadDialog from '@/components/admin/crm/LeadDialog';
import FormDialog from '@/components/admin/FormDialog';
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
  shortDate,
  titleCase,
} from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLeads, useUnits } from '@/hooks/use-admin';
import * as crm from '@/lib/crm';
import { todayIso } from '@/lib/admin';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';

function AddLeadDialog() {
  const { data: units } = useUnits();
  const open = (units ?? []).filter((u) => !u.lease_id);
  return (
    <FormDialog
      title='Add lead'
      description='Capture a prospect now; verify and convert them later.'
      submitLabel='Save lead'
      action={crm.addLead}
      trigger={
        <Button>
          <FlatIcon name='plus' /> Add lead
        </Button>
      }
    >
      <Field label='First name' htmlFor='lead-first'>
        <Input id='lead-first' name='firstName' required />
      </Field>
      <Field label='Last name' htmlFor='lead-last'>
        <Input id='lead-last' name='lastName' required />
      </Field>
      <Field label='Email' htmlFor='lead-email'>
        <Input id='lead-email' name='email' type='email' />
      </Field>
      <Field label='Phone' htmlFor='lead-phone'>
        <Input id='lead-phone' name='phone' type='tel' />
      </Field>
      <Field label='Source' htmlFor='lead-source'>
        <Select id='lead-source' name='source' defaultValue='website'>
          {crm.LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label='Interested unit' htmlFor='lead-unit'>
        <Select id='lead-unit' name='unitId' defaultValue=''>
          <option value=''>Not decided</option>
          {open.map((u) => (
            <option key={u.id} value={u.id}>
              {u.property_name} · {u.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label='Monthly budget' htmlFor='lead-budget'>
        <Input id='lead-budget' name='budget' inputMode='decimal' placeholder='2400' />
      </Field>
      <Field label='Desired move-in' htmlFor='lead-move'>
        <Input id='lead-move' name='desiredMoveIn' type='date' />
      </Field>
      <Field label='Follow up on' htmlFor='lead-follow-new'>
        <Input id='lead-follow-new' name='followUpOn' type='date' defaultValue={todayIso()} />
      </Field>
      <Field label='Notes' htmlFor='lead-notes-new' className='sm:col-span-2'>
        <Textarea id='lead-notes-new' name='notes' rows={2} />
      </Field>
    </FormDialog>
  );
}

function Stat({ icon, label, value, hint }) {
  return (
    <div className='flex items-center gap-3 rounded-xl border border-border/70 bg-card/40 p-4'>
      <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary'>
        <FlatIcon name={icon} className='text-lg' />
      </span>
      <div className='flex flex-col'>
        <span className='font-display text-2xl font-bold tabular-nums'>{value}</span>
        <span className='text-xs text-muted-foreground'>{label}</span>
        {hint && <span className='sr-only'>{hint}</span>}
      </div>
    </div>
  );
}

function LeadRow({ lead, onOpen }) {
  const overdue = lead.follow_up_on && lead.follow_up_on < todayIso() && !['won', 'lost'].includes(lead.stage);
  return (
    <tr className='hover:bg-secondary/30'>
      <Td>
        <button
          type='button'
          onClick={() => onOpen(lead.id)}
          className='flex flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <span className='font-medium text-foreground hover:underline'>
            {lead.first_name} {lead.last_name}
          </span>
          <span className='text-xs text-muted-foreground'>{lead.email ?? lead.phone ?? 'No contact details'}</span>
        </button>
      </Td>
      <Td className='text-muted-foreground'>
        {lead.unit_name ? `${lead.property_name} · ${lead.unit_name}` : '—'}
        {lead.budget_cents ? <span className='block text-xs'>Budget {money(lead.budget_cents)}</span> : null}
      </Td>
      <Td>
        <StatusBadge status={lead.stage} />
      </Td>
      <Td>
        <StatusBadge status={lead.verification_status} />
      </Td>
      <Td className={cn('whitespace-nowrap', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
        {lead.follow_up_on ? shortDate(lead.follow_up_on) : '—'}
        {overdue && <span className='sr-only'> (overdue)</span>}
      </Td>
      <Td className='text-right'>
        <Button size='sm' variant='secondary' onClick={() => onOpen(lead.id)}>
          Open
        </Button>
      </Td>
    </tr>
  );
}

export default function CrmView() {
  const { data: leads, error, isLoading } = useLeads();
  const [stage, setStage] = useState('open');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);

  const stats = useMemo(() => {
    const all = leads ?? [];
    const active = all.filter((l) => !['won', 'lost'].includes(l.stage));
    return {
      active: active.length,
      due: active.filter((l) => l.follow_up_on && l.follow_up_on <= todayIso()).length,
      tours: all.filter((l) => l.stage === 'tour').length,
      verified: all.filter((l) => l.verification_status === 'verified').length,
    };
  }, [leads]);

  const tabs = useMemo(() => {
    const all = leads ?? [];
    return [
      { value: 'open', label: 'Open', count: stats.active },
      ...crm.LEAD_STAGES.map((s) => ({ value: s, label: titleCase(s), count: all.filter((l) => l.stage === s).length })),
    ];
  }, [leads, stats.active]);

  const visible = (leads ?? []).filter((l) => {
    const inStage = stage === 'open' ? !['won', 'lost'].includes(l.stage) : l.stage === stage;
    const haystack = `${l.first_name} ${l.last_name} ${l.email ?? ''} ${l.phone ?? ''}`.toLowerCase();
    return inStage && haystack.includes(search.trim().toLowerCase());
  });

  const openLead = (leads ?? []).find((l) => l.id === openId) ?? null;

  return (
    <>
      <PageHeader
        title='CRM'
        description='Track prospects from first enquiry to application, and confirm who they are with Plaid before you screen them.'
      >
        <AddLeadDialog />
      </PageHeader>

      <QueryState error={error} isLoading={isLoading}>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          <Stat icon='users' label='Open leads' value={stats.active} />
          <Stat icon='time-fast' label='Follow-ups due' value={stats.due} />
          <Stat icon='calendar-check' label='Tours in progress' value={stats.tours} />
          <Stat icon='shield-check' label='Identity verified' value={stats.verified} />
        </div>

        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <FilterTabs label='Filter by stage' value={stage} onChange={setStage} options={tabs} />
          <div className='relative sm:w-64'>
            <FlatIcon name='search' className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' />
            <Input
              aria-label='Search leads'
              placeholder='Search leads'
              className='pl-9'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <TableShell label='Leads'>
          <thead>
            <tr>
              <Th>Lead</Th>
              <Th>Interested in</Th>
              <Th>Stage</Th>
              <Th>Identity</Th>
              <Th>Follow up</Th>
              <Th className='text-right'>
                <span className='sr-only'>Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <EmptyRow colSpan={6}>No leads match this view.</EmptyRow>}
            {visible.map((lead) => (
              <LeadRow key={lead.id} lead={lead} onOpen={setOpenId} />
            ))}
          </tbody>
        </TableShell>
      </QueryState>

      <LeadDialog lead={openLead} onClose={() => setOpenId(null)} />
    </>
  );
}
