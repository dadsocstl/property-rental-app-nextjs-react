import ReceiptDocument from '@/components/renter/ReceiptDocument';

export const COMPANY = 'Timeless Carat Properties';

/** Fixed example data behind the "Sample receipt" button so a PDF can be previewed before any rent is paid. */
export function sampleReceiptData() {
  const today = new Date();
  const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const paidOn = today.toISOString();
  return {
    number: 'SAMPLE-00001',
    company: COMPANY,
    tenantName: 'Riley Renter',
    email: 'riley@propertyrental.example',
    property: 'Maple Court Apartments',
    unit: 'Unit 2B',
    charge: { period, amount_cents: 185000, paid_cents: 185000, balance_cents: 0 },
    payments: [
      { paid_on: paidOn, method: 'ach', reference: 'DEMO-ACH-4F7A21', amount_cents: 100000 },
      { paid_on: paidOn, method: 'card', reference: 'DEMO-CARD-9B3C58', amount_cents: 85000 },
    ],
    issuedOn: paidOn,
    demo: true,
  };
}

/**
 * Renders the receipt with @react-pdf/renderer and downloads it.
 * The renderer is large, so it is only loaded when someone actually asks for a PDF.
 */
export async function downloadReceipt(data, filename) {
  const { pdf } = await import('@react-pdf/renderer');
  const blob = await pdf(<ReceiptDocument {...data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
