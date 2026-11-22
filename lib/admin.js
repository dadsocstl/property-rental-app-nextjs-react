import { query, queryOne, transaction } from '@/lib/db';

/* ---------- Helpers ---------- */

const pad = (n) => String(n).padStart(2, '0');

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function currentPeriod() {
  return todayIso().slice(0, 7);
}

export function toCents(value) {
  const number = Number(String(value ?? '').replace(/[$,\s]/g, ''));
  if (!Number.isFinite(number)) return NaN;
  return Math.round(number * 100);
}

function requireText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function optionalText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function requirePositiveCents(value, label) {
  const cents = toCents(value);
  if (!Number.isInteger(cents) || cents <= 0) throw new Error(`${label} must be greater than zero`);
  return cents;
}

function optionalCents(value) {
  if (value === '' || value === null || value === undefined) return null;
  const cents = toCents(value);
  if (!Number.isInteger(cents) || cents < 0) throw new Error('Amounts cannot be negative');
  return cents;
}

function requireDate(value, label) {
  const text = String(value ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label} must be a valid date`);
  return text;
}

function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) throw new Error(`Unknown ${label}: ${value}`);
  return value;
}

async function requireAdmin() {
  const row = await queryOne(
    'SELECT u.id, u.role FROM session s JOIN users u ON u.id = s.user_id WHERE s.id = 1'
  );
  if (!row) throw new Error('You must be signed in to do that');
  if (row.role !== 'admin') throw new Error('Only administrators can manage properties');
  return row.id;
}

export const UNIT_STATUSES = ['vacant', 'occupied', 'turnover', 'unavailable'];
export const PAYMENT_METHODS = ['ach', 'check', 'cash', 'card', 'other'];
export const WORK_ORDER_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
export const WORK_ORDER_STATUSES = ['open', 'assigned', 'in_progress', 'completed', 'cancelled'];
export const VENDOR_CATEGORIES = ['plumber', 'electrician', 'hvac', 'handyman', 'cleaning', 'landscaping', 'general'];
export const APPLICATION_STATUSES = ['new', 'screening', 'approved', 'declined', 'withdrawn'];

// Status follows from the money; only "waived" is stored. Paid-in-full wins over a passed due date.
export const CHARGE_SELECT = `
  SELECT c.id, c.lease_id, c.period, c.due_date, c.amount_cents, c.waived, c.notes,
    COALESCE((SELECT SUM(amount_cents) FROM payments WHERE charge_id = c.id), 0) AS paid_cents,
    l.tenant_id, l.late_fee_cents, t.first_name, t.last_name, t.email AS tenant_email,
    u.id AS unit_id, u.name AS unit_name, p.id AS property_id, p.name AS property_name
  FROM rent_charges c
  JOIN leases l ON l.id = c.lease_id
  JOIN units u ON u.id = l.unit_id
  JOIN properties p ON p.id = u.property_id
  LEFT JOIN tenants t ON t.id = l.tenant_id`;

export function withChargeStatus(row, today) {
  const balance = Math.max(row.amount_cents - row.paid_cents, 0);
  let status = 'open';
  if (row.waived) status = 'waived';
  else if (balance === 0) status = 'paid';
  else if (row.due_date < today) status = 'overdue';
  else if (row.paid_cents > 0) status = 'partial';
  return { ...row, balance_cents: row.waived ? 0 : balance, status };
}

const tenantName = (row) => [row.first_name, row.last_name].filter(Boolean).join(' ') || 'No tenant';

/* ---------- Overview ---------- */

export async function getOverview() {
  await requireAdmin();
  const today = todayIso();
  const period = currentPeriod();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 60);
  const horizonIso = `${horizon.getFullYear()}-${pad(horizon.getMonth() + 1)}-${pad(horizon.getDate())}`;

  const [units, charges, workOrders, expiring, applications] = await Promise.all([
    query('SELECT status, COUNT(*) AS count FROM units GROUP BY status'),
    query(`${CHARGE_SELECT} WHERE c.waived = 0 ORDER BY c.due_date`),
    query(
      `SELECT w.id, w.title, w.priority, w.status, u.name AS unit_name, p.name AS property_name
       FROM work_orders w LEFT JOIN units u ON u.id = w.unit_id LEFT JOIN properties p ON p.id = u.property_id
       WHERE w.status IN ('open', 'assigned', 'in_progress')
       ORDER BY CASE w.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, w.created_at`
    ),
    query(
      `SELECT l.id, l.end_date, l.rent_cents, t.first_name, t.last_name, u.name AS unit_name, p.name AS property_name
       FROM leases l JOIN units u ON u.id = l.unit_id JOIN properties p ON p.id = u.property_id
       LEFT JOIN tenants t ON t.id = l.tenant_id
       WHERE l.status = 'active' AND l.end_date BETWEEN ? AND ? ORDER BY l.end_date`,
      [today, horizonIso]
    ),
    queryOne("SELECT COUNT(*) AS count FROM applications WHERE status IN ('new', 'screening')"),
  ]);

  const unitCounts = Object.fromEntries(units.map((r) => [r.status, r.count]));
  const totalUnits = units.reduce((sum, r) => sum + r.count, 0);
  const all = charges.map((c) => withChargeStatus(c, today));
  const thisMonth = all.filter((c) => c.period === period);
  const owing = all
    .filter((c) => c.balance_cents > 0)
    .map((c) => ({ ...c, tenant_name: tenantName(c) }));

  return {
    period,
    totalUnits,
    occupiedUnits: unitCounts.occupied ?? 0,
    vacantUnits: (unitCounts.vacant ?? 0) + (unitCounts.turnover ?? 0),
    month: {
      chargeCount: thisMonth.length,
      dueCents: thisMonth.reduce((s, c) => s + c.amount_cents, 0),
      collectedCents: thisMonth.reduce((s, c) => s + Math.min(c.paid_cents, c.amount_cents), 0),
      overdueCents: thisMonth.filter((c) => c.status === 'overdue').reduce((s, c) => s + c.balance_cents, 0),
    },
    arrearsCents: owing.filter((c) => c.status === 'overdue').reduce((s, c) => s + c.balance_cents, 0),
    owing,
    workOrders,
    expiring: expiring.map((l) => ({ ...l, tenant_name: tenantName(l) })),
    pendingApplications: applications?.count ?? 0,
  };
}

/* ---------- Landlords ---------- */

export async function getLandlords() {
  await requireAdmin();
  const today = todayIso();
  const [owners, charges] = await Promise.all([
    query(
      `SELECT u.id, u.username, u.email, u.role,
        COUNT(DISTINCT p.id) AS listing_count,
        COUNT(DISTINCT un.id) AS unit_count,
        COUNT(DISTINCT CASE WHEN un.status = 'occupied' THEN un.id END) AS occupied_count,
        COALESCE((SELECT SUM(l.rent_cents) FROM leases l JOIN units u2 ON u2.id = l.unit_id
          JOIN properties p2 ON p2.id = u2.property_id WHERE p2.owner = u.id AND l.status = 'active'), 0) AS rent_roll_cents,
        (SELECT COUNT(*) FROM work_orders w JOIN units u3 ON u3.id = w.unit_id JOIN properties p3 ON p3.id = u3.property_id
          WHERE p3.owner = u.id AND w.status IN ('open', 'assigned', 'in_progress')) AS open_work_orders
       FROM users u
       JOIN properties p ON p.owner = u.id
       LEFT JOIN units un ON un.property_id = p.id
       GROUP BY u.id ORDER BY rent_roll_cents DESC, u.username`
    ),
    query(`${CHARGE_SELECT} WHERE c.waived = 0`),
  ]);
  const ownerByProperty = new Map(
    (await query('SELECT id, owner FROM properties')).map((p) => [p.id, p.owner])
  );
  const arrears = new Map();
  for (const charge of charges.map((c) => withChargeStatus(c, today))) {
    if (charge.status !== 'overdue') continue;
    const owner = ownerByProperty.get(charge.property_id);
    arrears.set(owner, (arrears.get(owner) ?? 0) + charge.balance_cents);
  }
  return owners.map((o) => ({ ...o, arrears_cents: arrears.get(o.id) ?? 0 }));
}

/* ---------- Units ---------- */

export async function getUnits() {
  await requireAdmin();
  return query(
    `SELECT un.*, p.name AS property_name, p.city, p.state, p.owner, o.username AS owner_name,
       l.id AS lease_id, l.rent_cents, t.id AS tenant_id, t.first_name, t.last_name
     FROM units un
     JOIN properties p ON p.id = un.property_id
     LEFT JOIN users o ON o.id = p.owner
     LEFT JOIN leases l ON l.unit_id = un.id AND l.status = 'active'
     LEFT JOIN tenants t ON t.id = l.tenant_id
     ORDER BY p.name, un.name`
  );
}

export async function getListingsForUnits() {
  await requireAdmin();
  return query('SELECT id, name, beds, baths, square_feet, rate_monthly FROM properties ORDER BY name');
}

export async function addUnit(values) {
  await requireAdmin();
  const propertyId = requireText(values.propertyId, 'Property');
  const name = requireText(values.name, 'Unit name');
  const rent = optionalCents(values.marketRent) ?? 0;
  const bedrooms = Number(values.bedrooms ?? 1);
  const bathrooms = Number(values.bathrooms ?? 1);
  if (!(bedrooms >= 0) || !(bathrooms >= 0)) throw new Error('Bedrooms and bathrooms cannot be negative');
  return transaction(({ run, get }) => {
    if (!get('SELECT id FROM properties WHERE id = ?', [propertyId])) throw new Error('Property not found');
    run(
      `INSERT INTO units (property_id, name, bedrooms, bathrooms, sqft, market_rent_cents, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'vacant', ?)`,
      [propertyId, name, bedrooms, bathrooms, Number(values.sqft) || null, rent, new Date().toISOString()]
    );
    return { message: `${name} added` };
  });
}

export async function setUnitStatus(unitId, status) {
  await requireAdmin();
  oneOf(status, UNIT_STATUSES, 'unit status');
  return transaction(({ run, get }) => {
    const active = get("SELECT id FROM leases WHERE unit_id = ? AND status = 'active'", [unitId]);
    if (active && status !== 'occupied') throw new Error('End the active lease before changing this unit’s status');
    if (!active && status === 'occupied') throw new Error('Create a lease to mark a unit occupied');
    run('UPDATE units SET status = ? WHERE id = ?', [status, unitId]);
    return { message: 'Unit updated' };
  });
}

/* ---------- Tenants ---------- */

export async function getTenants() {
  await requireAdmin();
  const today = todayIso();
  const [tenants, charges] = await Promise.all([
    query(
      `SELECT t.*, l.id AS lease_id, l.end_date, l.rent_cents, un.name AS unit_name, p.name AS property_name
       FROM tenants t
       LEFT JOIN leases l ON l.tenant_id = t.id AND l.status = 'active'
       LEFT JOIN units un ON un.id = l.unit_id
       LEFT JOIN properties p ON p.id = un.property_id
       ORDER BY t.last_name, t.first_name`
    ),
    query(`${CHARGE_SELECT} WHERE c.waived = 0`),
  ]);
  const balances = new Map();
  for (const charge of charges.map((c) => withChargeStatus(c, today))) {
    if (!charge.tenant_id || charge.balance_cents === 0) continue;
    const entry = balances.get(charge.tenant_id) ?? { balance: 0, overdue: 0 };
    entry.balance += charge.balance_cents;
    if (charge.status === 'overdue') entry.overdue += charge.balance_cents;
    balances.set(charge.tenant_id, entry);
  }
  return tenants.map((t) => ({
    ...t,
    balance_cents: balances.get(t.id)?.balance ?? 0,
    overdue_cents: balances.get(t.id)?.overdue ?? 0,
  }));
}

function tenantValues(values) {
  const email = optionalText(values.email);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address');
  return [
    requireText(values.firstName, 'First name'),
    requireText(values.lastName, 'Last name'),
    email,
    optionalText(values.phone),
    optionalText(values.emergencyContact),
    optionalText(values.employer),
    optionalCents(values.monthlyIncome),
    optionalText(values.notes),
  ];
}

export async function addTenant(values) {
  await requireAdmin();
  const params = tenantValues(values);
  return transaction(({ run, get }) => {
    run(
      `INSERT INTO tenants (first_name, last_name, email, phone, emergency_contact, employer, monthly_income_cents, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...params, new Date().toISOString()]
    );
    return { id: get('SELECT last_insert_rowid() AS id').id, message: `${params[0]} ${params[1]} added` };
  });
}

