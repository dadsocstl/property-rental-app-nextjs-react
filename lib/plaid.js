import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid/legacy';

let client = null;

/** Server-only. Returns null until PLAID_CLIENT_ID and PLAID_SECRET are set. PLAID_ENV defaults to sandbox. */
export function getPlaid() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) return null;
  if (!client) {
    const env = process.env.PLAID_ENV in PlaidEnvironments ? process.env.PLAID_ENV : 'sandbox';
    client = new PlaidApi(
      new Configuration({
        basePath: PlaidEnvironments[env],
        baseOptions: { headers: { 'PLAID-CLIENT-ID': clientId, 'PLAID-SECRET': secret } },
      })
    );
  }
  return client;
}

export function plaidErrorMessage(error) {
  return error?.response?.data?.error_message ?? error?.message ?? 'Plaid request failed';
}

export const plaidErrorCode = (error) => error?.response?.data?.error_code ?? null;

/** True when the Plaid account has not been granted the requested product (e.g. Identity Verification). */
export const isProductNotEnabled = (error) => ['INVALID_PRODUCT', 'PRODUCT_NOT_ENABLED'].includes(plaidErrorCode(error));

/**
 * Optional Link customization created in the Plaid Dashboard (Customize > Link). Plaid only applies it when the
 * language and country passed to /link/token/create match the customization, so those stay fixed to en / US here.
 */
export const linkCustomization = () =>
  process.env.PLAID_LINK_CUSTOMIZATION ? { link_customization_name: process.env.PLAID_LINK_CUSTOMIZATION } : {};

export const LINK_LOCALE = { country_codes: ['US'], language: 'en' };
