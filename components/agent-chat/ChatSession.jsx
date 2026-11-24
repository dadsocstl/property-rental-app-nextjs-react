'use client';

import {
  ConversationProvider,
  useConversation,
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
} from '@elevenlabs/react';
import { ArrowLeft, Bot, Mic, MicOff, PhoneOff, SendHorizontal, AudioLines } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import LevelMeter from '@/components/agent-chat/LevelMeter';
import { Button } from '@/components/ui/button';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ui/conversation';
import { Input } from '@/components/ui/input';
import { Message, MessageContent } from '@/components/ui/message';
import { getConversationToken, getSignedUrl } from '@/lib/elevenlabs';
import { cn } from '@/lib/utils';

function statusLabel(status, mode, isSpeaking) {
  if (status === 'connecting') return 'Connecting';
  if (status === 'connected') {
    if (mode === 'voice') return isSpeaking ? 'Agent speaking' : 'Listening';
    return 'Connected, text';
  }
  if (status === 'error') return 'Connection error';
  return 'Not connected';
}

function Session({ apiKey, agent, onChangeAgent }) {
  const { status, message: statusMessage } = useConversationStatus();
  const { isSpeaking } = useConversationMode();
  const { isMuted, setMuted } = useConversationInput();
  const { startSession, endSession, sendUserMessage, getInputVolume, getOutputVolume } = useConversationControls();

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState('text');
  const [error, setError] = useState('');
  const pendingRef = useRef(null);

  useConversation({
    onMessage: (event) => {
      if (!event.message) return;
      setMessages((prev) => [...prev, { role: event.source === 'user' ? 'user' : 'assistant', content: event.message }]);
    },
    onDisconnect: (details) => {
      if (details?.reason === 'error') {
        setError(details.message || 'The agent closed the connection.');
      }
    },
    onError: (err) => setError(typeof err === 'string' ? err : err?.message || 'The conversation hit an error.'),
  });

  useEffect(() => {
    if (status === 'connected' && pendingRef.current) {
      const text = pendingRef.current;
      pendingRef.current = null;
      sendUserMessage(text);
    }
  }, [status, sendUserMessage]);

  const isConnecting = status === 'connecting';
  const isConnected = status === 'connected';
  const isVoice = isConnected && mode === 'voice';

  const startText = useCallback(
    async (text) => {
      setError('');
      setMode('text');
      try {
        const signedUrl = await getSignedUrl(apiKey, agent.id);
        pendingRef.current = text;
        startSession({
          signedUrl,
          connectionType: 'websocket',
          overrides: { conversation: { textOnly: true } },
        });
      } catch (err) {
        setError(err.message);
      }
    },
    [apiKey, agent.id, startSession]
  );

  const startVoice = useCallback(async () => {
    setError('');
    setMode('voice');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setError('Microphone access was blocked. Allow it in your browser to use voice.');
      return;
    }
    try {
      const conversationToken = await getConversationToken(apiKey, agent.id);
      startSession({ conversationToken, connectionType: 'webrtc' });
    } catch (err) {
      setError(err.message);
    }
  }, [apiKey, agent.id, startSession]);

  const handleSend = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isConnecting) return;
    setDraft('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    if (isConnected) sendUserMessage(text);
    else startText(text);
  };

  const handleEnd = () => {
    endSession();
    pendingRef.current = null;
  };

  const handleBack = () => {
    endSession();
    onChangeAgent();
  };

  const displayError = error || (status === 'error' ? statusMessage : '');

  return (
    <>
      <div className='flex items-center gap-2 border-b border-border px-3 py-2.5'>
        <Button type='button' variant='ghost' size='icon' className='h-8 w-8' onClick={handleBack}>
          <ArrowLeft aria-hidden='true' />
          <span className='sr-only'>Choose a different agent</span>
        </Button>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-semibold text-foreground'>{agent.name}</p>
          <p className='flex items-center gap-1.5 text-xs text-muted-foreground' aria-live='polite'>
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full bg-muted-foreground',
                isConnected && 'bg-emerald-400',
                isConnecting && 'animate-pulse bg-primary'
              )}
              aria-hidden='true'
            />
            {statusLabel(status, mode, isSpeaking)}
          </p>
        </div>
        {isVoice ? <LevelMeter active getLevel={isSpeaking ? getOutputVolume : getInputVolume} /> : null}
        {isConnected ? (
          <Button type='button' variant='outline' size='sm' className='h-8 px-3' onClick={handleEnd}>
            <PhoneOff aria-hidden='true' />
            End
          </Button>
        ) : null}
      </div>

      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<Bot className='h-8 w-8' aria-hidden='true' />}
              title='Start a conversation'
              description='Type a message, or tap the microphone to talk with the agent.'
            />
          ) : (
            messages.map((message, index) => (
              <Message key={index} from={message.role}>
                <MessageContent from={message.role}>{message.content}</MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {displayError ? (
        <p role='alert' className='border-t border-border bg-destructive/10 px-4 py-2 text-xs text-destructive'>
          {displayError}
        </p>
      ) : null}

      <form onSubmit={handleSend} className='flex items-center gap-2 border-t border-border p-3'>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={isVoice ? 'Type to add context' : 'Type a message'}
          aria-label='Message to the agent'
          disabled={isConnecting}
          className='h-10'
        />
        <Button type='submit' size='icon' disabled={!draft.trim() || isConnecting} className='shrink-0'>
          <SendHorizontal aria-hidden='true' />
          <span className='sr-only'>Send message</span>
        </Button>
        {isVoice ? (
          <Button
            type='button'
            variant={isMuted ? 'destructive' : 'secondary'}
            size='icon'
            className='shrink-0'
            onClick={() => setMuted(!isMuted)}
            aria-pressed={isMuted}
          >
            {isMuted ? <MicOff aria-hidden='true' /> : <Mic aria-hidden='true' />}
            <span className='sr-only'>{isMuted ? 'Unmute microphone' : 'Mute microphone'}</span>
          </Button>
        ) : (
          <Button
            type='button'
            variant='secondary'
            size='icon'
            className='shrink-0'
            onClick={startVoice}
            disabled={isConnecting || isConnected}
          >
            <AudioLines aria-hidden='true' />
            <span className='sr-only'>Start voice conversation</span>
          </Button>
        )}
      </form>
    </>
  );
}

export default function ChatSession(props) {
  return (
    <ConversationProvider>
      <Session {...props} />
    </ConversationProvider>
  );
}
