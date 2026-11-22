import { NextResponse } from 'next/server';

export class InputError extends Error {}

const MIN_CENTS = 100;
const MAX_CENTS = 5_000_000;

/** Rejects anything but a sane, integer-cents rent payment before it reaches Stripe or Plaid. */
export function parsePayment(body) {
  const chargeId = Number(body?.chargeId);
  const amountCents = Number(body?.amountCents);
  if (!Number.isInteger(chargeId) || chargeId <= 0) throw new InputError('Invalid rent charge');
  if (!Number.isInteger(amountCents) || amountCents < MIN_CENTS || amountCents > MAX_CENTS) {
    throw new InputError('Payment must be between $1.00 and $50,000.00');
  }
  const period = /^\d{4}-\d{2}$/.test(body?.period ?? '') ? body.period : null;
  const email = /^[^\s@]{1,64}@[^\s@]{1,255}$/.test(body?.email ?? '') ? body.email : undefined;
  const description = String(body?.description ?? 'Rent payment')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 200);
  return { chargeId, amountCents, period, email, description };
}

export const jsonError = (message, status = 400) => NextResponse.json({ error: message }, { status });

export function handleRouteError(error) {
  if (error instanceof InputError) return jsonError(error.message, 400);
  return jsonError(error?.message ?? 'Payment service error', 502);
}
