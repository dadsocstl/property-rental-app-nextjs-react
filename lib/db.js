import initSqlJs from 'sql.js';
import seedProperties from '@/properties.json';

const IDB_NAME = 'property-rental-sql';
const IDB_STORE = 'snapshots';
const IDB_KEY = 'main';
const SCHEMA_VERSION = 9;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  username TEXT NOT NULL,
  image TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  street TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  beds INTEGER NOT NULL,
  baths REAL NOT NULL,
  square_feet INTEGER NOT NULL,
  amenities TEXT NOT NULL DEFAULT '[]',
  rate_nightly REAL,
  rate_weekly REAL,
  rate_monthly REAL,
  seller_name TEXT,
  seller_email TEXT,
  seller_phone TEXT,
  images TEXT NOT NULL DEFAULT '[]',
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS properties_owner_idx ON properties(owner);
CREATE INDEX IF NOT EXISTS properties_created_idx ON properties(created_at);
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, property_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  body TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_recipient_idx ON messages(recipient, read);
CREATE TABLE IF NOT EXISTS session (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);
`;

function openIdb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readSnapshot() {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const request = idb.transaction(IDB_STORE).objectStore(IDB_STORE).get(IDB_KEY);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function writeSnapshot(bytes) {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function seedImagePath(image) {
  return /^(https?:|data:|\/)/.test(image) ? image : `/images/properties/${image}`;
}

function seed(db) {
  const now = new Date().toISOString();
  const owners = [...new Set(seedProperties.map((p) => String(p.owner)))];

  for (const owner of owners) {
    db.run(
      'INSERT INTO users (id, email, username, image, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?)',
      [`seed-host-${owner}`, `host${owner}@propertyrental.example`, `Host ${owner}`, now, now]
    );
  }

  seedProperties.forEach((p, index) => {
    db.run(
      `INSERT INTO properties (id, owner, name, type, description, street, city, state, zipcode,
        beds, baths, square_feet, amenities, rate_nightly, rate_weekly, rate_monthly,
        seller_name, seller_email, seller_phone, images, is_featured, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `seed-${index + 1}`,
        `seed-host-${p.owner}`,
        p.name,
        p.type,
        p.description ?? null,
        p.location?.street ?? null,
        p.location?.city ?? null,
        p.location?.state ?? null,
        p.location?.zipcode ?? null,
        p.beds,
        p.baths,
        p.square_feet,
        JSON.stringify(p.amenities ?? []),
        p.rates?.nightly ?? null,
        p.rates?.weekly ?? null,
        p.rates?.monthly ?? null,
        p.seller_info?.name ?? null,
        p.seller_info?.email ?? null,
        p.seller_info?.phone ?? null,
        JSON.stringify((p.images ?? []).map(seedImagePath)),
        p.is_featured ? 1 : 0,
        p.createdAt ?? now,
        p.updatedAt ?? now,
      ]
    );
  });
}

const DEMO_MESSAGES = [
  {
    body: 'Hi! Is this place available for the first two weeks of March? We are a family of four.',
    phone: '555-201-4410',
    read: 0,
    hoursAgo: 3,
  },
  {
    body: 'Are pets allowed? I have a small, very well-behaved dog.',
    phone: null,
    read: 0,
    hoursAgo: 26,
  },
  {
    body: 'Thanks for the quick reply earlier. Could we schedule a viewing this weekend?',
    phone: '555-201-4410',
    read: 1,
    hoursAgo: 72,
  },
];

