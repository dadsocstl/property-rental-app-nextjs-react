import { CHARGE_SELECT, todayIso, withChargeStatus } from '@/lib/admin';
import { query, queryOne, transaction } from '@/lib/db';

const METHODS = ['card', 'ach'];

async function sessionRenter() {
  const user = await queryOne(
    'SELECT u.id, u.email, u.username FROM session s JOIN users u ON u.id = s.user_id WHERE s.id = 1'
  );
  if (!user) throw new Error('You must be signed in to do that');
  const tenant = await queryOne('SELECT * FROM tenants WHERE lower(email) = lower(?)', [user.email]);
  return { user, tenant };
}

const monthName = (period) => {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/** Everything the renter dashboard shows, scoped to the tenant whose email matches the signed-in user. */
export async function getRenterAccount() {
  const { user, tenant } = await sessionRenter();
  if (!tenant) return { user, tenant: null };

  const today = todayIso();
  const [lease, chargeRows, payments] = await Promise.all([
    queryOne(
      `SELECT l.id, l.start_date, l.end_date, l.rent_cents, l.due_day, l.late_fee_cents,
         u.name AS unit_name, p.name AS property_name
       FROM leases l JOIN units u ON u.id = l.unit_id JOIN properties p ON p.id = u.property_id
       WHERE l.tenant_id = ? AND l.status = 'active' ORDER BY l.start_date DESC LIMIT 1`,
      [tenant.id]
    ),
    query(`${CHARGE_SELECT} WHERE l.tenant_id = ? ORDER BY c.due_date DESC`, [tenant.id]),
    query(
      `SELECT pay.id, pay.charge_id, pay.paid_on, pay.amount_cents, pay.method, pay.reference, c.period
       FROM payments pay JOIN rent_charges c ON c.id = pay.charge_id JOIN leases l ON l.id = c.lease_id
       WHERE l.tenant_id = ? ORDER BY pay.paid_on DESC, pay.id DESC`,
      [tenant.id]
    ),
  ]);

  const charges = chargeRows.map((row) => withChargeStatus(row, today));
  return {
    user,
    tenant,
    lease,
    charges,
    payments,
    balanceCents: charges.reduce((sum, c) => sum + c.balance_cents, 0),
    overdueCents: charges.filter((c) => c.status === 'overdue').reduce((sum, c) => sum + c.balance_cents, 0),
  };
}

async function ownedCharge(tenantId, chargeId) {
  const row = await queryOne(`${CHARGE_SELECT} WHERE c.id = ? AND l.tenant_id = ?`, [chargeId, tenantId]);
  if (!row) throw new Error('That rent charge is not on your account');
  return withChargeStatus(row, todayIso());
}

/** Checks the charge is the renter's and payable, and returns the metadata the payment APIs attach. */
export async function prepareRenterPayment(chargeId, amountCents) {
  const { user, tenant } = await sessionRenter();
  if (!tenant) throw new Error('No lease is linked to this account');
  const charge = await ownedCharge(tenant.id, chargeId);
  if (charge.balance_cents <= 0) throw new Error('This charge has nothing left to pay');
  if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > charge.balance_cents) {
    throw new Error('Payment cannot exceed the balance on this charge');
  }
  return {
    period: charge.period,
    email: user.email,
    description: `Rent for ${monthName(charge.period)} — ${charge.unit_name}, ${charge.property_name}`,
  };
}

/**
 * Records a payment that Stripe has already confirmed. The caller passes Stripe's reference and
 * amount; a repeated reference (page refresh, double click) is ignored rather than double-counted.
 */
export async function recordRenterPayment({ chargeId, amountCents, method, reference }) {
  const { tenant } = await sessionRenter();
  if (!tenant) throw new Error('No lease is linked to this account');
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error('Invalid payment amount');
  if (!METHODS.includes(method)) throw new Error('Unknown payment method');
  const ref = String(reference ?? '').trim().slice(0, 100);
  if (!ref) throw new Error('Missing payment reference');

  return transaction(({ run, get }) => {
    if (get('SELECT id FROM payments WHERE reference = ?', [ref])) {
      return { message: 'That payment is already on your account', duplicate: true };
    }
    const charge = get(
      `SELECT c.amount_cents, c.waived,
         COALESCE((SELECT SUM(amount_cents) FROM payments WHERE charge_id = c.id), 0) AS paid
       FROM rent_charges c JOIN leases l ON l.id = c.lease_id WHERE c.id = ? AND l.tenant_id = ?`,
      [chargeId, tenant.id]
    );
    if (!charge) throw new Error('That rent charge is not on your account');
    const balance = charge.amount_cents - charge.paid;
    if (charge.waived || balance <= 0) {
      throw new Error(`This charge is already settled — contact management about reference ${ref}`);
    }
    const applied = Math.min(amountCents, balance);
    run('INSERT INTO payments (charge_id, paid_on, amount_cents, method, reference, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
      chargeId,
      todayIso(),
      applied,
      method,
      ref,
      new Date().toISOString(),
    ]);
    return { message: applied === balance ? 'Payment received — this month is paid in full' : 'Payment received' };
  });
}
