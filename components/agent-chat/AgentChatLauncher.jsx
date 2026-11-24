'use client';

import { MessageSquare, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AgentChatPanel = dynamic(() => import('@/components/agent-chat/AgentChatPanel'), { ssr: false });

export default function AgentChatLauncher() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggle = () => {
    setEverOpened(true);
    setOpen((value) => !value);
  };

  return (
    <>
      {everOpened ? (
        <section
          aria-label='ElevenLabs agent chat'
          className={cn(
            'fixed bottom-20 right-4 z-50 h-[min(36rem,calc(100dvh-6.5rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl',
            open ? 'flex' : 'hidden'
          )}
        >
          <AgentChatPanel onClose={() => setOpen(false)} />
        </section>
      ) : null}

      <Button
        type='button'
        size='lg'
        onClick={toggle}
        aria-expanded={open}
        className='fixed bottom-4 right-4 z-50 shadow-xl'
      >
        {open ? <X aria-hidden='true' /> : <MessageSquare aria-hidden='true' />}
        {open ? 'Close' : 'Talk to the agent'}
      </Button>
    </>
  );
}
