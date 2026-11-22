'use client';

import { Loader2, X } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';

import AgentPicker from '@/components/agent-chat/AgentPicker';
import ApiKeyForm from '@/components/agent-chat/ApiKeyForm';
import ChatSession from '@/components/agent-chat/ChatSession';
import { Button } from '@/components/ui/button';
import { clearStoredKey, listAgents, readStoredKey, storeKey } from '@/lib/elevenlabs';

export default function AgentChatPanel({ onClose }) {
  const [apiKey, setApiKey] = useState(() => readStoredKey());
  const [agent, setAgent] = useState(null);

  const {
    data: agents,
    error,
    isLoading,
    mutate,
  } = useSWR(apiKey ? ['elevenlabs-agents', apiKey] : null, ([, key]) => listAgents(key), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    onSuccess: () => storeKey(apiKey),
  });

  const forgetKey = () => {
    clearStoredKey();
    setApiKey('');
    setAgent(null);
  };

  const handleKey = (key) => setApiKey(key);

  const handleCreated = async (created) => {
    await mutate();
    setAgent(created);
  };

  let body;
  if (!apiKey || error) {
    body = <ApiKeyForm onSubmit={handleKey} loading={false} error={error?.message} />;
  } else if (isLoading || !agents) {
    body = (
      <div className='flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />
        Checking your key
      </div>
    );
  } else if (!agent) {
    body = (
      <AgentPicker
        apiKey={apiKey}
        agents={agents}
        onSelect={setAgent}
        onCreated={handleCreated}
        onForgetKey={forgetKey}
      />
    );
  } else {
    body = <ChatSession apiKey={apiKey} agent={agent} onChangeAgent={() => setAgent(null)} />;
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between border-b border-border px-4 py-2.5'>
        <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Agent test</p>
        <Button type='button' variant='ghost' size='icon' className='h-8 w-8' onClick={onClose}>
          <X aria-hidden='true' />
          <span className='sr-only'>Close agent chat</span>
        </Button>
      </div>
      <div className='flex min-h-0 flex-1 flex-col'>{body}</div>
    </div>
  );
}
