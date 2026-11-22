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
function nameMatches(lead, ownerNames) {
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
