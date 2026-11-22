import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/payment-input';
import { getPlaid, plaidErrorCode, plaidErrorMessage } from '@/lib/plaid';
import { compareIdentity, summarizeBankIncome, summarizeIdv } from '@/lib/verification';

const text = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const PLAID_USER_ID = /^[A-Za-z0-9_-]{10,100}$/;

function applicantFrom(body) {
  return {
    firstName: text(body?.applicant?.firstName, 100),
    lastName: text(body?.applicant?.lastName, 100),
    email: text(body?.applicant?.email),
    phone: text(body?.applicant?.phone, 40),
  };
}

/** Reads the finished Identity Verification session for this applicant from Plaid, never from the browser. */
async function readIdv(plaid, applicantId, applicant) {
  const userId = `applicant-${text(applicantId, 64).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { data } = await plaid.identityVerificationList({
    template_id: process.env.PLAID_IDV_TEMPLATE_ID,
    client_user_id: userId,
  });
  const latest = [...data.identity_verifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  if (!latest) return { method: 'plaid_idv', status: 'pending' };
  return summarizeIdv(latest, applicant);
}

async function readBankIdentity(plaid, publicToken, institution, applicant) {
  const exchange = await plaid.itemPublicTokenExchange({ public_token: publicToken });
  const accessToken = exchange.data.access_token;
  try {
    const { data } = await plaid.identityGet({ access_token: accessToken });
    const owners = data.accounts.flatMap((account) => account.owners ?? []);
    const result = compareIdentity(applicant, owners);
    // Name must match for the applicant to count as verified; email and phone only add confidence.
    const status = result.status === 'mismatch' ? 'failed' : result.status === 'partial' ? 'review' : 'verified';
    return { ...result, method: 'plaid_identity', status, institution: institution ?? result.institution ?? null };
  } finally {
    await plaid.itemRemove({ access_token: accessToken }).catch(() => {});
  }
}

export async function POST(request) {
  const plaid = getPlaid();
  if (!plaid) return jsonError('Applicant verification is not configured', 503);

  const body = await request.json().catch(() => null);
  const applicant = applicantFrom(body);

  try {
    if (body?.step === 'identity') {
      if (!applicant.firstName || !applicant.lastName) return jsonError('Enter your first and last name first');
      if (body.method === 'plaid_idv') {
        if (!body.applicantId) return jsonError('Missing applicant');
        return NextResponse.json(await readIdv(plaid, body.applicantId, applicant));
      }
      const publicToken = text(body.publicToken, 300);
      if (!publicToken) return jsonError('Missing bank connection');
      return NextResponse.json(await readBankIdentity(plaid, publicToken, text(body.institution, 120), applicant));
    }

    if (body?.step === 'income') {
      const plaidUserId = text(body.plaidUserId, 100);
      if (!PLAID_USER_ID.test(plaidUserId)) return jsonError('Missing income session');
      const { data } = await plaid.creditBankIncomeGet({ user_id: plaidUserId });
      return NextResponse.json(summarizeBankIncome(data));
    }

    return jsonError('Unknown verification step');
  } catch (error) {
    // Income is generated asynchronously after Link closes; the form retries on this.
    if (['INCOME_VERIFICATION_NOT_FOUND', 'PRODUCT_NOT_READY'].includes(plaidErrorCode(error))) {
      return NextResponse.json({ status: 'pending' });
    }
    return jsonError(plaidErrorMessage(error), 502);
  }
}
