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

  const ticketRows = await query(
    `SELECT w.id, w.title, w.description, w.priority, w.status, w.created_at, w.completed_at, w.scheduled_for,
       v.name AS vendor_name, v.category AS vendor_category, u.name AS unit_name, p.name AS property_name
     FROM work_orders w
     LEFT JOIN vendors v ON v.id = w.vendor_id
     LEFT JOIN units u ON u.id = w.unit_id
     LEFT JOIN properties p ON p.id = u.property_id
     WHERE w.tenant_id = ?
     ORDER BY CASE WHEN w.status IN ('completed', 'cancelled') THEN 1 ELSE 0 END, w.created_at DESC, w.id DESC`,
    [tenant.id]
  );
  // Internal landlord notes (internal = 1) never leave the management side.
  const ticketEvents = ticketRows.length
    ? await query(
        `SELECT id, work_order_id, author_role, author_name, kind, body, created_at
         FROM work_order_events
         WHERE internal = 0 AND work_order_id IN (${ticketRows.map(() => '?').join(',')})
         ORDER BY created_at, id`,
        ticketRows.map((t) => t.id)
      )
    : [];
  const workOrders = ticketRows.map((ticket) => ({
    ...ticket,
    events: ticketEvents.filter((event) => event.work_order_id === ticket.id),
  }));

  const charges = chargeRows.map((row) => withChargeStatus(row, today));
  return {
    user,
    tenant,
    lease,
    charges,
    payments,
    workOrders,
    balanceCents: charges.reduce((sum, c) => sum + c.balance_cents, 0),
    overdueCents: charges.filter((c) => c.status === 'overdue').reduce((sum, c) => sum + c.balance_cents, 0),
  };
}

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const MAX_OPEN_TICKETS = 10;

/** Files a work ticket against the renter's own unit; it starts open and management triages it. */
export async function submitRenterWorkOrder(values) {
  const { tenant } = await sessionRenter();
  if (!tenant) throw new Error('No lease is linked to this account');

  const title = String(values.title ?? '').trim().slice(0, 120);
  if (!title) throw new Error('Describe the problem in a short title');
  const description = String(values.description ?? '').trim().slice(0, 2000) || null;
  const priority = values.priority || 'normal';
  if (!TICKET_PRIORITIES.includes(priority)) throw new Error('Unknown priority');

  return transaction(({ run, get }) => {
    const lease = get("SELECT unit_id FROM leases WHERE tenant_id = ? AND status = 'active' ORDER BY start_date DESC", [
      tenant.id,
    ]);
    if (!lease) throw new Error('You need an active lease to submit a work ticket');
    const open = get(
      "SELECT COUNT(*) AS count FROM work_orders WHERE tenant_id = ? AND status IN ('open', 'assigned', 'in_progress')",
      [tenant.id]
    );
    if (open.count >= MAX_OPEN_TICKETS) {
      throw new Error('You have several open tickets already — call management for anything more urgent');
    }
    const now = new Date().toISOString();
    run(
      `INSERT INTO work_orders (unit_id, tenant_id, title, description, priority, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`,
      [lease.unit_id, tenant.id, title, description, priority, now]
    );
    const { id } = get('SELECT last_insert_rowid() AS id');
    run(
      `INSERT INTO work_order_events (work_order_id, author_role, author_name, kind, body, internal, created_at)
       VALUES (?, 'renter', ?, 'created', 'Ticket submitted', 0, ?)`,
      [id, tenantName(tenant), now]
    );
    return { message: 'Work ticket submitted' };
  });
}

function tenantName(tenant) {
  return [tenant.first_name, tenant.last_name].filter(Boolean).join(' ') || 'Tenant';
}

/** Adds a message from the renter to one of their own tickets; management sees it in the ticket thread. */
export async function addRenterTicketComment(workOrderId, body) {
  const { tenant } = await sessionRenter();
  if (!tenant) throw new Error('No lease is linked to this account');
  const text = String(body ?? '').trim().slice(0, 2000);
  if (!text) throw new Error('Write a message first');
  return transaction(({ run, get }) => {
    const ticket = get('SELECT status FROM work_orders WHERE id = ? AND tenant_id = ?', [workOrderId, tenant.id]);
    if (!ticket) throw new Error('That ticket is not on your account');
    if (ticket.status === 'cancelled' || ticket.status === 'completed') {
      throw new Error('This ticket is closed — submit a new one if the problem is back');
    }
    run(
      `INSERT INTO work_order_events (work_order_id, author_role, author_name, kind, body, internal, created_at)
       VALUES (?, 'renter', ?, 'comment', ?, 0, ?)`,
      [workOrderId, tenantName(tenant), text, new Date().toISOString()]
    );
    return { message: 'Message sent to management' };
  });
}

/** A renter can withdraw a ticket only while nobody has been assigned to it. */
export async function cancelRenterWorkOrder(workOrderId) {
  const { tenant } = await sessionRenter();
  if (!tenant) throw new Error('No lease is linked to this account');
  return transaction(({ run, get }) => {
    const ticket = get('SELECT status FROM work_orders WHERE id = ? AND tenant_id = ?', [workOrderId, tenant.id]);
    if (!ticket) throw new Error('That ticket is not on your account');
    if (ticket.status !== 'open') throw new Error('This ticket is already being handled — contact management to change it');
    run("UPDATE work_orders SET status = 'cancelled' WHERE id = ?", [workOrderId]);
    run(
      `INSERT INTO work_order_events (work_order_id, author_role, author_name, kind, body, internal, created_at)
       VALUES (?, 'renter', ?, 'status', 'Ticket withdrawn by tenant', 0, ?)`,
      [workOrderId, tenantName(tenant), new Date().toISOString()]
    );
    return { message: 'Ticket withdrawn' };
  });
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
