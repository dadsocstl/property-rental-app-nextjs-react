'use client';

import { ArrowDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ConversationContext = React.createContext(null);

const Conversation = React.forwardRef(({ className, children, ...props }, ref) => {
  const scrollerRef = React.useRef(null);
  const stickRef = React.useRef(true);
  const [atBottom, setAtBottom] = React.useState(true);

  const scrollToBottom = React.useCallback((behavior = 'smooth') => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    stickRef.current = nearBottom;
    setAtBottom(nearBottom);
  }, []);

  const value = React.useMemo(
    () => ({ scrollerRef, stickRef, atBottom, scrollToBottom, handleScroll }),
    [atBottom, scrollToBottom, handleScroll]
  );

  return (
    <ConversationContext.Provider value={value}>
      <div ref={ref} className={cn('relative flex-1 overflow-hidden', className)} role='log' {...props}>
        {children}
      </div>
    </ConversationContext.Provider>
  );
});
Conversation.displayName = 'Conversation';

const ConversationContent = ({ className, children, ...props }) => {
  const { scrollerRef, stickRef, scrollToBottom, handleScroll } = React.useContext(ConversationContext);
  const contentRef = React.useRef(null);

  React.useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      if (stickRef.current) scrollToBottom('auto');
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [scrollToBottom, stickRef]);

  return (
    <div ref={scrollerRef} onScroll={handleScroll} className='h-full overflow-y-auto'>
      <div ref={contentRef} className={cn('flex flex-col gap-3 p-4', className)} {...props}>
        {children}
      </div>
    </div>
  );
};

const ConversationEmptyState = ({ className, icon, title, description, children, ...props }) => (
  <div
    className={cn('flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3 px-6 text-center', className)}
    {...props}
  >
    {icon ? <div className='text-primary'>{icon}</div> : null}
    <div className='space-y-1'>
      <h3 className='text-sm font-semibold text-foreground'>{title}</h3>
      {description ? <p className='text-pretty text-sm text-muted-foreground'>{description}</p> : null}
    </div>
    {children}
  </div>
);

const ConversationScrollButton = ({ className, ...props }) => {
  const { atBottom, scrollToBottom } = React.useContext(ConversationContext);
  if (atBottom) return null;
  return (
    <Button
      type='button'
      variant='secondary'
      size='icon'
      className={cn('absolute bottom-3 left-1/2 h-8 w-8 -translate-x-1/2 shadow-lg', className)}
      onClick={() => scrollToBottom('smooth')}
      {...props}
    >
      <ArrowDown />
      <span className='sr-only'>Scroll to latest message</span>
    </Button>
  );
};

export { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton };
