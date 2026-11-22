'use client';

import FormDialog from '@/components/admin/FormDialog';
import { Field, Select } from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { submitRenterWorkOrder } from '@/lib/renter';
import { Wrench } from 'lucide-react';

const PRIORITIES = [
  { value: 'low', label: 'Low — cosmetic, whenever convenient' },
  { value: 'normal', label: 'Normal — needs fixing soon' },
  { value: 'high', label: 'High — affecting daily living' },
  { value: 'urgent', label: 'Urgent — safety risk, leak, no heat or power' },
];

export default function WorkTicketDialog({ unitLabel, variant = 'outline', size = 'lg' }) {
  return (
    <FormDialog
      title='Submit a work ticket'
      description={`Tell management what needs attention${unitLabel ? ` at ${unitLabel}` : ''}. You can follow its progress on this page.`}
      submitLabel='Submit ticket'
      action={submitRenterWorkOrder}
      trigger={
        <Button variant={variant} size={size}>
          <Wrench /> New work ticket
        </Button>
      }
    >
      <Field label='What needs fixing?' htmlFor='ticket-title' className='sm:col-span-2'>
        <Input id='ticket-title' name='title' required maxLength={120} placeholder='Kitchen faucet is leaking' />
      </Field>
      <Field label='How urgent is it?' htmlFor='ticket-priority' className='sm:col-span-2'>
        <Select id='ticket-priority' name='priority' defaultValue='normal'>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label='Details'
        htmlFor='ticket-description'
        hint='Where it is, when it started, and anything we should know before visiting.'
        className='sm:col-span-2'
      >
        <Textarea id='ticket-description' name='description' rows={4} maxLength={2000} />
      </Field>
    </FormDialog>
  );
}