// Hard-coded demo data so the dev accounts in lib/dev.js land on populated pages.
function seedDemo(db) {
  const now = Date.now();
  const iso = (hoursAgo = 0) => new Date(now - hoursAgo * 3600_000).toISOString();
  const hostId = 'seed-host-1';
  const renterId = 'seed-renter';

  db.run(
    'INSERT OR IGNORE INTO users (id, email, username, image, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?)',
    [renterId, 'riley@propertyrental.example', 'Riley Renter', iso(), iso()]
  );

  const ids = seedProperties.map((p, index) => ({ id: `seed-${index + 1}`, owner: String(p.owner) }));
  const hostListings = ids.filter((p) => p.owner === '1').map((p) => p.id);
  const otherListings = ids.filter((p) => p.owner !== '1').map((p) => p.id);

  DEMO_MESSAGES.forEach((message, index) => {
    const property = hostListings[index % hostListings.length];
    if (!property) return;
    db.run(
      `INSERT OR IGNORE INTO messages (id, sender, recipient, property, name, email, phone, body, read, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `seed-message-${index + 1}`,
        renterId,
        hostId,
        property,
        'Riley Renter',
        'riley@propertyrental.example',
        message.phone,
        message.body,
        message.read,
        iso(message.hoursAgo),
        iso(message.hoursAgo),
      ]
    );
  });

  for (const userId of [hostId, renterId]) {
    otherListings.slice(0, 3).forEach((property) => {
      db.run('INSERT OR IGNORE INTO bookmarks (user_id, property_id, created_at) VALUES (?, ?, ?)', [
        userId,
        property,
        iso(),
      ]);
    });
  }
}

// Property-management tables modelled on clawnify/OpenProperty. Money is stored in integer
// cents, and charge status is derived from payments at read time so it can never drift.
const MANAGEMENT_SCHEMA = `
CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bedrooms REAL NOT NULL DEFAULT 1,
  bathrooms REAL NOT NULL DEFAULT 1,
  sqft INTEGER,
  market_rent_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'vacant',
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS units_property_idx ON units(property_id);
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  emergency_contact TEXT,
  employer TEXT,
  monthly_income_cents INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS leases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  rent_cents INTEGER NOT NULL DEFAULT 0,
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  due_day INTEGER NOT NULL DEFAULT 1,
  late_fee_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS leases_unit_idx ON leases(unit_id, status);
CREATE TABLE IF NOT EXISTS rent_charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lease_id INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  waived INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS rent_charges_lease_period_idx ON rent_charges(lease_id, period);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  charge_id INTEGER NOT NULL REFERENCES rent_charges(id) ON DELETE CASCADE,
  paid_on TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'ach',
  reference TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS payments_charge_idx ON payments(charge_id);
CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  phone TEXT,
  email TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  cost_cents INTEGER,
  completed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS work_orders_status_idx ON work_orders(status);
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  employer TEXT,
  monthly_income_cents INTEGER,
  desired_move_in TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);
`;

const pad = (n) => String(n).padStart(2, '0');
const ymd = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthOffset = (offset) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
};

const DEMO_TENANTS = [
  ['Maya', 'Okafor', 'Northside Clinic', 9800],
  ['Daniel', 'Reyes', 'Harbor Logistics', 8200],
  ['Priya', 'Natarajan', 'Self-employed', 11500],
  ['Tom', 'Becker', 'City Schools', 6400],
  ['Lena', 'Hoffmann', 'Brightline Studio', 7900],
  ['Marcus', 'Bell', 'Union Rail', 7100],
  ['Sofia', 'Marin', 'Pinecrest Bank', 10200],
  ['Jonah', 'Park', 'Freelance', 5600],
  ['Ruth', 'Adeyemi', 'County Hospital', 9300],
];

function seedManagement(db) {
  const now = new Date().toISOString();
  const today = new Date();
  const listings = db.exec(
    "SELECT id, type, beds, baths, square_feet, rate_monthly, rate_weekly, rate_nightly FROM properties WHERE id LIKE 'seed-%' ORDER BY created_at"
  )[0];
  if (!listings) return;

  const unitIds = [];
  for (const [id, type, beds, baths, sqft, monthly, weekly, nightly] of listings.values) {
    const base = monthly ?? (weekly ? weekly * 4.3 : nightly ? nightly * 30 : 2000);
    const rent = Math.round(base / 25) * 25;
    const names = type === 'Apartment' || type === 'Condo' ? ['Unit A', 'Unit B'] : ['Main residence'];
    names.forEach((name, i) => {
      const unitRent = names.length > 1 ? Math.round((rent * (i ? 0.85 : 1)) / 25) * 25 : rent;
      db.run(
        `INSERT INTO units (property_id, name, bedrooms, bathrooms, sqft, market_rent_cents, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'vacant', ?)`,
        [id, name, beds, baths, names.length > 1 ? Math.round(sqft * 0.55) : sqft, unitRent * 100, now]
      );
      unitIds.push({ id: db.exec('SELECT last_insert_rowid()')[0].values[0][0], rent: unitRent });
    });
  }

  const tenantIds = DEMO_TENANTS.map(([first, last, employer, income]) => {
    db.run(
      `INSERT INTO tenants (first_name, last_name, email, phone, employer, monthly_income_cents, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        first,
        last,
        `${first}.${last}@example.com`.toLowerCase(),
        `555-01${pad(DEMO_TENANTS.findIndex((t) => t[0] === first) + 10)}`,
        employer,
        income * 100,
        now,
      ]
    );
    return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  });

  // Leave the last few units vacant/turnover so occupancy and applications have something to show.
  const leased = unitIds.slice(0, tenantIds.length);
  leased.forEach((unit, i) => {
    const start = monthOffset(-(4 + i * 2));
    const end = i === 1 ? new Date(today.getFullYear(), today.getMonth() + 1, 15) : monthOffset(12 - i);
    db.run(
      `INSERT INTO leases (unit_id, tenant_id, start_date, end_date, rent_cents, deposit_cents, due_day, late_fee_cents, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, 7500, 'active', ?)`,
      [unit.id, tenantIds[i], ymd(start), ymd(end), unit.rent * 100, unit.rent * 100, now]
    );
    const leaseId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    db.run("UPDATE units SET status = 'occupied' WHERE id = ?", [unit.id]);

    for (let offset = -2; offset <= 0; offset++) {
      const month = monthOffset(offset);
      const period = `${month.getFullYear()}-${pad(month.getMonth() + 1)}`;
      db.run(
        'INSERT INTO rent_charges (lease_id, period, due_date, amount_cents, created_at) VALUES (?, ?, ?, ?, ?)',
        [leaseId, period, ymd(month), unit.rent * 100, now]
      );
      const chargeId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
      // Current month: some paid, one partial, a few still owing. Past months: paid, except one tenant in arrears.
      let paid = unit.rent * 100;
      if (offset === 0) paid = i % 3 === 0 ? 0 : i === 4 ? Math.round(paid / 2) : paid;
      if (offset === -1 && i === 6) paid = 0;
      if (paid > 0) {
        db.run(
          'INSERT INTO payments (charge_id, paid_on, amount_cents, method, reference, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [chargeId, ymd(new Date(month.getFullYear(), month.getMonth(), 2 + (i % 4))), paid, i % 2 ? 'check' : 'ach', i % 2 ? `CHK-${1040 + i}` : null, now]
        );
      }
    }
  });
  if (unitIds.length > leased.length) {
    db.run("UPDATE units SET status = 'turnover' WHERE id = ?", [unitIds[unitIds.length - 1].id]);
  }

  const vendors = [
    ['Rapid Rooter Plumbing', 'plumber', '555-0300'],
    ['Volt Electric Co.', 'electrician', '555-0301'],
    ['Coolbreeze HVAC', 'hvac', '555-0302'],
    ['Handy Hank', 'handyman', '555-0303'],
  ].map(([name, category, phone]) => {
    db.run('INSERT INTO vendors (name, category, phone, created_at) VALUES (?, ?, ?, ?)', [name, category, phone, now]);
    return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  });

  [
    ['Kitchen sink leaking under cabinet', 'urgent', 'assigned', 0, 0],
    ['Furnace makes a grinding noise', 'high', 'in_progress', 2, 2],
    ['Bedroom outlet not working', 'normal', 'open', 3, null],
    ['Repaint hallway before move-in', 'low', 'open', leased.length, 3],
    ['Replace bathroom fan', 'normal', 'completed', 5, 3],
  ].forEach(([title, priority, status, unitIndex, vendorIndex]) => {
    const unit = unitIds[unitIndex] ?? unitIds[0];
    db.run(
      `INSERT INTO work_orders (unit_id, tenant_id, vendor_id, title, priority, status, cost_cents, completed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        unit.id,
        tenantIds[unitIndex] ?? null,
        vendorIndex === null ? null : vendors[vendorIndex],
        title,
        priority,
        status,
        status === 'completed' ? 18500 : null,
        status === 'completed' ? now : null,
        now,
      ]
    );
  });

  const vacant = unitIds.slice(leased.length);
  [
    ['Ava', 'Lindqvist', 'Coastal Design', 8800, 'new'],
    ['Omar', 'Haddad', 'Metro Transit', 6900, 'screening'],
    ['Grace', 'Liu', 'Riverside Labs', 12000, 'approved'],
  ].forEach(([first, last, employer, income, status], i) => {
    db.run(
      `INSERT INTO applications (unit_id, first_name, last_name, email, employer, monthly_income_cents, desired_move_in, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vacant[i % Math.max(vacant.length, 1)]?.id ?? null,
        first,
        last,
        `${first}.${last}@example.com`.toLowerCase(),
        employer,
        income * 100,
        ymd(monthOffset(1)),
        status,
        now,
      ]
    );
  });
}

