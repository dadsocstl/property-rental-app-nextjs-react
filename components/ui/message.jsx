import { cn } from '@/lib/utils';

const Message = ({ className, from, ...props }) => (
  <div
    className={cn('flex w-full items-end gap-2', from === 'user' ? 'justify-end' : 'justify-start', className)}
    {...props}
  />
);

const MessageContent = ({ className, from, ...props }) => (
  <div
    className={cn(
      'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere]',
      from === 'user'
        ? 'rounded-br-md bg-primary text-primary-foreground'
        : 'rounded-bl-md border border-border bg-muted text-foreground',
      className
    )}
    {...props}
  />
);

export { Message, MessageContent };
