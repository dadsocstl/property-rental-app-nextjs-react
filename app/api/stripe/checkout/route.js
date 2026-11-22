import { NextResponse } from 'next/server';
import { handleRouteError, jsonError, parsePayment } from '@/lib/payment-input';
import { getStripe } from '@/lib/stripe';

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return jsonError('Card payments are not configured', 503);

  try {
    const payment = parsePayment(await request.json().catch(() => null));
    const metadata = { chargeId: String(payment.chargeId), period: payment.period ?? '' };

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page',
      redirect_on_completion: 'never',
      mode: 'payment',
      customer_email: payment.email,
      metadata,
      payment_intent_data: { description: payment.description, metadata },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: payment.amountCents,
            product_data: { name: 'Rent payment', description: payment.description },
          },
        },
      ],
    });

    return NextResponse.json({ clientSecret: session.client_secret, sessionId: session.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
