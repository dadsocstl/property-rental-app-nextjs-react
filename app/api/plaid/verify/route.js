import { NextResponse } from 'next/server';
import { handleRouteError, jsonError } from '@/lib/payment-input';
import { getPlaid, plaidErrorMessage } from '@/lib/plaid';
import { compareIdentity } from '@/lib/verification';

const text = (value, max = 200) => String(value ?? '').slice(0, max);

export async function POST(request) {
  const plaid = getPlaid();
  if (!plaid) return jsonError('Identity verification is not configured', 503);

  const body = await request.json().catch(() => null);
  const publicToken = text(body?.publicToken, 300);
  const lead = {
    firstName: text(body?.lead?.firstName, 100),
    lastName: text(body?.lead?.lastName, 100),
    email: text(body?.lead?.email),
    phone: text(body?.lead?.phone, 40),
  };
  if (!publicToken) return jsonError('Missing bank connection');
  if (!lead.firstName || !lead.lastName) return jsonError('The lead needs a first and last name to verify');

  let accessToken;
  try {
    const exchange = await plaid.itemPublicTokenExchange({ public_token: publicToken });
    accessToken = exchange.data.access_token;

    const { data } = await plaid.identityGet({ access_token: accessToken });
    const owners = data.accounts.flatMap((account) => account.owners ?? []);
    const result = compareIdentity(lead, owners);
    const account = data.accounts[0];

    return NextResponse.json({
      ...result,
      institution: text(body?.institution) || null,
      accountMask: account?.mask ?? null,
      accountName: account?.name ?? null,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleRouteError(new Error(plaidErrorMessage(error)));
  } finally {
    // The access token is never stored: verification is a one-time check, not an ongoing bank link.
    if (accessToken) await plaid.itemRemove({ access_token: accessToken }).catch(() => {});
  }
}
