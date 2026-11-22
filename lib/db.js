import initSqlJs from 'sql.js';
import seedProperties from '@/properties.json';

const IDB_NAME = 'property-rental-sql';
const IDB_STORE = 'snapshots';
const IDB_KEY = 'main';
const SCHEMA_VERSION = 1;

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

function migrate(db) {
  const version = db.exec('PRAGMA user_version')[0].values[0][0];
  if (version >= SCHEMA_VERSION) return false;
  db.exec('BEGIN');
  db.exec(SCHEMA);
  if (version === 0) seed(db);
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
  if (!dbPromise) {
    dbPromise = openDatabase().catch((error) => {
      dbPromise = null;
      throw error;
    });
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
