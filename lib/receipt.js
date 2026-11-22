const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;

const METHOD_LABELS = { ach: 'Bank transfer (ACH)', card: 'Card', check: 'Check', cash: 'Cash', other: 'Other' };

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dollars = (cents) => usd.format((cents ?? 0) / 100);

function longDate(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function monthName(period) {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// The built-in PDF fonts only cover Latin-1, so anything else is flattened to plain ASCII.
function pdfText(value) {
  return String(value ?? '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

// Approximate Helvetica advance widths; exact enough to right-align figures.
function textWidth(text, size, bold) {
  let units = 0;
  for (const ch of String(text)) {
    if (/[0-9$]/.test(ch)) units += 0.556;
    else if (/[ ,.:;'|!i]/.test(ch)) units += 0.278;
    else if (/[MW]/.test(ch)) units += 0.83;
    else units += bold ? 0.58 : 0.54;
  }
  return units * size;
}

function truncate(text, maxWidth, size) {
  let out = String(text ?? '');
  while (out.length > 1 && textWidth(out, size) > maxWidth) out = out.slice(0, -2).trimEnd() + '…';
  return out;
}

function buildPdf(ops) {
  const content = ops.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}

/**
 * Builds a one-page PDF receipt.
 * `payments` is the list of payments the receipt covers; the totals reflect the whole charge.
 */
export function buildReceiptPdf({ number, company, tenantName, email, property, unit, charge, payments, issuedOn }) {
  const ops = [];
  const text = (value, x, y, { size = 10, bold = false, align = 'left', gray = 0.1 } = {}) => {
    const clean = pdfText(value);
    const width = textWidth(value, size, bold);
    const left = align === 'right' ? x - width : x;
    ops.push(`${gray} g BT /${bold ? 'F2' : 'F1'} ${size} Tf ${left.toFixed(2)} ${y} Td (${clean}) Tj ET`);
  };
  const rule = (y, { gray = 0.82, weight = 0.6 } = {}) =>
    ops.push(`${gray} G ${weight} w ${MARGIN} ${y} m ${PAGE_WIDTH - MARGIN} ${y} l S`);

  const right = PAGE_WIDTH - MARGIN;
  let y = PAGE_HEIGHT - MARGIN;

  ops.push('0.96 0.62 0 rg');
  ops.push(`${MARGIN} ${y - 4} 36 4 re f`);
  y -= 34;
  text(company, MARGIN, y, { size: 18, bold: true });
  text('RENT RECEIPT', right, y + 2, { size: 11, bold: true, align: 'right', gray: 0.35 });
  y -= 18;
  text(`Receipt ${number}`, right, y + 2, { size: 9, align: 'right', gray: 0.35 });
  text('Property management', MARGIN, y, { size: 9, gray: 0.35 });

  y -= 30;
  rule(y);
  y -= 24;

  const details = [
    ['Received from', tenantName],
    ['Email', email],
    ['Property', property],
    ['Unit', unit],
    ['Rent period', monthName(charge.period)],
    ['Date issued', longDate(issuedOn)],
  ];
  details.forEach(([label, value]) => {
    text(label.toUpperCase(), MARGIN, y, { size: 8, bold: true, gray: 0.45 });
    text(truncate(value || '-', 340, 11), MARGIN + 120, y, { size: 11 });
    y -= 20;
  });

  y -= 8;
  rule(y, { gray: 0.1, weight: 1 });
  y -= 18;
  text('DATE', MARGIN, y, { size: 8, bold: true, gray: 0.45 });
  text('METHOD', MARGIN + 130, y, { size: 8, bold: true, gray: 0.45 });
  text('REFERENCE', MARGIN + 270, y, { size: 8, bold: true, gray: 0.45 });
  text('AMOUNT', right, y, { size: 8, bold: true, align: 'right', gray: 0.45 });
  y -= 10;
  rule(y);
  y -= 18;

  payments.forEach((payment) => {
    text(longDate(payment.paid_on), MARGIN, y, { size: 10 });
    text(METHOD_LABELS[payment.method] ?? payment.method, MARGIN + 130, y, { size: 10 });
    text(truncate(payment.reference || '-', 150, 10), MARGIN + 270, y, { size: 10 });
    text(dollars(payment.amount_cents), right, y, { size: 10, align: 'right' });
    y -= 20;
  });

  const received = payments.reduce((sum, p) => sum + p.amount_cents, 0);
  y -= 4;
  rule(y);
  y -= 22;

  const totals = [
    ['Rent charged', dollars(charge.amount_cents)],
    ['Paid to date', dollars(charge.paid_cents)],
    ['Balance remaining', dollars(charge.balance_cents)],
  ];
  totals.forEach(([label, value]) => {
    text(label, right - 150, y, { size: 10, gray: 0.35 });
    text(value, right, y, { size: 10, align: 'right' });
    y -= 18;
  });

  y -= 4;
  ops.push('0.96 0.62 0 rg');
  ops.push(`${right - 230} ${y - 10} 230 32 re f`);
  text('Received on this receipt', right - 220, y + 2, { size: 10, bold: true });
  text(dollars(received), right - 10, y + 2, { size: 13, bold: true, align: 'right' });

  y -= 56;
  text(
    charge.balance_cents === 0 ? 'Paid in full. Thank you.' : 'A balance remains on this charge.',
    MARGIN,
    y,
    { size: 10, bold: true }
  );
  y -= 14;
  text('Please keep this receipt for your records.', MARGIN, y, { size: 9, gray: 0.4 });

  return buildPdf(ops);
}

export function downloadPdf(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