export async function updateTenant(tenantId, values) {
  await requireAdmin();
  const params = tenantValues(values);
  return transaction(({ run }) => {
    const changed = run(
      `UPDATE tenants SET first_name = ?, last_name = ?, email = ?, phone = ?, emergency_contact = ?,
         employer = ?, monthly_income_cents = ?, notes = ? WHERE id = ?`,
      [...params, tenantId]
    );
    if (!changed) throw new Error('Tenant not found');
    return { message: 'Tenant updated' };
  });
}

/* ---------- Leases ---------- */

export async function getLeases() {
  await requireAdmin();
  return query(
    `SELECT l.*, t.first_name, t.last_name, un.name AS unit_name, p.name AS property_name, o.username AS owner_name
     FROM leases l
     JOIN units un ON un.id = l.unit_id
     JOIN properties p ON p.id = un.property_id
     LEFT JOIN users o ON o.id = p.owner
     LEFT JOIN tenants t ON t.id = l.tenant_id
     ORDER BY CASE l.status WHEN 'active' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, l.end_date`
  );
}

export async function createLease(values) {
  await requireAdmin();
  const unitId = Number(values.unitId);
  const tenantId = Number(values.tenantId);
  if (!unitId) throw new Error('Choose a unit');
  if (!tenantId) throw new Error('Choose a tenant');
  const start = requireDate(values.startDate, 'Start date');
  const end = requireDate(values.endDate, 'End date');
  if (end <= start) throw new Error('The lease must end after it starts');
  const rent = requirePositiveCents(values.rent, 'Monthly rent');
  const deposit = optionalCents(values.deposit) ?? 0;
  const lateFee = optionalCents(values.lateFee) ?? 0;
  const dueDay = Number(values.dueDay ?? 1);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) throw new Error('Rent due day must be between 1 and 28');
  const status = start > todayIso() ? 'upcoming' : 'active';

  return transaction(({ run, get }) => {
    if (!get('SELECT id FROM units WHERE id = ?', [unitId])) throw new Error('Unit not found');
    if (!get('SELECT id FROM tenants WHERE id = ?', [tenantId])) throw new Error('Tenant not found');
    if (get("SELECT id FROM leases WHERE unit_id = ? AND status IN ('active', 'upcoming')", [unitId])) {
      throw new Error('That unit already has an active or upcoming lease');
    }
    run(
      `INSERT INTO leases (unit_id, tenant_id, start_date, end_date, rent_cents, deposit_cents, due_day, late_fee_cents, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [unitId, tenantId, start, end, rent, deposit, dueDay, lateFee, status, optionalText(values.notes), new Date().toISOString()]
    );
    if (status === 'active') run("UPDATE units SET status = 'occupied' WHERE id = ?", [unitId]);
    run("UPDATE applications SET status = 'approved' WHERE tenant_id = ? AND status IN ('new', 'screening')", [tenantId]);
    return { message: status === 'active' ? 'Lease started' : 'Lease scheduled' };
  });
}

export async function endLease(leaseId) {
  await requireAdmin();
  return transaction(({ run, get }) => {
    const lease = get("SELECT id, unit_id, status FROM leases WHERE id = ?", [leaseId]);
    if (!lease) throw new Error('Lease not found');
    if (lease.status !== 'active' && lease.status !== 'upcoming') throw new Error('This lease has already ended');
    run("UPDATE leases SET status = ? WHERE id = ?", [lease.status === 'active' ? 'ended' : 'cancelled', leaseId]);
    if (lease.status === 'active') run("UPDATE units SET status = 'turnover' WHERE id = ?", [lease.unit_id]);
    return { message: lease.status === 'active' ? 'Lease ended — unit set to turnover' : 'Lease cancelled' };
  });
}

/* ---------- Rent ledger ---------- */

export async function getCharges(period) {
  await requireAdmin();
  const today = todayIso();
  const rows = await query(`${CHARGE_SELECT} WHERE c.period = ? ORDER BY p.name, u.name`, [period]);
  return rows.map((r) => ({ ...withChargeStatus(r, today), tenant_name: tenantName(r) }));
}

export async function getChargePayments(chargeId) {
  await requireAdmin();
  return query('SELECT * FROM payments WHERE charge_id = ? ORDER BY paid_on DESC, id DESC', [chargeId]);
}

/** One charge per active lease per month. The unique index makes repeated runs a no-op. */
export async function generateCharges(period) {
  await requireAdmin();
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error('Choose a month');
  const [year, month] = period.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return transaction(({ run, get }) => {
    const before = get('SELECT COUNT(*) AS n FROM rent_charges WHERE period = ?', [period]).n;
    run(
      `INSERT OR IGNORE INTO rent_charges (lease_id, period, due_date, amount_cents, created_at)
       SELECT id, ?, ? || '-' || printf('%02d', MIN(due_day, ?)), rent_cents, ?
       FROM leases
       WHERE status = 'active' AND substr(start_date, 1, 7) <= ? AND substr(end_date, 1, 7) >= ?`,
      [period, period, lastDay, new Date().toISOString(), period, period]
    );
    const created = get('SELECT COUNT(*) AS n FROM rent_charges WHERE period = ?', [period]).n - before;
    return {
      created,
      message: created ? `${created} charge${created === 1 ? '' : 's'} generated` : 'Every active lease is already charged for this month',
    };
  });
}

export async function recordPayment(chargeId, values) {
  await requireAdmin();
  const amount = requirePositiveCents(values.amount, 'Payment amount');
  const paidOn = requireDate(values.paidOn, 'Payment date');
  const method = oneOf(values.method, PAYMENT_METHODS, 'payment method');
  return transaction(({ run, get }) => {
    const charge = get(
      `SELECT c.amount_cents, c.waived, COALESCE((SELECT SUM(amount_cents) FROM payments WHERE charge_id = c.id), 0) AS paid
       FROM rent_charges c WHERE c.id = ?`,
      [chargeId]
    );
    if (!charge) throw new Error('Charge not found');
    if (charge.waived) throw new Error('This charge was waived');
    const balance = charge.amount_cents - charge.paid;
    if (balance <= 0) throw new Error('This charge is already paid in full');
    if (amount > balance) throw new Error(`Payment exceeds the remaining balance of $${(balance / 100).toFixed(2)}`);
    run(
      'INSERT INTO payments (charge_id, paid_on, amount_cents, method, reference, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [chargeId, paidOn, amount, method, optionalText(values.reference), new Date().toISOString()]
    );
    return { message: amount === balance ? 'Paid in full' : 'Partial payment recorded' };
  });
}

export async function deletePayment(paymentId) {
  await requireAdmin();
  return transaction(({ run }) => {
    if (!run('DELETE FROM payments WHERE id = ?', [paymentId])) throw new Error('Payment not found');
    return { message: 'Payment removed' };
  });
}

export async function setChargeWaived(chargeId, waived) {
  await requireAdmin();
  return transaction(({ run, get }) => {
    const paid = get('SELECT COALESCE(SUM(amount_cents), 0) AS n FROM payments WHERE charge_id = ?', [chargeId]).n;
    if (waived && paid > 0) throw new Error('Remove recorded payments before waiving this charge');
    if (!run('UPDATE rent_charges SET waived = ? WHERE id = ?', [waived ? 1 : 0, chargeId])) throw new Error('Charge not found');
    return { message: waived ? 'Charge waived' : 'Charge restored' };
  });
}

/* ---------- Maintenance ---------- */

export async function getVendors() {
  await requireAdmin();
  return query(
    `SELECT v.*, (SELECT COUNT(*) FROM work_orders w WHERE w.vendor_id = v.id AND w.status IN ('assigned', 'in_progress')) AS active_jobs
     FROM vendors v ORDER BY v.name`
  );
}

export async function addVendor(values) {
  await requireAdmin();
  const name = requireText(values.name, 'Vendor name');
  const category = oneOf(values.category || 'general', VENDOR_CATEGORIES, 'vendor category');
  return transaction(({ run }) => {
    run('INSERT INTO vendors (name, category, phone, email, created_at) VALUES (?, ?, ?, ?, ?)', [
      name,
      category,
      optionalText(values.phone),
      optionalText(values.email),
      new Date().toISOString(),
    ]);
    return { message: `${name} added` };
  });
}

export async function getWorkOrders() {
  await requireAdmin();
  return query(
    `SELECT w.*, un.name AS unit_name, p.name AS property_name, v.name AS vendor_name,
       t.first_name, t.last_name
     FROM work_orders w
     LEFT JOIN units un ON un.id = w.unit_id
     LEFT JOIN properties p ON p.id = un.property_id
     LEFT JOIN vendors v ON v.id = w.vendor_id
     LEFT JOIN tenants t ON t.id = w.tenant_id
     ORDER BY CASE w.status WHEN 'completed' THEN 1 WHEN 'cancelled' THEN 2 ELSE 0 END,
       CASE w.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
       w.created_at DESC`
  );
}

export async function addWorkOrder(values) {
  await requireAdmin();
  const title = requireText(values.title, 'Title');
  const priority = oneOf(values.priority || 'normal', WORK_ORDER_PRIORITIES, 'priority');
  const unitId = Number(values.unitId) || null;
  const vendorId = Number(values.vendorId) || null;
  return transaction(({ run, get }) => {
    const tenant = unitId
      ? get("SELECT tenant_id FROM leases WHERE unit_id = ? AND status = 'active'", [unitId])
      : null;
    run(
      `INSERT INTO work_orders (unit_id, tenant_id, vendor_id, title, description, priority, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [unitId, tenant?.tenant_id ?? null, vendorId, title, optionalText(values.description), priority, vendorId ? 'assigned' : 'open', new Date().toISOString()]
    );
    return { message: 'Work order created' };
  });
}

