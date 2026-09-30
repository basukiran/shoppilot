export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(value: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}
