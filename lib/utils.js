import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatRate(rates = {}) {
  if (rates.monthly) return { amount: `$${rates.monthly.toLocaleString()}`, unit: '/mo' };
  if (rates.weekly) return { amount: `$${rates.weekly.toLocaleString()}`, unit: '/wk' };
  if (rates.nightly) return { amount: `$${rates.nightly.toLocaleString()}`, unit: '/night' };
  return { amount: 'Ask', unit: '' };
}