export async function updateWorkOrder(workOrderId, values) {
  await requireAdmin();
  const status = oneOf(values.status, WORK_ORDER_STATUSES, 'work order status');
  const vendorId = values.vendorId === undefined ? undefined : Number(values.vendorId) || null;
  const cost = values.cost === undefined ? undefined : optionalCents(values.cost);
  return transaction(({ run, get }) => {
    const current = get('SELECT vendor_id, cost_cents FROM work_orders WHERE id = ?', [workOrderId]);
    if (!current) throw new Error('Work order not found');
    const nextVendor = vendorId === undefined ? current.vendor_id : vendorId;
    if ((status === 'assigned' || status === 'in_progress') && !nextVendor) {
      throw new Error('Assign a vendor first');
    }
    run(
      'UPDATE work_orders SET status = ?, vendor_id = ?, cost_cents = ?, completed_at = ? WHERE id = ?',
      [
        status,
        nextVendor,
        cost === undefined ? current.cost_cents : cost,
        status === 'completed' ? new Date().toISOString() : null,
        workOrderId,
      ]
    );
    return { message: 'Work order updated' };
  });
}

/* ---------- Applications ---------- */

export async function getApplications() {
  await requireAdmin();
  return query(
    `SELECT a.*, un.name AS unit_name, un.market_rent_cents, p.name AS property_name
     FROM applications a
     LEFT JOIN units un ON un.id = a.unit_id
     LEFT JOIN properties p ON p.id = un.property_id
     ORDER BY CASE a.status WHEN 'new' THEN 0 WHEN 'screening' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END, a.created_at DESC`
  );
}

