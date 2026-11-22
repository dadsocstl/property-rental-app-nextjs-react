import { NextResponse } from 'next/server';
import { handleRouteError, jsonError } from '@/lib/payment-input';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/** The browser records a payment only from what Stripe reports here, never from its own claim of success. */
export async function GET(request) {
  const stripe = getStripe();
  if (!stripe) return jsonError('Card payments are not configured', 503);

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return jsonError('Invalid checkout session');

  try {
    const session = await stripe.checkout.sessions.retrieve(id, { expand: ['payment_intent'] });
    return NextResponse.json({
      status: session.status,
      paymentStatus: session.payment_status,
      amountCents: session.amount_total,
      chargeId: Number(session.metadata?.chargeId) || null,
      reference: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