// Links the "Riley Renter" dev account to a real lease so the renter dashboard has data to pay.
function seedRenterDemo(db) {
  const email = 'riley@propertyrental.example';
  if (db.exec('SELECT 1 FROM tenants WHERE lower(email) = ?', [email])[0]) return;
  const unit = db.exec(
    `SELECT u.id, u.market_rent_cents FROM units u
     WHERE NOT EXISTS (SELECT 1 FROM leases l WHERE l.unit_id = u.id AND l.status = 'active')
     ORDER BY u.id LIMIT 1`
  )[0]?.values[0];
  if (!unit) return;
  const [unitId, rentCents] = unit;
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO tenants (first_name, last_name, email, phone, employer, monthly_income_cents, created_at)
     VALUES ('Riley', 'Renter', ?, '555-0190', 'Lakeshore Design', 780000, ?)`,
    [email, now]
  );
  const tenantId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  db.run(
    `INSERT INTO leases (unit_id, tenant_id, start_date, end_date, rent_cents, deposit_cents, due_day, late_fee_cents, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 7500, 'active', ?)`,
    [unitId, tenantId, ymd(monthOffset(-5)), ymd(monthOffset(7)), rentCents, rentCents, now]
  );
  const leaseId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  db.run("UPDATE units SET status = 'occupied' WHERE id = ?", [unitId]);

  // Two months back paid in full, last month half paid, this month still owing.
  [-2, -1, 0].forEach((offset) => {
    const month = monthOffset(offset);
    const period = `${month.getFullYear()}-${pad(month.getMonth() + 1)}`;
    db.run('INSERT INTO rent_charges (lease_id, period, due_date, amount_cents, created_at) VALUES (?, ?, ?, ?, ?)', [
      leaseId,
      period,
      ymd(month),
      rentCents,
      now,
    ]);
    const chargeId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    const paid = offset === -2 ? rentCents : offset === -1 ? Math.round(rentCents / 2) : 0;
    if (paid > 0) {
      db.run('INSERT INTO payments (charge_id, paid_on, amount_cents, method, reference, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
        chargeId,
        ymd(new Date(month.getFullYear(), month.getMonth(), 3)),
        paid,
        'ach',
        null,
        now,
      ]);
    }
  });
}

const TICKET_SCHEMA = `
CREATE TABLE IF NOT EXISTS work_order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL DEFAULT 'system',
  author_name TEXT,
  kind TEXT NOT NULL DEFAULT 'comment',
  body TEXT,
  internal INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS work_order_events_order_idx ON work_order_events(work_order_id);
`;

/** Adds the per-ticket activity log and visit scheduling, and backfills a history for existing tickets. */
function migrateTickets(db) {
  db.exec(TICKET_SCHEMA);
  const columns = db.exec('PRAGMA table_info(work_orders)')[0]?.values.map((col) => col[1]) ?? [];
  if (!columns.includes('scheduled_for')) db.exec('ALTER TABLE work_orders ADD COLUMN scheduled_for TEXT');

  const orders = db.exec(
    `SELECT w.id, w.title, w.status, w.tenant_id, w.created_at, w.completed_at, v.name
     FROM work_orders w LEFT JOIN vendors v ON v.id = w.vendor_id`
  )[0]?.values ?? [];
  const after = (iso, hours) => new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();
  const log = (orderId, role, name, kind, body, createdAt, internal = 0) =>
    db.run(
      `INSERT INTO work_order_events (work_order_id, author_role, author_name, kind, body, internal, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, role, name, kind, body, internal, createdAt]
    );

  orders.forEach(([id, title, status, tenantId, createdAt, completedAt, vendorName]) => {
    log(id, tenantId ? 'renter' : 'landlord', tenantId ? 'Tenant' : 'Management', 'created', 'Ticket submitted', createdAt);
    if (vendorName && status !== 'open') {
      log(id, 'landlord', 'Management', 'assigned', `Assigned to ${vendorName}`, after(createdAt, 3));
    }
    if (status === 'in_progress') {
      log(id, 'landlord', 'Management', 'status', 'Status changed to in progress', after(createdAt, 20));
    }
    if (status === 'completed') {
      log(id, 'landlord', 'Management', 'status', 'Status changed to completed', completedAt ?? after(createdAt, 48));
    }
    if (title === 'Bathroom faucet drips constantly') {
      log(id, 'landlord', 'Management', 'comment', 'Thanks for flagging this. Our plumber will stop by this week to replace the cartridge.', after(createdAt, 4));
      log(id, 'renter', 'Tenant', 'comment', 'Great, I am home most afternoons.', after(createdAt, 6));
      log(id, 'landlord', 'Management', 'comment', 'Parts quote approved; vendor has a 2-hour window booked.', after(createdAt, 8), 1);
    }
  });
}