export async function addApplication(values) {
  await requireAdmin();
  const email = optionalText(values.email);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address');
  return transaction(({ run }) => {
    run(
      `INSERT INTO applications (unit_id, first_name, last_name, email, phone, employer, monthly_income_cents, desired_move_in, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
      [
        Number(values.unitId) || null,
        requireText(values.firstName, 'First name'),
        requireText(values.lastName, 'Last name'),
        email,
        optionalText(values.phone),
        optionalText(values.employer),
        optionalCents(values.monthlyIncome),
        optionalText(values.desiredMoveIn),
        optionalText(values.notes),
        new Date().toISOString(),
      ]
    );
    return { message: 'Application recorded' };
  });
}

export async function setApplicationStatus(applicationId, status) {
  await requireAdmin();
  oneOf(status, APPLICATION_STATUSES, 'application status');
  return transaction(({ run }) => {
    if (!run('UPDATE applications SET status = ? WHERE id = ?', [status, applicationId])) {
      throw new Error('Application not found');
    }
    return { message: 'Application updated' };
  });
}

/** Approves an applicant and creates their tenant record so a lease can be written. */
export async function convertApplication(applicationId) {
  await requireAdmin();
  return transaction(({ run, get }) => {
    const app = get('SELECT * FROM applications WHERE id = ?', [applicationId]);
    if (!app) throw new Error('Application not found');
    if (app.tenant_id) return { tenantId: app.tenant_id, message: 'Already a tenant' };
    if (app.status === 'declined' || app.status === 'withdrawn') throw new Error('Reopen the application first');
    run(
      `INSERT INTO tenants (first_name, last_name, email, phone, employer, monthly_income_cents, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [app.first_name, app.last_name, app.email, app.phone, app.employer, app.monthly_income_cents, new Date().toISOString()]
    );
    const tenantId = get('SELECT last_insert_rowid() AS id').id;
    run("UPDATE applications SET tenant_id = ?, status = 'approved' WHERE id = ?", [tenantId, applicationId]);
    return { tenantId, message: `${app.first_name} ${app.last_name} is now a tenant` };
  });
}
