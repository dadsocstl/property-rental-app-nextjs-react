import { CountryCode, Products } from 'plaid/legacy';
import { NextResponse } from 'next/server';
import { handleRouteError, jsonError } from '@/lib/payment-input';
import { getPlaid, plaidErrorMessage } from '@/lib/plaid';

export async function POST(request) {
  const plaid = getPlaid();
  if (!plaid) return jsonError('Bank payments are not configured', 503);

  const body = await request.json().catch(() => null);
  const userId = String(body?.userId ?? '').slice(0, 100);
  if (!userId) return jsonError('Missing user');

  try {
    const { data } = await plaid.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Timeless Carat Properties',
      products: [Products.Auth],
      country_codes: [CountryCode.Us],
      language: 'en',
      account_filters: { depository: { account_subtypes: ['checking', 'savings'] } },
    });
    return NextResponse.json({ linkToken: data.link_token });
  } catch (error) {
    return handleRouteError(new Error(plaidErrorMessage(error)));
  }
}
