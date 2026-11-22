import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const InfoBox = ({ heading, eyebrow, highlight = false, buttonInfo, children }) => {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-4 rounded-2xl border p-8 md:p-10',
        highlight ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-card-foreground'
      )}
    >
      <p
        className={cn(
          'text-xs font-semibold uppercase tracking-[0.25em]',
          highlight ? 'text-primary-foreground/70' : 'text-primary'
        )}
      >
        {eyebrow}
      </p>
      <h2 className='font-display text-3xl font-bold md:text-4xl'>{heading}</h2>
      <p className={cn('max-w-md leading-relaxed', highlight ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
        {children}
      </p>
      <Button
        asChild
        variant={highlight ? 'secondary' : 'default'}
        className={cn('mt-2', highlight && 'bg-background text-foreground hover:bg-secondary')}
      >
        <Link href={buttonInfo.link}>
          {buttonInfo.text}
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
};

export default InfoBox;
