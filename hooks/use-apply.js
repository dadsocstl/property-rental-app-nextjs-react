'use client';

import { getApplyableUnits, getMyApplications } from '@/lib/apply';
import useSWR from 'swr';

const options = { revalidateOnFocus: false };

export const useApplyableUnits = (propertyId) =>
  useSWR(propertyId ? ['db', 'apply', 'units', propertyId] : null, () => getApplyableUnits(propertyId), options);

export const useMyApplications = (userId) =>
  useSWR(userId ? ['db', 'apply', 'mine', userId] : null, () => getMyApplications(), options);

export const useVerificationConfig = () =>
  useSWR('/api/plaid/applicant/config', (url) => fetch(url).then((res) => res.json()), options);
