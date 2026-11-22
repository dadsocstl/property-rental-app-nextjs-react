'use client';

import { refreshDb } from '@/hooks/use-data';
import * as admin from '@/lib/admin';
import * as crm from '@/lib/crm';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import useSWR from 'swr';

const options = { revalidateOnFocus: false };

// Keys start with 'db' so refreshDb() revalidates admin views alongside the public pages.
function useAdminQuery(key, fetcher) {
  return useSWR(['db', 'admin', ...key], () => fetcher(), options);
}

export const useOverview = () => useAdminQuery(['overview'], admin.getOverview);
export const useLandlords = () => useAdminQuery(['landlords'], admin.getLandlords);
export const useUnits = () => useAdminQuery(['units'], admin.getUnits);
export const usePortfolio = () => useAdminQuery(['portfolio'], admin.getPortfolio);
export const usePropertyDetail = (propertyId) => useAdminQuery(['property', propertyId], () => admin.getPropertyDetail(propertyId));
export const useVacancies = () => useAdminQuery(['vacancies'], admin.getVacancies);
export const useListingsForUnits = () => useAdminQuery(['listings'], admin.getListingsForUnits);
export const useTenants = () => useAdminQuery(['tenants'], admin.getTenants);
export const useLeases = () => useAdminQuery(['leases'], admin.getLeases);
export const useCharges = (period) => useAdminQuery(['charges', period], () => admin.getCharges(period));
export const useChargePayments = (chargeId) =>
  useSWR(chargeId ? ['db', 'admin', 'payments', chargeId] : null, () => admin.getChargePayments(chargeId), options);
export const useVendors = () => useAdminQuery(['vendors'], admin.getVendors);
export const useWorkOrders = () => useAdminQuery(['work-orders'], admin.getWorkOrders);
export const useWorkOrderEvents = (workOrderId) =>
  useSWR(workOrderId ? ['db', 'admin', 'work-order-events', workOrderId] : null, () => admin.getWorkOrderEvents(workOrderId), options);
export const useApplications = () => useAdminQuery(['applications'], admin.getApplications);
export const useLeads = () => useAdminQuery(['crm-leads'], crm.getLeads);
export const useLeadActivities = (leadId) =>
  useSWR(leadId ? ['db', 'admin', 'crm-activities', leadId] : null, () => crm.getLeadActivities(leadId), options);

/** Wraps a mutation: tracks pending state, toasts the outcome, and refreshes every query. */
export function useAdminAction() {
  const [pending, setPending] = useState(false);
  const run = useCallback(async (action) => {
    setPending(true);
    try {
      const result = await action();
      await refreshDb();
      if (result?.message) toast.success(result.message);
      return result ?? true;
    } catch (error) {
      toast.error(error.message);
      return null;
    } finally {
      setPending(false);
    }
  }, []);
  return { run, pending };
}
