import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { InputError, handleRouteError, jsonError, parsePayment } from '@/lib/payment-input';
import { getPlaid, plaidErrorMessage } from '@/lib/plaid';
import { getStripe } from '@/lib/stripe';

/**
 * Plaid Auth -> Stripe ACH. The Plaid access token never leaves this request: it verifies the
 * account, mints a single-use Stripe bank-account token, charges it, then removes the Plaid Item.
 */
export async function POST(request) {
  const plaid = getPlaid();
  const stripe = getStripe();
  if (!plaid || !stripe) return jsonError('Bank payments are not configured', 503);

  let accessToken = null;
  try {
    const body = await request.json().catch(() => null);
    const payment = parsePayment(body);
    const publicToken = String(body?.publicToken ?? '');
    const accountId = String(body?.accountId ?? '');
    if (!publicToken || !accountId) throw new InputError('Link a bank account first');

    const exchange = await plaid.itemPublicTokenExchange({ public_token: publicToken });
    accessToken = exchange.data.access_token;

    const auth = await plaid.authGet({ access_token: accessToken, options: { account_ids: [accountId] } });
    const account = auth.data.accounts.find((a) => a.account_id === accountId);
    if (!account || !auth.data.numbers.ach.some((n) => n.account_id === accountId)) {
      throw new InputError('This account cannot be used for ACH payments');
    }

    const tokenResponse = await plaid.processorStripeBankAccountTokenCreate({
      access_token: accessToken,
      account_id: accountId,
    });

    const metadata = { chargeId: String(payment.chargeId), period: payment.period ?? '' };
    const customer = await stripe.customers.create({
      source: tokenResponse.data.stripe_bank_account_token,
      email: payment.email,
      metadata,
    });
    const charge = await stripe.charges.create(
      { amount: payment.amountCents, currency: 'usd', customer: customer.id, description: payment.description, metadata },
      { idempotencyKey: `rent-ach-${payment.chargeId}-${createHash('sha256').update(publicToken).digest('hex').slice(0, 32)}` }
    );

    return NextResponse.json({
      reference: charge.id,
      status: charge.status,
      amountCents: charge.amount,
      account: `${account.name} ••${account.mask}`,
    });
  } catch (error) {
    if (error instanceof InputError) return handleRouteError(error);
    return handleRouteError(new Error(error?.response ? plaidErrorMessage(error) : error?.message));
  } finally {
    if (accessToken) await plaid.itemRemove({ access_token: accessToken }).catch(() => {});
  }
}
