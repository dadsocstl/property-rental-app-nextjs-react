'use client';

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
import { Label } from '@/components/ui/label';
import { DEV_ACCOUNTS, DEV_BYPASS } from '@/lib/dev';
import { useState } from 'react';

const SignInDialog = ({ open, onOpenChange, onSubmit }) => {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (credentials) => {
    setPending(true);
    setError('');
    try {
      await onSubmit(credentials);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const ok = await submit({ username: formData.get('username'), email: formData.get('email') });
    if (ok) form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Login or Register</DialogTitle>
          <DialogDescription>
            Your profile, listings, bookmarks and messages are stored in a SQL database in this browser.
          </DialogDescription>
        </DialogHeader>

        {DEV_BYPASS && (
          <div className='flex flex-col gap-2 rounded-lg border border-dashed border-primary/60 p-3'>
            <p className='text-xs font-semibold uppercase tracking-wider text-primary'>Dev quick sign-in</p>
            <div className='flex flex-wrap gap-2'>
              {DEV_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  type='button'
                  size='sm'
                  variant='secondary'
                  disabled={pending}
                  onClick={() => submit(account)}
                >
                  {account.username}
                </Button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='sign-in-name'>Name</Label>
            <Input id='sign-in-name' name='username' required maxLength={20} autoComplete='name' />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='sign-in-email'>Email</Label>
            <Input id='sign-in-email' name='email' type='email' required autoComplete='email' />
          </div>
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type='button' variant='ghost' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={pending}>
              {pending ? 'Signing in...' : 'Continue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SignInDialog;
