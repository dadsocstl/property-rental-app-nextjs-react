'use client';

import { EmptyRow, StatusBadge, TableShell, Td, Th, shortDate } from '@/components/admin/primitives';
import WorkTicketDialog from '@/components/renter/WorkTicketDialog';
import { Button } from '@/components/ui/button';
import { useAdminAction } from '@/hooks/use-admin';
import { cancelRenterWorkOrder } from '@/lib/renter';

const PROGRESS = {
  open: 'Received — waiting for management to assign someone',
  assigned: 'A vendor has been assigned',
  in_progress: 'Work is under way',
  completed: 'Finished',
  cancelled: 'Withdrawn',
};

export default function WorkTickets({ tickets, unitLabel }) {
  const { run, pending } = useAdminAction();

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='font-display text-xl font-bold'>Work tickets</h2>
        <WorkTicketDialog unitLabel={unitLabel} size='sm' />
      </div>
      <TableShell label='Work tickets'>
        <thead>
          <tr>
            <Th>Submitted</Th>
            <Th>Issue</Th>
            <Th>Priority</Th>
            <Th>Status</Th>
            <Th>
              <span className='sr-only'>Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {tickets.length === 0 && (
            <EmptyRow colSpan={5}>No tickets yet. Submit one if something in your home needs attention.</EmptyRow>
          )}
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <Td className='whitespace-nowrap align-top'>{shortDate(ticket.created_at)}</Td>
              <Td className='align-top'>
                <p className='font-medium'>{ticket.title}</p>
                {ticket.description && (
                  <p className='mt-0.5 max-w-md text-pretty text-sm text-muted-foreground'>{ticket.description}</p>
                )}
              </Td>
              <Td className='align-top'>
                <StatusBadge status={ticket.priority} />
              </Td>
              <Td className='align-top'>
                <div className='flex flex-col items-start gap-1'>
                  <StatusBadge status={ticket.status} />
                  <p className='max-w-56 text-xs text-muted-foreground'>
                    {ticket.status === 'completed' && ticket.completed_at
                      ? `Completed ${shortDate(ticket.completed_at)}`
                      : PROGRESS[ticket.status]}
                    {ticket.vendor_name && ticket.status !== 'cancelled' ? ` · ${ticket.vendor_name}` : ''}
                  </p>
                </div>
              </Td>
              <Td className='text-right align-top'>
                {ticket.status === 'open' && (
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={pending}
                    onClick={() => run(() => cancelRenterWorkOrder(ticket.id))}
                  >
                    Withdraw
                    <span className='sr-only'> {ticket.title}</span>
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
