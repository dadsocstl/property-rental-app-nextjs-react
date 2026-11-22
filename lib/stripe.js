import Stripe from 'stripe';

let client = null;

/** Server-only. Returns null when STRIPE_SECRET_KEY is not configured so routes can answer 503 instead of crashing. */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}
