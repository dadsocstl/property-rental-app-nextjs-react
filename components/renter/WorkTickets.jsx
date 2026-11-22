'use client';

import { EmptyRow, StatusBadge, TableShell, Td, Th, shortDate } from '@/components/admin/primitives';
import WorkTicketDialog from '@/components/renter/WorkTicketDialog';
import WorkTicketDetail from '@/components/renter/WorkTicketDetail';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';

const PROGRESS = {
  open: 'Received — waiting for management to assign someone',
  assigned: 'A vendor has been assigned',
  in_progress: 'Work is under way',
  completed: 'Finished',
  cancelled: 'Withdrawn',
};

export default function WorkTickets({ tickets, unitLabel }) {
  const [selectedId, setSelectedId] = useState(null);
  // Looked up by id so the open dialog follows the live data after a reply or status change.
  const selected = tickets.find((ticket) => ticket.id === selectedId);

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
              <span className='sr-only'>Details</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {tickets.length === 0 && (
            <EmptyRow colSpan={5}>No tickets yet. Submit one if something in your home needs attention.</EmptyRow>
          )}
          {tickets.map((ticket) => {
            const replies = ticket.events.filter((event) => event.kind === 'comment').length;
            return (
              <tr key={ticket.id} className='hover:bg-secondary/20'>
                <Td className='whitespace-nowrap align-top'>{shortDate(ticket.created_at)}</Td>
                <Td className='align-top'>
                  <button
                    type='button'
                    onClick={() => setSelectedId(ticket.id)}
                    className='rounded-sm text-left font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  >
                    {ticket.title}
                  </button>
                  {ticket.description && (
                    <p className='mt-0.5 line-clamp-2 max-w-md text-pretty text-sm text-muted-foreground'>
                      {ticket.description}
                    </p>
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
                  <Button size='sm' variant='outline' onClick={() => setSelectedId(ticket.id)}>
                    <MessageSquare /> View
                    {replies > 0 && <span className='tabular-nums'>({replies})</span>}
                    <span className='sr-only'> ticket: {ticket.title}</span>
                  </Button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>

      {selected && <WorkTicketDetail ticket={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