function seedRenterWorkOrders(db) {
  const row = db.exec(
    `SELECT t.id, l.unit_id FROM tenants t JOIN leases l ON l.tenant_id = t.id AND l.status = 'active'
     WHERE lower(t.email) = 'riley@propertyrental.example' LIMIT 1`
  )[0]?.values[0];
  if (!row) return;
  const [tenantId, unitId] = row;
  const vendorId = db.exec('SELECT id FROM vendors ORDER BY id LIMIT 1')[0]?.values[0][0] ?? null;
  const daysAgo = (days) => new Date(Date.now() - days * 86_400_000).toISOString();
  [
    ['Bathroom faucet drips constantly', 'Started last week; the cold tap will not fully shut off.', 'normal', 'in_progress', vendorId, null, 4],
    ['Smoke detector chirping in hallway', 'Low-battery chirp every minute.', 'high', 'completed', vendorId, daysAgo(10), 14],
    ['Front door lock sticks', 'Key needs jiggling to turn.', 'low', 'open', null, null, 1],
  ].forEach(([title, description, priority, status, vendor, completedAt, age]) => {
    db.run(
      `INSERT INTO work_orders (unit_id, tenant_id, vendor_id, title, description, priority, status, completed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [unitId, tenantId, vendor, title, description, priority, status, completedAt, daysAgo(age)]
    );
  });
}

/** Adds listing publication state and the date a unit last changed status (used for days-vacant). */
function migrateListings(db) {
  const columnsOf = (table) => db.exec(`PRAGMA table_info(${table})`)[0]?.values.map((col) => col[1]) ?? [];
  if (!columnsOf('properties').includes('listing_status')) {
    db.exec("ALTER TABLE properties ADD COLUMN listing_status TEXT NOT NULL DEFAULT 'published'");
  }
  if (!columnsOf('units').includes('status_changed_at')) {
    db.exec('ALTER TABLE units ADD COLUMN status_changed_at TEXT');
  }
  db.exec('UPDATE units SET status_changed_at = created_at WHERE status_changed_at IS NULL');

  // Give the seeded vacancies believable, differing ages so the vacancy report has something to rank.
  const vacancies = db.exec("SELECT id FROM units WHERE status IN ('vacant', 'turnover') ORDER BY id")[0]?.values ?? [];
  vacancies.forEach(([id], index) => {
    const daysAgo = [47, 21, 9, 33, 14, 62][index % 6];
    db.run('UPDATE units SET status_changed_at = ? WHERE id = ?', [
      new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
      id,
    ]);
  });

  db.run(
    `UPDATE properties SET listing_status = 'draft'
     WHERE id = (SELECT id FROM properties WHERE is_featured = 0 AND owner = 'seed-host-1' ORDER BY created_at LIMIT 1)`
  );
}

const CRM_SCHEMA = `
CREATE TABLE IF NOT EXISTS crm_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  stage TEXT NOT NULL DEFAULT 'new',
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  budget_cents INTEGER,
  desired_move_in TEXT,
  notes TEXT,
  follow_up_on TEXT,
  last_contacted_at TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  verification_method TEXT,
  verification_json TEXT,
  verified_at TEXT,
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS crm_leads_stage_idx ON crm_leads(stage);
CREATE TABLE IF NOT EXISTS crm_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'note',
  body TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS crm_activities_lead_idx ON crm_activities(lead_id);
`;

/** Adds the leads pipeline and its activity timeline, with a handful of prospects to work from. */
function migrateCrm(db) {
  db.exec(CRM_SCHEMA);
  if (db.exec('SELECT COUNT(*) FROM crm_leads')[0].values[0][0] > 0) return;

  const units = db.exec("SELECT id FROM units WHERE status IN ('vacant', 'turnover') ORDER BY id")[0]?.values ?? [];
  const unitAt = (i) => (units.length ? units[i % units.length][0] : null);
  const ago = (days, hours = 0) => new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();
  const inDays = (days) => ymd(new Date(Date.now() + days * 86_400_000));

  // [first, last, email, phone, source, stage, budget, followUpDays, createdDaysAgo, [[kind, body, daysAgo]]]
  const leads = [
    ['Mei', 'Tanaka', 'mei.tanaka@example.com', '555-0141', 'website', 'new', 2400, 0, 1, [['note', 'Enquired through the listing contact form about a 2 bedroom.', 1]]],
    ['Jonah', 'Whitfield', 'jonah.whitfield@example.com', '555-0152', 'referral', 'contacted', 3100, 2, 5, [
      ['note', 'Referred by a current tenant. Relocating for work in March.', 5],
      ['call', 'Left a voicemail and sent the availability sheet.', 3],
    ]],
    ['Priya', 'Raman', 'priya.raman@example.com', '555-0163', 'website', 'tour', 2750, -1, 9, [
      ['call', 'Confirmed interest in a pet-friendly unit.', 8],
      ['tour', 'Tour booked for Saturday 10:30.', 4],
    ]],
    ['Dmitri', 'Volkov', 'dmitri.volkov@example.com', '555-0174', 'walk-in', 'applied', 3500, 3, 14, [
      ['tour', 'Toured the unit with his partner. Wants to move quickly.', 11],
      ['note', 'Application received; awaiting identity check.', 6],
    ]],
    ['Sofia', 'Marin', 'sofia.marin@example.com', '555-0185', 'listing site', 'contacted', 1900, 5, 7, [['email', 'Sent the studio floor plan and pricing.', 6]]],
    ['Callum', 'Reid', 'callum.reid@example.com', '555-0196', 'website', 'lost', 1600, null, 21, [
      ['call', 'Budget is below our lowest rent.', 18],
      ['note', 'Closed as lost: budget mismatch.', 18],
    ]],
  ];

  leads.forEach(([first, last, email, phone, source, stage, budget, followUp, created, activities], i) => {
    db.run(
      `INSERT INTO crm_leads (first_name, last_name, email, phone, source, stage, unit_id, budget_cents, desired_move_in, follow_up_on, last_contacted_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first, last, email, phone, source, stage, unitAt(i), budget * 100, inDays(30 + i * 7),
        followUp === null ? null : inDays(followUp),
        activities.length ? ago(activities[activities.length - 1][2]) : null,
        ago(created),
      ]
    );
    const leadId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    activities.forEach(([kind, body, days]) =>
      db.run('INSERT INTO crm_activities (lead_id, kind, body, created_at) VALUES (?, ?, ?, ?)', [leadId, kind, body, ago(days)])
    );
  });
}

