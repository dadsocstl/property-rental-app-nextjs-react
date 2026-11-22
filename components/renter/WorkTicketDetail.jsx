'use client';

import { StatusBadge, humanize, shortDate } from '@/components/admin/primitives';
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
import { useAdminAction } from '@/hooks/use-admin';
import { addRenterTicketComment, cancelRenterWorkOrder } from '@/lib/renter';

function Fact({ label, children }) {
  return (
    <div className='flex flex-col gap-0.5'>
      <dt className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>{label}</dt>
      <dd className='text-sm font-medium'>{children}</dd>
    </div>
  );
}

export default function WorkTicketDetail({ ticket, onClose }) {
  const { run, pending } = useAdminAction();
  const closed = ticket.status === 'completed' || ticket.status === 'cancelled';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='text-balance'>{ticket.title}</DialogTitle>
          <DialogDescription>
            Ticket #{ticket.id} · submitted {shortDate(ticket.created_at)}
            {ticket.unit_name ? ` · ${ticket.unit_name}${ticket.property_name ? `, ${ticket.property_name}` : ''}` : ''}
          </DialogDescription>
        </DialogHeader>

        <TicketProgress status={ticket.status} />

        <dl className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
          <Fact label='Status'>
            <StatusBadge status={ticket.status} />
          </Fact>
          <Fact label='Priority'>
            <StatusBadge status={ticket.priority} />
          </Fact>
          <Fact label='Assigned to'>
            {ticket.vendor_name ? (
              <>
                {ticket.vendor_name}
                {ticket.vendor_category && (
                  <span className='block text-xs font-normal capitalize text-muted-foreground'>
                    {humanize(ticket.vendor_category)}
                  </span>
                )}
              </>
            ) : (
              <span className='font-normal text-muted-foreground'>Not yet assigned</span>
            )}
          </Fact>
          <Fact label={ticket.status === 'completed' ? 'Completed' : 'Visit'}>
            {ticket.status === 'completed' && ticket.completed_at ? (
              shortDate(ticket.completed_at)
            ) : ticket.scheduled_for ? (
              shortDate(ticket.scheduled_for)
            ) : (
              <span className='font-normal text-muted-foreground'>Not scheduled</span>
            )}
          </Fact>
        </dl>

        {ticket.description && (
          <section aria-labelledby='ticket-details' className='flex flex-col gap-1.5'>
            <h3 id='ticket-details' className='text-sm font-semibold'>
              What you reported
            </h3>
            <p className='text-pretty text-sm leading-relaxed text-muted-foreground'>{ticket.description}</p>
          </section>
        )}

        <section aria-labelledby='ticket-activity' className='flex flex-col gap-3'>
          <h3 id='ticket-activity' className='text-sm font-semibold'>
            Activity
          </h3>
          <TicketTimeline events={ticket.events} viewerRole='renter' />
        </section>

        {closed ? (
          <p className='text-sm text-muted-foreground'>This ticket is closed. Submit a new one if the problem is back.</p>
        ) : (
          <TicketComposer
            pending={pending}
            placeholder='Add details, or tell management when you are home…'
            onSend={(body) => run(() => addRenterTicketComment(ticket.id, body))}
          />
        )}

        <DialogFooter>
          {ticket.status === 'open' && (
            <Button
              variant='outline'
              disabled={pending}
              onClick={async () => {
                if (await run(() => cancelRenterWorkOrder(ticket.id))) onClose();
              }}
            >
              Withdraw ticket
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
