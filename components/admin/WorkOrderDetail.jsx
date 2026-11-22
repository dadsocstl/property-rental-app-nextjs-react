'use client';

import { Field, Select, StatusBadge, humanize, shortDate } from '@/components/admin/primitives';
import { TicketComposer, TicketProgress, TicketTimeline } from '@/components/tickets/TicketThread';
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
import { useAdminAction, useWorkOrderEvents } from '@/hooks/use-admin';
import * as admin from '@/lib/admin';
import { Mail, Phone } from 'lucide-react';
import { useState } from 'react';

function tenantLabel(order) {
  return [order.first_name, order.last_name].filter(Boolean).join(' ');
}

export default function WorkOrderDetail({ order, vendors, onClose }) {
  const { run, pending } = useAdminAction();
  const { data: events } = useWorkOrderEvents(order.id);
  const [status, setStatus] = useState(order.status);
  const [priority, setPriority] = useState(order.priority);
  const [vendorId, setVendorId] = useState(order.vendor_id ?? '');
  const [scheduledFor, setScheduledFor] = useState(order.scheduled_for ?? '');
  const [cost, setCost] = useState(order.cost_cents === null ? '' : (order.cost_cents / 100).toFixed(2));

  const tenant = tenantLabel(order);
  const dirty =
    status !== order.status ||
    priority !== order.priority ||
    String(vendorId) !== String(order.vendor_id ?? '') ||
    scheduledFor !== (order.scheduled_for ?? '') ||
    cost !== (order.cost_cents === null ? '' : (order.cost_cents / 100).toFixed(2));

  function changeVendor(value) {
    setVendorId(value);
    if (value && status === 'open') setStatus('assigned');
    if (!value && status === 'assigned') setStatus('open');
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle className='text-balance'>{order.title}</DialogTitle>
          <DialogDescription>
            Ticket #{order.id} · opened {shortDate(order.created_at)}
            {order.unit_name ? ` · ${order.unit_name}${order.property_name ? `, ${order.property_name}` : ''}` : ''}
          </DialogDescription>
        </DialogHeader>

        <TicketProgress status={status} />

        {order.description && (
          <p className='text-pretty rounded-lg border border-border/70 bg-card/40 p-3 text-sm leading-relaxed'>
            {order.description}
          </p>
        )}

        {tenant ? (
          <div className='flex flex-wrap items-center gap-x-5 gap-y-1 text-sm'>
            <span className='font-medium'>{tenant}</span>
            {order.tenant_email && (
              <a className='flex items-center gap-1.5 text-muted-foreground hover:text-foreground' href={`mailto:${order.tenant_email}`}>
                <Mail className='size-3.5' aria-hidden='true' /> {order.tenant_email}
              </a>
            )}
            {order.tenant_phone && (
              <a className='flex items-center gap-1.5 text-muted-foreground hover:text-foreground' href={`tel:${order.tenant_phone}`}>
                <Phone className='size-3.5' aria-hidden='true' /> {order.tenant_phone}
              </a>
            )}
          </div>
        ) : (
          <p className='text-sm text-muted-foreground'>Created by management — no tenant is attached to this ticket.</p>
        )}

        <form
          id='ticket-manage'
          className='grid gap-4 sm:grid-cols-2'
          onSubmit={async (event) => {
            event.preventDefault();
            await run(() => admin.updateWorkOrder(order.id, { status, priority, vendorId, scheduledFor, cost }));
          }}
        >
          <Field label='Status' htmlFor='ticket-status'>
            <Select id='ticket-status' value={status} onChange={(e) => setStatus(e.target.value)}>
              {admin.WORK_ORDER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label='Priority' htmlFor='ticket-priority'>
            <Select id='ticket-priority' value={priority} onChange={(e) => setPriority(e.target.value)}>
              {admin.WORK_ORDER_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label='Vendor'
            htmlFor='ticket-vendor'
            hint={order.vendor_phone ? `Dispatch line: ${order.vendor_phone}` : undefined}
          >
            <Select id='ticket-vendor' value={vendorId} onChange={(e) => changeVendor(e.target.value)}>
              <option value=''>Unassigned</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name} · {humanize(vendor.category)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label='Visit date' htmlFor='ticket-visit' hint='The tenant sees this date on their ticket.'>
            <Input id='ticket-visit' type='date' value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </Field>
          <Field label='Cost (USD)' htmlFor='ticket-cost' hint='Private to management.' className='sm:col-span-2'>
            <Input
              id='ticket-cost'
              inputMode='decimal'
              placeholder='0.00'
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className='sm:max-w-48'
            />
          </Field>
        </form>

        <section aria-labelledby='manage-activity' className='flex flex-col gap-3'>
          <h3 id='manage-activity' className='flex items-center justify-between text-sm font-semibold'>
            Activity
            <StatusBadge status={order.priority} />
          </h3>
          <TicketTimeline events={events ?? []} viewerRole='landlord' />
          <TicketComposer
            allowInternal
            pending={pending}
            placeholder='Reply to the tenant…'
            onSend={(body, internal) => run(() => admin.addWorkOrderComment(order.id, { body, internal }))}
          />
        </section>

        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Close
          </Button>
          <Button type='submit' form='ticket-manage' disabled={pending || !dirty}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