function migrate(db) {
  const version = db.exec('PRAGMA user_version')[0].values[0][0];
  if (version >= SCHEMA_VERSION) return false;
  db.exec('BEGIN');
  db.exec(SCHEMA);
  if (version === 0) seed(db);
  if (version < 2) seedDemo(db);
  if (version < 3) {
    db.exec(MANAGEMENT_SCHEMA);
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
    db.run("UPDATE users SET role = 'admin' WHERE id = 'seed-host-1'");
    seedManagement(db);
  }
  if (version < 4) {
    // Repairs snapshots persisted at v3 by an intermediate build that lacked parts of the v3 step.
    const userColumns = db.exec('PRAGMA table_info(users)')[0]?.values.map((col) => col[1]) ?? [];
    if (!userColumns.includes('role')) {
      db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
    }
    db.exec(MANAGEMENT_SCHEMA);
    if (db.exec('SELECT COUNT(*) FROM units')[0].values[0][0] === 0) seedManagement(db);
    db.run("UPDATE users SET role = 'admin' WHERE id = 'seed-host-1'");
  }
  if (version < 5) seedRenterDemo(db);
  if (version < 6) seedRenterWorkOrders(db);
  if (version < 7) migrateTickets(db);
  if (version < 8) migrateListings(db);
  if (version < 9) migrateCrm(db);
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  db.exec('COMMIT');
  return true;
}

