import { NextResponse } from 'next/server';
import { getPlaid } from '@/lib/plaid';

/** Tells the application form which Plaid checks this deployment can run, so it never offers one that cannot work. */
export async function GET() {
  const configured = Boolean(getPlaid());
  return NextResponse.json({
    identity: configured,
    income: configured,
    idvTemplate: configured && Boolean(process.env.PLAID_IDV_TEMPLATE_ID),
  });
}
