import { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Bot,
  X,
  Clock,
  Tag,
  Wallet,
  ArrowLeft,
  QrCode,
  MessageCircle,
} from 'lucide-react';

import type { AccountUser, Product } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

type ViewKey = 'ai-buyer' | 'orders' | 'payment-failure';

export function PaymentApprovalView({
  onNavigate,
  product,
  quantity,
  user,
}: {
  onNavigate: (v: ViewKey) => void;
  product: Product;
  quantity: number;
  user: AccountUser | null;
}) {
  const [showQr, setShowQr] = useState(false);

  const amount = product.price * quantity;

  // Spending guardrail
  const spendingLimit = 5000;
  const remaining = spendingLimit - amount;
  const pct = (amount / spendingLimit) * 100;

  const withinLimit = amount <= spendingLimit;
  const paymentMessage = [
    'Hello Jnana Nidhi, I have paid for a book purchase by UPI.',
    `Book: ${product.name}`,
    `Quantity: ${quantity}`,
    `Amount: ₹${amount.toLocaleString('en-IN')}`,
    'I will share my UPI transaction reference/receipt for confirmation.',
  ].join('\n');

  const approve = () => {
    if (!withinLimit) return;
    setShowQr(true);
  };

  const cancel = () => {
    onNavigate('ai-buyer');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      <button
        type="button"
        onClick={() => onNavigate('ai-buyer')}
        className="btn-ghost text-sm text-ink-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to AI Buyer
      </button>

      <div className="card overflow-hidden animate-fade-in">

        {/* HEADER */}

        <div className="flex items-center gap-3 border-b border-ink-100 bg-gradient-to-r from-brand-50/60 to-accent-50/40 p-5">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-soft">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
          </div>

          <div>
            <h2 className="font-display text-base font-bold text-ink-900">
              Review and pay for your book
            </h2>

            <p className="text-xs text-ink-500">
              Review your order total, then scan the UPI code to pay.
            </p>
          </div>

          <span className="ml-auto chip bg-warning-50 text-warning-700">
            <Clock className="h-3 w-3" />
            {showQr ? 'Payment confirmation pending' : 'Ready to pay'}
          </span>

        </div>

        {/* MAIN */}

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">

          {/* PRODUCT */}

          <div className="space-y-4">

            <div className="flex items-center gap-4 rounded-xl bg-ink-50 p-4">

              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white text-4xl shadow-soft">
                🛍️
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">
                  {product.name}
                </p>

                <p className="text-xs text-ink-400">
                  {product.category}
                </p>
              </div>

            </div>

            <DetailRow
              icon={<Tag className="h-4 w-4" />}
              label="Quantity"
              value={String(quantity)}
            />

            <DetailRow
              icon={<Tag className="h-4 w-4" />}
              label="Category"
              value={product.category}
            />

            <DetailRow
              icon={<Bot className="h-4 w-4" />}
              label="Initiated by"
              value="Buyer Agent"
            />

            <DetailRow
              icon={<Clock className="h-4 w-4" />}
              label="Requested at"
              value="Just now"
            />

            <DetailRow
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Stock"
              value={`${product.stockCount} units available`}
            />

          </div>

          {/* PAYMENT */}

          <div className="space-y-4">

            <div className="rounded-xl border border-ink-100 p-5">

              <p className="text-xs text-ink-400">
                Amount
              </p>

              <p className="font-display text-3xl font-bold text-ink-900">
                {formatCurrency(amount)}
              </p>

              <div className="mt-4 space-y-2">

                <div className="flex items-center justify-between text-sm">

                  <span className="flex items-center gap-1.5 text-ink-500">
                    <Wallet className="h-3.5 w-3.5" />
                    Spending limit
                  </span>

                  <span className="font-semibold text-ink-900">
                    {formatCurrency(spendingLimit)}
                  </span>

                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">

                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      withinLimit
                        ? 'bg-success-500'
                        : 'bg-danger-500'
                    )}
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                    }}
                  />

                </div>

                <div className="flex items-center justify-between text-xs">

                  <span
                    className={cn(
                      withinLimit
                        ? 'text-ink-400'
                        : 'font-semibold text-danger-600'
                    )}
                  >
                    {pct.toFixed(0)}% of limit used
                  </span>

                  <span
                    className={cn(
                      'font-medium',
                      withinLimit
                        ? 'text-success-600'
                        : 'text-danger-600'
                    )}
                  >
                    {withinLimit
                      ? `${formatCurrency(remaining)} remaining`
                      : `${formatCurrency(Math.abs(remaining))} over limit`}
                  </span>

                </div>

              </div>

            </div>

            {/* AGENT REASONING */}

            <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">

              <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                <Bot className="h-3.5 w-3.5" />
                Agent's reasoning
              </p>

              <p className="mt-2 text-sm text-ink-700">
                {withinLimit
                  ? 'This product matches your request, is within your spending limit, and currently has stock available.'
                  : 'This purchase exceeds the configured spending limit and cannot be completed without additional authorization.'}
              </p>

            </div>

            {/* GUARDRAIL */}

            <div
              className={cn(
                'rounded-xl border p-4',
                withinLimit
                  ? 'border-success-100 bg-success-50/50'
                  : 'border-danger-100 bg-danger-50/50'
              )}
            >

              <p
                className={cn(
                  'flex items-center gap-1.5 text-xs font-semibold',
                  withinLimit
                    ? 'text-success-700'
                    : 'text-danger-700'
                )}
              >
                {withinLimit ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5" />
                )}

                Purchase guardrail
              </p>

              <p
                className={cn(
                  'mt-1 text-xs',
                  withinLimit
                    ? 'text-success-700'
                    : 'text-danger-700'
                )}
              >
                {withinLimit
                  ? 'The agent cannot complete this purchase without your explicit approval.'
                  : 'The agent is blocked because this purchase exceeds the spending limit.'}
              </p>

            </div>

            {showQr && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-center">
                <h3 className="font-semibold text-ink-900">Scan to pay {formatCurrency(amount)}</h3>
                <p className="mt-1 text-xs leading-5 text-ink-600">Use any UPI app and enter the exact amount above.</p>
                <img src="/rental-upi-qr.png" alt="UPI QR code for Jnana Nidhi book payment" className="mx-auto mt-4 w-full max-w-[280px] rounded-xl" />
                <div className="mt-4 rounded-lg bg-amber-50 p-3 text-left text-xs leading-5 text-amber-900">
                  This static QR does not notify the website when you pay. Send your UPI transaction reference or receipt to Jnana Nidhi. Your order is confirmed only after the payment is manually checked.
                </div>
                <a
                  href={`https://wa.me/919071111074?text=${encodeURIComponent(paymentMessage)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800"
                >
                  <MessageCircle className="h-4 w-4" /> Share payment reference on WhatsApp
                </a>
                <p className="mt-3 text-[11px] leading-4 text-ink-500">Never share your UPI PIN or OTP. Never approve a collect request to receive a refund.</p>
              </div>
            )}

          </div>

        </div>

        {/* BUTTONS */}

        <div className="flex flex-col gap-3 border-t border-ink-100 p-5 sm:flex-row sm:justify-end">

          <button
            type="button"
            onClick={cancel}
            className="btn-secondary w-full sm:w-auto"
          >
            <X className="h-4 w-4" />
            Cancel payment
          </button>

          <button
            type="button"
            onClick={approve}
            disabled={!withinLimit}
            className="btn-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShieldCheck className="h-4 w-4" />
            {withinLimit
              ? showQr ? 'UPI scanner is ready above' : 'Continue to UPI scanner'
              : 'Spending limit exceeded'}
          </button>

        </div>

      </div>
    </div>
  );
}


function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-1 py-1.5">

      <span className="flex items-center gap-2 text-sm text-ink-500">
        <span className="text-ink-400">
          {icon}
        </span>

        {label}
      </span>

      <span className="text-right text-sm font-medium text-ink-900">
        {value}
      </span>

    </div>
  );
}


export { ShieldAlert };
