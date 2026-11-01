const MERCHANT_UPI_ID = '7483400665-2@axl';
const MERCHANT_UPI_NAME = 'Jnana Nidhi';

export function createUpiPaymentLink(amount: number, note: string): string {
  const params = new URLSearchParams({
    pa: MERCHANT_UPI_ID,
    pn: MERCHANT_UPI_NAME,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note.slice(0, 80),
  });

  return `upi://pay?${params.toString()}`;
}
