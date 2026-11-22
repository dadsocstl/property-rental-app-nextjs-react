import { optionalCents, optionalText, requireText } from '@/lib/admin';
import { query, queryOne, transaction } from '@/lib/db';

const ID_STATUSES_THAT_MAY_SUBMIT = ['verified', 'review'];

async function sessionUser() {
  const user = await queryOne('SELECT u.id, u.email, u.username FROM session s JOIN users u ON u.id = s.user_id WHERE s.id = 1');
  if (!user) throw new Error('Sign in to apply');
  return user;
}

/** Units a renter can apply for on a listing: only those the landlord has marked as available. */
export async function getApplyableUnits(propertyId) {
  if (!propertyId) return [];
  return query(
    `SELECT un.id, un.name, un.bedrooms, un.bathrooms, un.sqft, un.market_rent_cents, un.status, p.name AS property_name
     FROM units un JOIN properties p ON p.id = un.property_id
     WHERE un.property_id = ? AND un.status IN ('vacant', 'turnover')
     ORDER BY un.name`,
    [propertyId]
  );
}

/** Applications the signed-in renter has submitted, newest first, with whatever decision has been recorded. */
export async function getMyApplications() {
  const user = await sessionUser();
  return query(
    `SELECT a.id, a.status, a.created_at, a.idv_status, a.income_status, a.income_verified_cents, a.decision_note, a.decided_at,
            un.name AS unit_name, un.market_rent_cents, p.name AS property_name
     FROM applications a
     LEFT JOIN units un ON un.id = a.unit_id
     LEFT JOIN properties p ON p.id = un.property_id
     WHERE a.submitted_by = ?
     ORDER BY a.created_at DESC`,
    [user.id]
  );
}

function cleanVerification(result, label) {
  if (!result) return null;
  return { ...result, steps: result.steps ?? undefined, label };
}

/**
 * Saves a completed application. Identity must already have been checked by Plaid; income is optional and, when
 * absent, the landlord sees only the figure the applicant stated.
 */
export async function submitApplication(values) {
  const user = await sessionUser();
  const firstName = requireText(values.firstName, 'First name');
  const lastName = requireText(values.lastName, 'Last name');
  const email = requireText(values.email, 'Email');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address');
  const unitId = Number(values.unitId);
  if (!unitId) throw new Error('Choose the unit you are applying for');
  if (!values.consent) throw new Error('Agree to the screening terms to submit');

  const identity = values.identity;
  if (!identity || !ID_STATUSES_THAT_MAY_SUBMIT.includes(identity.status)) {
    throw new Error('Verify your identity with Plaid before submitting');
  }
  const income = values.income?.status === 'verified' ? values.income : null;

  return transaction(({ run, get }) => {
    const unit = get("SELECT id FROM units WHERE id = ? AND status IN ('vacant', 'turnover')", [unitId]);
    if (!unit) throw new Error('That unit is no longer available');
    const duplicate = get(
      "SELECT id FROM applications WHERE submitted_by = ? AND unit_id = ? AND status IN ('new', 'screening')",
      [user.id, unitId]
    );
    if (duplicate) throw new Error('You already have an open application for this unit');

    const now = new Date().toISOString();
    run(
      `INSERT INTO applications (unit_id, first_name, last_name, email, phone, employer, monthly_income_cents, desired_move_in, status, notes,
         created_at, submitted_by, idv_status, idv_json, idv_checked_at, income_status, income_verified_cents, income_json, income_checked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        unitId,
        firstName,
        lastName,
        email,
        optionalText(values.phone),
        optionalText(values.employer),
        optionalCents(values.statedIncome),
        optionalText(values.desiredMoveIn),
        optionalText(values.notes),
        now,
        user.id,
        identity.status,
        JSON.stringify(cleanVerification(identity, 'identity')),
        now,
        income ? 'verified' : 'not_started',
        income?.monthlyCents ?? null,
        income ? JSON.stringify(cleanVerification(income, 'income')) : null,
        income ? now : null,
      ]
    );
    const applicationId = get('SELECT last_insert_rowid() AS id').id;

    // A prospect already in the CRM moves to "applied" instead of appearing twice.
    const lead = get('SELECT id FROM crm_leads WHERE lower(email) = lower(?) AND application_id IS NULL', [email]);
    if (lead) {
      run("UPDATE crm_leads SET application_id = ?, stage = 'applied' WHERE id = ?", [applicationId, lead.id]);
      run("INSERT INTO crm_activities (lead_id, kind, body, created_at) VALUES (?, 'stage', 'Submitted an application online', ?)", [
        lead.id,
        now,
      ]);
    }
    return { applicationId, message: 'Application submitted' };
  });
}

export async function withdrawApplication(applicationId) {
  const user = await sessionUser();
  return transaction(({ run }) => {
    const changed = run(
      "UPDATE applications SET status = 'withdrawn' WHERE id = ? AND submitted_by = ? AND status IN ('new', 'screening')",
      [applicationId, user.id]
    );
    if (!changed) throw new Error('This application can no longer be withdrawn');
    return { message: 'Application withdrawn' };
  });
}
