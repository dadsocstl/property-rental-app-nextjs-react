'use client';

import { Button } from '@/components/ui/button';
import { Building, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';

export default function PlaidLauncher({ token, onSuccess, onExit }) {
  const [launched, setLaunched] = useState(false);
  const { open, ready } = usePlaidLink({
    token,
    onSuccess,
    onExit: (error, metadata) => {
      setLaunched(false);
      onExit(error, metadata);
    },
  });
  const autoOpened = useRef(false);

  useEffect(() => {
    if (!ready || autoOpened.current) return;
    autoOpened.current = true;
    setLaunched(true);
    open();
  }, [ready, open]);

  return (
    <div className='flex flex-col items-center gap-4 py-6 text-center'>
      <span className='flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary'>
        <Building className='size-6' aria-hidden='true' />
      </span>
      <div className='flex flex-col gap-1'>
        <p className='font-display text-lg font-bold'>Connect your bank</p>
        <p className='max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground'>
          Plaid opens in a secure window. Your login is never shared with us.
        </p>
      </div>
      {!ready && (
        <p role='status' className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='size-4 animate-spin' aria-hidden='true' />
          Preparing secure connection…
        </p>
      )}
      {ready && (
        <Button
          onClick={() => {
            setLaunched(true);
            open();
          }}
          disabled={launched}
        >
          {launched ? 'Waiting for Plaid…' : 'Open bank connection'}
        </Button>
      )}
      <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
        <ShieldCheck className='size-3.5' aria-hidden='true' />
        Encrypted and read-only until you confirm the payment
      </p>
    </div>
  );
}
