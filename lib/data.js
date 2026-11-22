import { query, queryOne, transaction } from '@/lib/db';

const PROPERTY_COLUMNS = 'p.*';

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toProperty(row) {
  if (!row) return null;
  return {
    _id: row.id,
    owner: row.owner,
    name: row.name,
    type: row.type,
    description: row.description ?? '',
    location: {
      street: row.street ?? '',
      city: row.city ?? '',
      state: row.state ?? '',
      zipcode: row.zipcode ?? '',
    },
    beds: row.beds,
    baths: row.baths,
    square_feet: row.square_feet,
    amenities: parseJsonArray(row.amenities),
    rates: {
      nightly: row.rate_nightly ?? undefined,
      weekly: row.rate_weekly ?? undefined,
      monthly: row.rate_monthly ?? undefined,
    },
    seller_info: {
      name: row.seller_name ?? '',
      email: row.seller_email ?? '',
      phone: row.seller_phone ?? '',
    },
    images: parseJsonArray(row.images),
    is_featured: Boolean(row.is_featured),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.username,
    email: row.email,
    image: row.image ?? null,
    role: row.role ?? 'user',
  };
}

function requireUser(userId) {
  if (!userId) throw new Error('You must be signed in to do that');
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/* ---------- Session ---------- */

export async function getSessionUser() {
  const row = await queryOne(
    'SELECT u.* FROM session s JOIN users u ON u.id = s.user_id WHERE s.id = 1'
  );
  return toUser(row);
}

export async function signIn({ username, email }) {
  const name = String(username ?? '').trim().slice(0, 20);
  const address = String(email ?? '').trim().toLowerCase();
  if (!name) throw new Error('Name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error('Enter a valid email');

  return transaction(({ run, get }) => {
    let user = get('SELECT * FROM users WHERE email = ?', [address]);
    if (!user) {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      run(
        'INSERT INTO users (id, email, username, image, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?)',
        [id, address, name, now, now]
      );
      user = get('SELECT * FROM users WHERE id = ?', [id]);
    }
    run('INSERT INTO session (id, user_id) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id', [
      user.id,
    ]);
    return toUser(user);
  });
}

export async function updateProfile(userId, { name, email }) {
  requireUser(userId);
  const nextName = String(name ?? '').trim().slice(0, 20);
  const nextEmail = String(email ?? '').trim().toLowerCase();
  if (!nextName) throw new Error('Name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) throw new Error('Enter a valid email');

  return transaction(({ run, get }) => {
    const current = get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!current) throw new Error('Account not found');

    const taken = get('SELECT id FROM users WHERE email = ? AND id != ?', [nextEmail, userId]);
    if (taken) throw new Error('That email is already used by another account');

    const now = new Date().toISOString();
    run('UPDATE users SET username = ?, email = ?, updated_at = ? WHERE id = ?', [
      nextName,
      nextEmail,
      now,
      userId,
    ]);

    // The renter portal links an account to its lease by email, so keep the tenant record in step.
    if (current.email.toLowerCase() !== nextEmail) {
      run('UPDATE tenants SET email = ? WHERE lower(email) = lower(?)', [nextEmail, current.email]);
    }

    return toUser(get('SELECT * FROM users WHERE id = ?', [userId]));
  });
}

export async function signOut() {
  await transaction(({ run }) => run('DELETE FROM session'));
}

/* ---------- Properties ---------- */

export async function getProperties({ page = 1, pageSize = 9 } = {}) {
  const size = Math.max(1, Math.min(50, Number(pageSize) || 9));
  const current = Math.max(1, Number(page) || 1);
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM properties');
  const rows = await query(
    `SELECT ${PROPERTY_COLUMNS} FROM properties p ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [size, (current - 1) * size]
  );
  return { total, properties: rows.map(toProperty) };
}

export async function getRecentProperties(limit = 3) {
  const rows = await query(
    `SELECT ${PROPERTY_COLUMNS} FROM properties p ORDER BY p.created_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map(toProperty);
}

export async function getFeaturedProperties() {
  const rows = await query(
    `SELECT ${PROPERTY_COLUMNS} FROM properties p WHERE p.is_featured = 1 ORDER BY p.created_at DESC`
  );
  return rows.map(toProperty);
}

export async function getPropertyById(id) {
  return toProperty(await queryOne(`SELECT ${PROPERTY_COLUMNS} FROM properties p WHERE p.id = ?`, [id]));
}

export async function searchProperties({ location = '', propertyType = 'All' } = {}) {
  const pattern = `%${escapeLike(String(location).trim())}%`;
  const params = Array(6).fill(pattern);
  let sql = `SELECT ${PROPERTY_COLUMNS} FROM properties p WHERE (
    p.name LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\' OR p.street LIKE ? ESCAPE '\\'
    OR p.city LIKE ? ESCAPE '\\' OR p.state LIKE ? ESCAPE '\\' OR p.zipcode LIKE ? ESCAPE '\\')`;
  if (propertyType && propertyType !== 'All') {
    sql += ' AND p.type = ? COLLATE NOCASE';
    params.push(propertyType);
  }
  sql += ' ORDER BY p.created_at DESC';
  return (await query(sql, params)).map(toProperty);
}

export async function getPropertiesByOwner(userId) {
  requireUser(userId);
  const rows = await query(
    `SELECT ${PROPERTY_COLUMNS} FROM properties p WHERE p.owner = ? ORDER BY p.created_at DESC`,
    [userId]
  );
  return rows.map(toProperty);
}

function propertyParams(data) {
  return [
    data.name,
    data.type,
    data.description,
    data.location.street,
    data.location.city,
    data.location.state,
    data.location.zipcode,
    data.beds,
    data.baths,
    data.square_feet,
    JSON.stringify(data.amenities),
    data.rates.nightly,
    data.rates.weekly,
    data.rates.monthly,
    data.seller_info.name,
    data.seller_info.email,
    data.seller_info.phone,
  ];
}

export async function addProperty(userId, data) {
  requireUser(userId);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await transaction(({ run }) =>
    run(
      `INSERT INTO properties (name, type, description, street, city, state, zipcode,
        beds, baths, square_feet, amenities, rate_nightly, rate_weekly, rate_monthly,
        seller_name, seller_email, seller_phone, images, id, owner, is_featured, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [...propertyParams(data), JSON.stringify(data.images), id, userId, now, now]
    )
  );
  return id;
}

export async function updateProperty(userId, propertyId, data) {
  requireUser(userId);
  await transaction(({ run, get }) => {
    const existing = get('SELECT owner FROM properties WHERE id = ?', [propertyId]);
    if (!existing) throw new Error('Property not found');
    if (existing.owner !== userId) throw new Error('You do not own this property');
    run(
      `UPDATE properties SET name = ?, type = ?, description = ?, street = ?, city = ?, state = ?,
        zipcode = ?, beds = ?, baths = ?, square_feet = ?, amenities = ?, rate_nightly = ?,
        rate_weekly = ?, rate_monthly = ?, seller_name = ?, seller_email = ?, seller_phone = ?,
        updated_at = ?
       WHERE id = ? AND owner = ?`,
      [...propertyParams(data), new Date().toISOString(), propertyId, userId]
    );
  });
}

export async function deleteProperty(userId, propertyId) {
  requireUser(userId);
  await transaction(({ run, get }) => {
    const existing = get('SELECT owner FROM properties WHERE id = ?', [propertyId]);
    if (!existing) throw new Error('Property not found');
    if (existing.owner !== userId) throw new Error('You do not own this property');
    run('DELETE FROM properties WHERE id = ? AND owner = ?', [propertyId, userId]);
  });
}

/* ---------- Bookmarks ---------- */

export async function isBookmarked(userId, propertyId) {
  if (!userId) return false;
  const row = await queryOne('SELECT 1 AS hit FROM bookmarks WHERE user_id = ? AND property_id = ?', [
    userId,
    propertyId,
  ]);
  return Boolean(row);
}

export async function toggleBookmark(userId, propertyId) {
  requireUser(userId);
  return transaction(({ run }) => {
    const removed = run('DELETE FROM bookmarks WHERE user_id = ? AND property_id = ?', [userId, propertyId]);
    if (removed > 0) return { isBookmarked: false, message: 'Bookmark removed successfully' };
    run('INSERT INTO bookmarks (user_id, property_id, created_at) VALUES (?, ?, ?)', [
      userId,
      propertyId,
      new Date().toISOString(),
    ]);
    return { isBookmarked: true, message: 'Bookmark added successfully' };
  });
}

export async function getBookmarkedProperties(userId) {
  requireUser(userId);
  const rows = await query(
    `SELECT ${PROPERTY_COLUMNS} FROM bookmarks b JOIN properties p ON p.id = b.property_id
     WHERE b.user_id = ? ORDER BY b.created_at DESC`,
    [userId]
  );
  return rows.map(toProperty);
}

/* ---------- Messages ---------- */

export async function addMessage(senderId, { propertyId, name, email, phone, body }) {
  requireUser(senderId);
  if (!String(name ?? '').trim()) throw new Error('Name is required');
  if (!String(email ?? '').trim()) throw new Error('Email is required');

  await transaction(({ run, get }) => {
    const property = get('SELECT owner FROM properties WHERE id = ?', [propertyId]);
    if (!property) throw new Error('Property not found');
    if (property.owner === senderId) throw new Error('You can not send a message to yourself');
    const now = new Date().toISOString();
    run(
      `INSERT INTO messages (id, sender, recipient, property, name, email, phone, body, read, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [crypto.randomUUID(), senderId, property.owner, propertyId, name.trim(), email.trim(), phone || null, body || null, now, now]
    );
  });
}

export async function getMessages(userId) {
  requireUser(userId);
  const rows = await query(
    `SELECT m.*, u.username AS sender_username, p.name AS property_name
     FROM messages m
     JOIN users u ON u.id = m.sender
     JOIN properties p ON p.id = m.property
     WHERE m.recipient = ?
     ORDER BY m.read ASC, m.created_at DESC`,
    [userId]
  );
  return rows.map((row) => ({
    _id: row.id,
    sender: { _id: row.sender, username: row.sender_username },
    property: { _id: row.property, name: row.property_name },
    name: row.name,
    email: row.email,
    phone: row.phone ?? '',
    body: row.body ?? '',
    read: Boolean(row.read),
    createdAt: row.created_at,
  }));
}

export async function getUnreadMessageCount(userId) {
  if (!userId) return 0;
  const row = await queryOne('SELECT COUNT(*) AS count FROM messages WHERE recipient = ? AND read = 0', [userId]);
  return row.count;
}

export async function toggleMessageRead(userId, messageId) {
  requireUser(userId);
  return transaction(({ run, get }) => {
    const message = get('SELECT read FROM messages WHERE id = ? AND recipient = ?', [messageId, userId]);
    if (!message) throw new Error('Message not found');
    const read = message.read ? 0 : 1;
    run('UPDATE messages SET read = ?, updated_at = ? WHERE id = ? AND recipient = ?', [
      read,
      new Date().toISOString(),
      messageId,
      userId,
    ]);
    return Boolean(read);
  });
}

export async function deleteMessage(userId, messageId) {
  requireUser(userId);
  await transaction(({ run }) => {
    const removed = run('DELETE FROM messages WHERE id = ? AND recipient = ?', [messageId, userId]);
    if (removed === 0) throw new Error('Message not found');
  });
}
