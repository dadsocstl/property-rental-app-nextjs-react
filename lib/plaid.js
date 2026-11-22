import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

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
