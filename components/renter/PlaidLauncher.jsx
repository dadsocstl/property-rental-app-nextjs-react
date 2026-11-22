'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { usePlaidLink } from 'react-plaid-link';

export default function PlaidLauncher({ token, onSuccess, onExit }) {
  const { open, ready } = usePlaidLink({ token, onSuccess, onExit });
  const opened = useRef(false);

  useEffect(() => {
    if (!ready || opened.current) return;
    opened.current = true;
    open();
  }, [ready, open]);

  return (
    <p role='status' className='flex items-center justify-center gap-2 py-10 text-muted-foreground'>
      <Loader2 className='size-4 animate-spin' aria-hidden='true' />
      Opening secure bank connection…
    </p>
  );
}
