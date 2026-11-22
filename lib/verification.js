const normalize = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const digits = (value) => String(value ?? '').replace(/\D/g, '').slice(-10);

/** The lead's first and last name must both appear among the account holder's name parts (initials count for first names). */
export function nameMatches(lead, ownerNames) {
  const first = normalize(lead.firstName)[0];
  const last = normalize(lead.lastName).at(-1);
  if (!first || !last) return false;
  return ownerNames.some((full) => {
    const parts = normalize(full);
    const firstOk = parts.some((p) => p === first || (p.length === 1 && p === first[0]));
    return firstOk && parts.includes(last);
  });
}

/**
 * Compares a lead against the owners Plaid Identity returned for the linked accounts.
 * Returns booleans only, so no bank-held personal data is sent back to the browser.
 */
export function compareIdentity(lead, owners) {
  const names = owners.flatMap((o) => o.names ?? []);
  const emails = owners.flatMap((o) => (o.emails ?? []).map((e) => String(e.data ?? '').toLowerCase()));
  const phones = owners.flatMap((o) => (o.phone_numbers ?? []).map((p) => digits(p.data)));

  const name = nameMatches(lead, names);
  const email = Boolean(lead.email) && emails.includes(String(lead.email).trim().toLowerCase());
  const phone = digits(lead.phone).length === 10 && phones.includes(digits(lead.phone));

  const status = !name ? 'mismatch' : email || phone ? 'verified' : 'partial';
  return { status, checks: { name, email, phone } };
}

/* ---------- Applicant verification (Plaid Identity Verification + Income) ---------- */

const IDV_STEP_KEYS = ['documentary_verification', 'selfie_check', 'kyc_check', 'watchlist_screening', 'risk_check', 'verify_sms'];

/**
 * Reduces a Plaid Identity Verification session to what a landlord needs. The ID number, document images and
 * date of birth stay with Plaid; only the outcome of each step and whether the verified name matches is kept.
 */
export function summarizeIdv(idv, applicant) {
  const steps = Object.fromEntries(IDV_STEP_KEYS.map((key) => [key, idv.steps?.[key] ?? 'not_applicable']));
  const name = idv.user?.name;
  const nameOk = name
    ? nameMatches({ firstName: applicant.firstName, lastName: applicant.lastName }, [`${name.given_name} ${name.family_name}`])
    : null;

  let status;
  if (idv.status === 'success') status = nameOk === false ? 'review' : 'verified';
  else if (idv.status === 'pending_review') status = 'review';
  else if (idv.status === 'active') status = 'pending';
  else status = 'failed';

  return {
    method: 'plaid_idv',
    status,
    steps,
    nameMatches: nameOk,
    verificationId: idv.id,
    completedAt: idv.completed_at ?? null,
  };
}

const DAYS_PER_MONTH = 30.4375;
const dayDiff = (start, end) => Math.max(1, Math.round((new Date(end) - new Date(start)) / 86_400_000) + 1);

/**
 * Reduces Plaid bank income to totals a landlord can screen against. Amounts are converted to whole cents so they
 * line up with the rest of the app; account numbers and transaction detail are dropped.
 */
export function summarizeBankIncome(response, requestedDays = 90) {
  const report = response?.bank_income?.[0];
  const summary = report?.bank_income_summary;
  if (!report || !summary) return { status: 'pending' };

  const days = summary.start_date && summary.end_date ? dayDiff(summary.start_date, summary.end_date) : report.days_requested ?? requestedDays;
  const totalCents = Math.round((summary.total_amount ?? 0) * 100);
  const monthlyCents = Math.round((totalCents / days) * DAYS_PER_MONTH);

  const sources = (report.items ?? []).flatMap((item) =>
    (item.bank_income_sources ?? []).map((source) => {
      const sourceDays = source.start_date && source.end_date ? dayDiff(source.start_date, source.end_date) : days;
      const total = Math.round((source.total_amount ?? 0) * 100);
      return {
        description: source.income_description ?? 'Income',
        category: String(source.income_category ?? 'other').toLowerCase(),
        payFrequency: String(source.pay_frequency ?? 'unknown').toLowerCase(),
        institution: item.institution_name ?? null,
        totalCents: total,
        monthlyCents: Math.round((total / Math.max(sourceDays, days)) * DAYS_PER_MONTH),
        transactions: source.transaction_count ?? 0,
      };
    })
  );

  return {
    method: 'plaid_income',
    status: monthlyCents > 0 ? 'verified' : 'failed',
    monthlyCents,
    totalCents,
    days,
    startDate: summary.start_date ?? null,
    endDate: summary.end_date ?? null,
    sources: sources.sort((a, b) => b.monthlyCents - a.monthlyCents),
    months: (summary.historical_summary ?? []).map((m) => ({
      start: m.start_date,
      end: m.end_date,
      totalCents: Math.round((m.total_amount ?? 0) * 100),
    })),
    warnings: (report.warnings ?? []).map((w) => w.warning_code ?? 'WARNING'),
    generatedAt: report.generated_time ?? new Date().toISOString(),
  };
}
