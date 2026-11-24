'use client';

import { Bot, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { createTestAgent, TEST_AGENT_NAME } from '@/lib/elevenlabs';

export default function AgentPicker({ apiKey, agents, onSelect, onCreated, onForgetKey }) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const agent = await createTestAgent(apiKey);
      await onCreated(agent);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const hasTestAgent = agents.some((agent) => agent.name === TEST_AGENT_NAME);

  return (
    <div className='flex flex-1 flex-col gap-4 overflow-y-auto p-5'>
      <div className='space-y-1'>
        <h2 className='text-base font-semibold text-foreground'>Choose an agent</h2>
        <p className='text-pretty text-sm text-muted-foreground'>
          {agents.length
            ? 'Pick one of your ElevenLabs agents, or create a test concierge for this site.'
            : 'No agents on this account yet. Create a test concierge to try text and voice.'}
        </p>
      </div>

      {agents.length ? (
        <ul className='flex flex-col gap-2'>
          {agents.map((agent) => (
            <li key={agent.id}>
              <button
                type='button'
                onClick={() => onSelect(agent)}
                className='flex w-full items-center gap-3 rounded-lg border border-border bg-muted px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                <Bot className='h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
                <span className='min-w-0 flex-1 truncate'>{agent.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!hasTestAgent ? (
        <Button type='button' variant='outline' onClick={handleCreate} disabled={creating}>
          {creating ? <Loader2 className='animate-spin' aria-hidden='true' /> : <Plus aria-hidden='true' />}
          {creating ? 'Creating agent' : 'Create test concierge'}
        </Button>
      ) : null}

      {error ? (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      ) : null}

      <button
        type='button'
        onClick={onForgetKey}
        className='mt-auto self-center text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline'
      >
        Use a different API key
      </button>
    </div>
  );
}
