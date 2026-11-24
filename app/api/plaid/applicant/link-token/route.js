import { CountryCode, Products } from 'plaid/legacy';
import { NextResponse } from 'next/server';
import { handleRouteError, jsonError } from '@/lib/payment-input';
import { getPlaid, isProductNotEnabled, linkCustomization, plaidErrorMessage } from '@/lib/plaid';

const CLIENT_NAME = 'Timeless Carat Properties';
const INCOME_DAYS = 90;

const text = (value, max = 120) => String(value ?? '').trim().slice(0, max);

function clientUserId(applicantId, suffix) {
  const id = text(applicantId, 64).replace(/[^a-zA-Z0-9_-]/g, '');
  return id.length >= 8 ? `applicant-${id}${suffix ? `-${suffix}` : ''}` : null;
}

const base = (userId) => ({
  client_name: CLIENT_NAME,
  country_codes: [CountryCode.Us],
  language: 'en',
  ...linkCustomization(),
});

/** Plaid Identity Verification: photo ID, selfie and KYC checks run inside Link against the dashboard template. */
async function identityVerificationToken(plaid, userId, applicant) {
  const { data } = await plaid.linkTokenCreate({
    ...base(userId),
    user: {
      client_user_id: userId,
      legal_name: `${applicant.firstName} ${applicant.lastName}`.trim(),
      ...(applicant.email ? { email_address: applicant.email } : {}),
    },
    products: [Products.IdentityVerification],
    identity_verification: { template_id: process.env.PLAID_IDV_TEMPLATE_ID },
  });
  return data.link_token;
}

/** Fallback when Identity Verification is not enabled: confirm the applicant owns a bank account in their name. */
async function bankIdentityToken(plaid, userId) {
  const { data } = await plaid.linkTokenCreate({
    ...base(userId),
    user: { client_user_id: userId },
    products: [Products.Identity],
    account_filters: { depository: { account_subtypes: ['checking', 'savings'] } },
  });
  return data.link_token;
}

/** Plaid Income: the applicant links the account their pay lands in and Plaid reports verified deposits. */
async function incomeToken(plaid, userId) {
  const { data: user } = await plaid.userCreate({ client_user_id: userId }, true);
  const { data } = await plaid.linkTokenCreate({
    ...base(userId),
    user: { client_user_id: userId },
    user_id: user.user_id,
    products: [Products.IncomeVerification],
    income_verification: { income_source_types: ['bank'], bank_income: { days_requested: INCOME_DAYS } },
    account_filters: { depository: { account_subtypes: ['checking', 'savings'] } },
  });
  return { linkToken: data.link_token, plaidUserId: user.user_id };
}

export async function POST(request) {
  const plaid = getPlaid();
  if (!plaid) return jsonError('Applicant verification is not configured', 503);

  const body = await request.json().catch(() => null);
  const step = body?.step;
  const applicant = {
    firstName: text(body?.applicant?.firstName, 100),
    lastName: text(body?.applicant?.lastName, 100),
    email: text(body?.applicant?.email, 200),
  };

  try {
    if (step === 'identity') {
      const userId = clientUserId(body?.applicantId);
      if (!userId) return jsonError('Missing applicant');
      if (!applicant.firstName || !applicant.lastName) return jsonError('Enter your first and last name first');

      if (process.env.PLAID_IDV_TEMPLATE_ID) {
        try {
          return NextResponse.json({
            method: 'plaid_idv',
            linkToken: await identityVerificationToken(plaid, userId, applicant),
          });
        } catch (error) {
          if (!isProductNotEnabled(error)) throw error;
        }
      }
      return NextResponse.json({
        method: 'plaid_identity',
        linkToken: await bankIdentityToken(plaid, userId),
      });
    }

    if (step === 'income') {
      const userId = clientUserId(body?.applicantId, `income-${Date.now().toString(36)}`);
      if (!userId) return jsonError('Missing applicant');
      return NextResponse.json({ method: 'plaid_income', ...(await incomeToken(plaid, userId)) });
    }

    return jsonError('Unknown verification step');
  } catch (error) {
    return handleRouteError(new Error(plaidErrorMessage(error)));
  }
}
