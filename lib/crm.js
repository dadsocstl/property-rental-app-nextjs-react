import { oneOf, optionalCents, optionalText, requireAdmin, requireText, todayIso } from '@/lib/admin';
import { query, transaction } from '@/lib/db';

export const LEAD_STAGES = ['new', 'contacted', 'tour', 'applied', 'won', 'lost'];
export const LEAD_SOURCES = ['website', 'referral', 'walk-in', 'listing site', 'phone', 'other'];
export const ACTIVITY_KINDS = ['note', 'call', 'email', 'tour'];

const CONTACT_KINDS = ['call', 'email', 'tour'];

function validEmail(value) {
  const email = optionalText(value);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address');
  return email;
}

export async function getLeads() {
  await requireAdmin();
  return query(
    `SELECT l.*, un.name AS unit_name, p.name AS property_name,
            (SELECT COUNT(*) FROM crm_activities a WHERE a.lead_id = l.id) AS activity_count
     FROM crm_leads l
     LEFT JOIN units un ON un.id = l.unit_id
     LEFT JOIN properties p ON p.id = un.property_id
     ORDER BY CASE l.stage WHEN 'won' THEN 5 WHEN 'lost' THEN 6 ELSE 0 END,
              CASE WHEN l.follow_up_on IS NULL THEN 1 ELSE 0 END, l.follow_up_on, l.created_at DESC`
  );
}

export async function getLeadActivities(leadId) {
  await requireAdmin();
  return query('SELECT * FROM crm_activities WHERE lead_id = ? ORDER BY created_at DESC, id DESC', [leadId]);
}

export async function addLead(values) {
  await requireAdmin();
  const email = validEmail(values.email);
  const source = oneOf(values.source || 'website', LEAD_SOURCES, 'source');
  return transaction(({ run }) => {
    const now = new Date().toISOString();
    run(
      `INSERT INTO crm_leads (first_name, last_name, email, phone, source, stage, unit_id, budget_cents, desired_move_in, notes, follow_up_on, created_at)
       VALUES (?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?)`,
      [
        requireText(values.firstName, 'First name'),
        requireText(values.lastName, 'Last name'),
        email,
        optionalText(values.phone),
        source,
        Number(values.unitId) || null,
        optionalCents(values.budget),
        optionalText(values.desiredMoveIn),
        optionalText(values.notes),
        optionalText(values.followUpOn) ?? todayIso(),
        now,
      ]
    );
    return { message: 'Lead added' };
  });
}

export async function setLeadStage(leadId, stage) {
  await requireAdmin();
  oneOf(stage, LEAD_STAGES, 'stage');
  return transaction(({ run, get }) => {
    const lead = get('SELECT stage FROM crm_leads WHERE id = ?', [leadId]);
    if (!lead) throw new Error('Lead not found');
    if (lead.stage === stage) return { message: 'Stage unchanged' };
    run('UPDATE crm_leads SET stage = ? WHERE id = ?', [stage, leadId]);
    run("INSERT INTO crm_activities (lead_id, kind, body, created_at) VALUES (?, 'stage', ?, ?)", [
      leadId,
      `Moved from ${lead.stage} to ${stage}`,
      new Date().toISOString(),
    ]);
    return { message: `Moved to ${stage}` };
  });
}

export async function setFollowUp(leadId, date) {
  await requireAdmin();
  const value = optionalText(date);
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Follow-up must be a valid date');
  return transaction(({ run }) => {
    if (!run('UPDATE crm_leads SET follow_up_on = ? WHERE id = ?', [value, leadId])) throw new Error('Lead not found');
    return { message: value ? 'Follow-up scheduled' : 'Follow-up cleared' };
  });
}

export async function logActivity(leadId, { kind, body }) {
  await requireAdmin();
  oneOf(kind, ACTIVITY_KINDS, 'activity type');
  const text = requireText(body, 'Note');
  return transaction(({ run }) => {
    const now = new Date().toISOString();
    run('INSERT INTO crm_activities (lead_id, kind, body, created_at) VALUES (?, ?, ?, ?)', [leadId, kind, text, now]);
    if (CONTACT_KINDS.includes(kind)) {
      run("UPDATE crm_leads SET last_contacted_at = ?, stage = CASE WHEN stage = 'new' THEN 'contacted' ELSE stage END WHERE id = ?", [
        now,
        leadId,
      ]);
    }
    return { message: 'Activity logged' };
  });
}

/** Saves the outcome of a Plaid Identity check; only the match result and the account mask are kept, never bank credentials. */
export async function recordVerification(leadId, result) {
  await requireAdmin();
  oneOf(result.status, ['verified', 'partial', 'mismatch'], 'verification status');
  const { name, email, phone } = result.checks;
  const matched = [name && 'name', email && 'email', phone && 'phone'].filter(Boolean);
  const summary =
    result.status === 'mismatch'
      ? 'Plaid identity check: the name on the bank account did not match this lead.'
      : `Plaid identity check${result.institution ? ` via ${result.institution}` : ''}: matched ${matched.join(', ')}${
          result.status === 'partial' ? ' (no email or phone match, review manually)' : ''
        }.`;
  return transaction(({ run }) => {
    const now = new Date().toISOString();
    if (
      !run(
        `UPDATE crm_leads SET verification_status = ?, verification_method = 'plaid_identity', verification_json = ?, verified_at = ? WHERE id = ?`,
        [result.status, JSON.stringify(result), now, leadId]
      )
    ) {
      throw new Error('Lead not found');
    }
    run("INSERT INTO crm_activities (lead_id, kind, body, created_at) VALUES (?, 'verification', ?, ?)", [leadId, summary, now]);
    return { message: result.status === 'verified' ? 'Identity verified' : 'Verification recorded' };
  });
}

/** Turns a lead into a rental application so it flows into the existing screening and lease workflow. */
export async function promoteLead(leadId) {
  await requireAdmin();
  return transaction(({ run, get }) => {
    const lead = get('SELECT * FROM crm_leads WHERE id = ?', [leadId]);
    if (!lead) throw new Error('Lead not found');
    if (lead.application_id) return { message: 'Already an application' };
    const now = new Date().toISOString();
    const notes = [
      lead.notes,
      lead.budget_cents ? `Budget $${Math.round(lead.budget_cents / 100)}/mo.` : null,
      lead.verification_status === 'verified' ? 'Identity verified with Plaid.' : null,
    ]
      .filter(Boolean)
      .join(' ');
    run(
      `INSERT INTO applications (unit_id, first_name, last_name, email, phone, desired_move_in, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
      [lead.unit_id, lead.first_name, lead.last_name, lead.email, lead.phone, lead.desired_move_in, notes || null, now]
    );
    const applicationId = get('SELECT last_insert_rowid() AS id').id;
    run("UPDATE crm_leads SET application_id = ?, stage = 'applied' WHERE id = ?", [applicationId, leadId]);
    run("INSERT INTO crm_activities (lead_id, kind, body, created_at) VALUES (?, 'stage', 'Application created', ?)", [leadId, now]);
    return { message: 'Application created' };
  });
}

export async function deleteLead(leadId) {
  await requireAdmin();
  return transaction(({ run }) => {
    run('DELETE FROM crm_leads WHERE id = ?', [leadId]);
    return { message: 'Lead removed' };
  });
}
