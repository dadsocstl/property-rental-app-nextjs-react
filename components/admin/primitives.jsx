'use client';

import { DatabaseError } from '@/components/RequireSession';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const moneyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const preciseMoneyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function money(cents, { precise = false } = {}) {
  const value = (cents ?? 0) / 100;
  return (precise || value % 1 !== 0 ? preciseMoneyFormat : moneyFormat).format(value);
}

export function shortDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function monthLabel(period) {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export const humanize = (value) => (value ?? '').replace(/_/g, ' ');
export const titleCase = (value) => humanize(value).replace(/^./, (c) => c.toUpperCase());

export function PageHeader({ title, description, children }) {
  return (
    <header className='flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between'>
      <div className='flex flex-col gap-1'>
        <h1 className='text-balance font-display text-3xl font-bold'>{title}</h1>
        {description && <p className='text-pretty leading-relaxed text-muted-foreground'>{description}</p>}
      </div>
      {children && <div className='flex flex-wrap items-center gap-2'>{children}</div>}
    </header>
  );
}

const TONES = {
  danger: 'bg-destructive/15 text-destructive ring-destructive/40',
  warn: 'bg-primary/15 text-primary ring-primary/40',
  info: 'bg-secondary text-secondary-foreground ring-secondary',
  ok: 'bg-muted text-muted-foreground ring-border',
  quiet: 'bg-transparent text-muted-foreground ring-border',
};

const STATUS_TONES = {
  overdue: 'danger',
  urgent: 'danger',
  declined: 'quiet',
  partial: 'warn',
  high: 'warn',
  turnover: 'warn',
  new: 'warn',
  open: 'info',
  assigned: 'info',
  in_progress: 'info',
  screening: 'info',
  upcoming: 'info',
  vacant: 'info',
  paid: 'ok',
  occupied: 'ok',
  active: 'ok',
  completed: 'ok',
  approved: 'ok',
  normal: 'quiet',
  low: 'quiet',
  waived: 'quiet',
  ended: 'quiet',
  cancelled: 'quiet',
  withdrawn: 'quiet',
  unavailable: 'quiet',
  contacted: 'info',
  tour: 'info',
  applied: 'warn',
  won: 'ok',
  lost: 'quiet',
  verified: 'ok',
  partial: 'warn',
  mismatch: 'danger',
  unverified: 'quiet',
};

export function StatusBadge({ status, className }) {
  const tone = TONES[STATUS_TONES[status] ?? 'quiet'];
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset',
        tone,
        className
      )}
    >
      {humanize(status)}
    </span>
  );
}

export function Field({ label, htmlFor, hint, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className='text-xs text-muted-foreground'>{hint}</p>}
    </div>
  );
}

export function Select({ className, children, ...props }) {
  return (
    <div className={cn('relative', className)}>
      <select
        className='h-10 w-full appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-9 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden='true'
        className='pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
      />
    </div>
  );
}

export function FilterTabs({ value, onChange, options, label }) {
  return (
    <div role='radiogroup' aria-label={label} className='flex flex-wrap gap-1 rounded-full bg-muted p-1'>
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          role='radio'
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === option.value && 'bg-background text-foreground shadow-sm'
          )}
        >
          {option.label}
          {option.count !== undefined && <span className='ml-1.5 tabular-nums opacity-70'>{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function TableShell({ children, label }) {
  return (
    <div className='overflow-x-auto rounded-xl border border-border/70 bg-card/40'>
      <table className='w-full min-w-[720px] text-left text-sm' aria-label={label}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }) {
  return (
    <th
      scope='col'
      className={cn(
        'border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground',
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }) {
  return <td className={cn('border-b border-border/40 px-4 py-3 align-middle', className)}>{children}</td>;
}

export function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className='px-4 py-12 text-center text-muted-foreground'>
        {children}
      </td>
    </tr>
  );
}

export function QueryState({ error, isLoading, children }) {
  if (error) return <DatabaseError error={error} />;
  if (isLoading) {
    return (
      <div className='flex flex-col gap-3' aria-busy='true' aria-label='Loading'>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className='h-12 animate-pulse rounded-lg bg-muted' />
        ))}
      </div>
    );
  }
  return children;
}
