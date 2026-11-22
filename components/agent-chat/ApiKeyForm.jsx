'use client';

import { KeyRound, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ApiKeyForm({ onSubmit, loading, error }) {
  const [value, setValue] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const key = value.trim();
    if (key) onSubmit(key);
  };

  return (
    <form onSubmit={handleSubmit} className='flex flex-1 flex-col justify-center gap-5 p-6'>
      <div className='flex flex-col items-center gap-3 text-center'>
        <span className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary'>
          <KeyRound className='h-6 w-6' aria-hidden='true' />
        </span>
        <div className='space-y-1'>
          <h2 className='text-base font-semibold text-foreground'>Test the voice agent</h2>
          <p className='text-pretty text-sm text-muted-foreground'>
            Enter your ElevenLabs API key to chat with an agent by text or voice.
          </p>
        </div>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='elevenlabs-api-key'>ElevenLabs API key</Label>
        <Input
          id='elevenlabs-api-key'
          type='password'
          autoComplete='off'
          spellCheck={false}
          placeholder='sk_...'
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'elevenlabs-key-error' : 'elevenlabs-key-help'}
        />
        {error ? (
          <p id='elevenlabs-key-error' role='alert' className='text-sm text-destructive'>
            {error}
          </p>
        ) : (
          <p id='elevenlabs-key-help' className='text-pretty text-xs text-muted-foreground'>
            Needs the ElevenLabs Agents permission. Stored only in this tab&apos;s session storage and sent only to
            api.elevenlabs.io.
          </p>
        )}
      </div>

      <Button type='submit' disabled={loading || !value.trim()}>
        {loading ? <Loader2 className='animate-spin' aria-hidden='true' /> : null}
        {loading ? 'Checking key' : 'Connect'}
      </Button>

      <a
        href='https://elevenlabs.io/app/settings/api-keys'
        target='_blank'
        rel='noreferrer'
        className='text-center text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline'
      >
        Get an API key from ElevenLabs
      </a>
    </form>
  );
}
