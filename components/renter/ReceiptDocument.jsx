import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const INK = '#1a1a1a';
const MUTED = '#6b6b6b';
const RULE = '#d6d6d6';
const ACCENT = '#f59e00';

const styles = StyleSheet.create({
  page: { paddingTop: 54, paddingHorizontal: 54, paddingBottom: 60, fontFamily: 'Helvetica', fontSize: 10, color: INK },
  accentBar: { width: 36, height: 4, backgroundColor: ACCENT, marginBottom: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  company: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  tagline: { marginTop: 4, fontSize: 9, color: MUTED },
  title: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: MUTED, textAlign: 'right' },
  number: { marginTop: 4, fontSize: 9, color: MUTED, textAlign: 'right' },
  rule: { borderBottomWidth: 0.6, borderBottomColor: RULE, marginVertical: 20 },
  demoBanner: {
    marginTop: 18,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fff4d6',
    borderWidth: 0.6,
    borderColor: ACCENT,
    fontSize: 9,
    color: INK,
  },
  detailRow: { flexDirection: 'row', marginBottom: 9 },
  detailLabel: { width: 120, fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 0.6 },
  detailValue: { flex: 1, fontSize: 11 },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: INK,
    borderBottomWidth: 0.6,
    borderBottomColor: RULE,
  },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 0.4, borderBottomColor: RULE },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 0.6 },
  colDate: { width: 120 },
  colMethod: { width: 140 },
  colRef: { flex: 1, paddingRight: 8 },
  colAmount: { width: 80, textAlign: 'right' },
  totals: { alignSelf: 'flex-end', width: 230, marginTop: 18 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  totalLabel: { color: MUTED },
  received: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    padding: 10,
    backgroundColor: ACCENT,
  },
  receivedLabel: { fontFamily: 'Helvetica-Bold' },
  receivedValue: { fontFamily: 'Helvetica-Bold', fontSize: 13 },
  closing: { marginTop: 36 },
  closingTitle: { fontFamily: 'Helvetica-Bold' },
  closingNote: { marginTop: 4, fontSize: 9, color: MUTED },
  footer: {
    position: 'absolute',
    left: 54,
    right: 54,
    bottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: MUTED,
  },
});

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

export default function ReceiptDocument({ number, company, tenantName, email, property, unit, charge, payments, issuedOn, demo }) {
  const received = payments.reduce((sum, payment) => sum + payment.amount_cents, 0);
  const details = [
    ['RECEIVED FROM', tenantName],
    ['EMAIL', email],
    ['PROPERTY', property],
    ['UNIT', unit],
    ['RENT PERIOD', monthName(charge.period)],
    ['DATE ISSUED', longDate(issuedOn)],
  ];

  return (
    <Document title={`Rent receipt ${number}`} author={company} subject='Rent receipt'>
      <Page size='LETTER' style={styles.page}>
        <View style={styles.accentBar} />
        <View style={styles.header}>
          <View>
            <Text style={styles.company}>{company}</Text>
            <Text style={styles.tagline}>Property management</Text>
          </View>
          <View>
            <Text style={styles.title}>RENT RECEIPT</Text>
            <Text style={styles.number}>Receipt {number}</Text>
          </View>
        </View>

        {demo && (
          <Text style={styles.demoBanner}>
            SAMPLE RECEIPT - generated for demonstration only. It is not a record of a real payment.
          </Text>
        )}

        <View style={styles.rule} />

        {details.map(([label, value]) => (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value || '-'}</Text>
          </View>
        ))}

        <View style={[styles.tableHead, { marginTop: 14 }]}>
          <Text style={[styles.th, styles.colDate]}>DATE</Text>
          <Text style={[styles.th, styles.colMethod]}>METHOD</Text>
          <Text style={[styles.th, styles.colRef]}>REFERENCE</Text>
          <Text style={[styles.th, styles.colAmount]}>AMOUNT</Text>
        </View>
        {payments.map((payment, index) => (
          <View key={`${payment.reference}-${index}`} style={styles.tableRow} wrap={false}>
            <Text style={styles.colDate}>{longDate(payment.paid_on)}</Text>
            <Text style={styles.colMethod}>{METHOD_LABELS[payment.method] ?? payment.method}</Text>
            <Text style={styles.colRef}>{payment.reference || '-'}</Text>
            <Text style={styles.colAmount}>{dollars(payment.amount_cents)}</Text>
          </View>
        ))}

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Rent charged</Text>
            <Text>{dollars(charge.amount_cents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Paid to date</Text>
            <Text>{dollars(charge.paid_cents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Balance remaining</Text>
            <Text>{dollars(charge.balance_cents)}</Text>
          </View>
          <View style={styles.received}>
            <Text style={styles.receivedLabel}>Received on this receipt</Text>
            <Text style={styles.receivedValue}>{dollars(received)}</Text>
          </View>
        </View>

        <View style={styles.closing} wrap={false}>
          <Text style={styles.closingTitle}>
            {charge.balance_cents === 0 ? 'Paid in full. Thank you.' : 'A balance remains on this charge.'}
          </Text>
          <Text style={styles.closingNote}>Please keep this receipt for your records.</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>{company}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
