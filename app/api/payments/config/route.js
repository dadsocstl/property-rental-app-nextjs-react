import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    card: Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    bank: Boolean(process.env.STRIPE_SECRET_KEY && process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET),
    plaidEnv: process.env.PLAID_ENV || 'sandbox',
  });
}
