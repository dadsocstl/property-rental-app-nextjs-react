'use client';

import { getRenterAccount } from '@/lib/renter';
import useSWR from 'swr';

// Key starts with 'db' so refreshDb() revalidates the dashboard after a payment is recorded.
export const useRenterAccount = (userId) =>
  useSWR(userId ? ['db', 'renter', userId] : null, () => getRenterAccount(), { revalidateOnFocus: false });

export const usePaymentConfig = () =>
  useSWR('/api/payments/config', (url) => fetch(url).then((res) => res.json()), { revalidateOnFocus: false });
