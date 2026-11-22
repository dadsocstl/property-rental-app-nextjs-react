'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAdminAction } from '@/hooks/use-admin';
import { useId, useState } from 'react';

/** A dialog whose form values are passed to `action(values)`; closes when the action succeeds. */
export default function FormDialog({ trigger, title, description, submitLabel, action, children }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useAdminAction();
  const formId = useId();

  async function onSubmit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (await run(() => action(values))) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form id={formId} onSubmit={onSubmit} className='grid gap-4 sm:grid-cols-2'>
          {children}
        </form>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type='submit' form={formId} disabled={pending}>
            {pending ? 'Saving…' : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
