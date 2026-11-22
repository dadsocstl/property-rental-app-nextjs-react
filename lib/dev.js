// Demo-only: in `next dev` the app signs in as a seeded account so every page is reachable
// without the login flow. Production builds never take this path.
// Set NEXT_PUBLIC_DISABLE_DEV_BYPASS=true to test the real sign-in flow locally.
export const DEV_BYPASS =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DISABLE_DEV_BYPASS !== 'true';

export const DEV_ACCOUNTS = [
  {
    username: 'Host 1',
    email: 'host1@propertyrental.example',
    role: 'Host · owns listings, has messages',
  },
  {
    username: 'Host 2',
    email: 'host2@propertyrental.example',
    role: 'Host · owns listings',
  },
  {
    username: 'Riley Renter',
    email: 'riley@propertyrental.example',
    role: 'Renter · no listings',
  },
];

export const DEFAULT_DEV_ACCOUNT = DEV_ACCOUNTS[0];

const SIGNED_OUT_KEY = 'property-rental.dev-signed-out';

export function devSignedOut() {
  try {
    return sessionStorage.getItem(SIGNED_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDevSignedOut(value) {
  try {
    if (value) sessionStorage.setItem(SIGNED_OUT_KEY, '1');
    else sessionStorage.removeItem(SIGNED_OUT_KEY);
  } catch {}
}