let dbPromise = null;
let persistQueue = Promise.resolve();

async function openDatabase() {
  // The browser build requests sql-wasm-browser.wasm; it is byte-identical to the copy in public/.
  const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
  const snapshot = await readSnapshot();
  const db = snapshot ? new SQL.Database(snapshot) : new SQL.Database();
  db.exec('PRAGMA foreign_keys = ON');
  if (migrate(db)) await persist(db);
  return db;
}

function getDb() {
  if (typeof window === 'undefined') {
    throw new Error('The browser SQL database is only available in the browser.');
  }
  // Hot reloads re-evaluate this module; caching on window keeps a single WebAssembly
  // instance per tab instead of leaking one per edit until the browser runs out of memory.
  dbPromise ??= window.__propertyRentalDb ?? null;
  if (!dbPromise) {
    dbPromise = openDatabase().catch((error) => {
      dbPromise = null;
      window.__propertyRentalDb = null;
      throw error;
    });
    window.__propertyRentalDb = dbPromise;
  }
  return dbPromise;
}

function persist(db) {
  // export() resets connection pragmas, so foreign keys are re-enabled afterwards.
  const bytes = db.export();
  db.exec('PRAGMA foreign_keys = ON');
  persistQueue = persistQueue.then(() => writeSnapshot(bytes));
  return persistQueue;
}

export async function query(sql, params = []) {
  const db = await getDb();
  const statement = db.prepare(sql);
  try {
    statement.bind(params);
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

/** Runs `work` inside a transaction and saves the database to IndexedDB on success. */
export async function transaction(work) {
  const db = await getDb();
  const run = (sql, params = []) => {
    db.run(sql, params);
    return db.getRowsModified();
  };
  const get = (sql, params = []) => {
    const statement = db.prepare(sql);
    try {
      statement.bind(params);
      return statement.step() ? statement.getAsObject() : null;
    } finally {
      statement.free();
    }
  };

  db.exec('BEGIN');
  let result;
  try {
    result = await work({ run, get });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  await persist(db);
  return result;
}
