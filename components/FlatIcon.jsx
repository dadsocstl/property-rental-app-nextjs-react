import { cn } from '@/lib/utils';

/** Renders a Flaticon UIcons glyph (regular, rounded set). `name` is the icon slug, e.g. "home". */
export default function FlatIcon({ name, className, label }) {
  return (
    <i
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
      aria-label={label}
      className={cn(`fi-rr-${name}`, 'inline-flex shrink-0 items-center justify-center text-base leading-none', className)}
    />
  );
}
