import { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Bot,
  Check,
  X,
  Clock,
  Tag,
  Wallet,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

import type { AccountUser, Product } from '@/types';
import { apiFetch, normalizeProductId } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

type Phase = 'review' | 'processing' | 'approved' | 'declined';
type ViewKey = 'ai-buyer' | 'orders' | 'payment-failure';

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
  const [phase, setPhase] = useState<Phase>('review');
  const [orderResult, setOrderResult] = useState<any>(null);

  const amount = product.price * quantity;

  // Spending guardrail
  const spendingLimit = 5000;
  const remaining = spendingLimit - amount;
  const pct = (amount / spendingLimit) * 100;

  const withinLimit = amount <= spendingLimit;

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');

      script.src = 'https://checkout.razorpay.com/v1/checkout.js';

      script.onload = () => resolve(true);

      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  const approve = async () => {
    if (!withinLimit) {
      return;
    }

    try {
      setPhase('processing');

      // --------------------------------------------
      // 1. CREATE RAZORPAY ORDER ON SERVER
      // --------------------------------------------
      const createResponse = product.comboItems?.length
        ? await apiFetch('/payment/create-combo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: product.name,
              quantity,
              items: product.comboItems.map((item) => ({
                product_id: item.productId,
                quantity: item.quantity,
              })),
            }),
          })
        : await (() => {
            const normalizedProductId = normalizeProductId(product.id);
            if (normalizedProductId === null) {
              throw new Error('Invalid product ID for purchase checkout.');
            }
            return apiFetch(
              `/payment/create?product_id=${normalizedProductId}&quantity=${quantity}`,
              { method: 'POST' }
            );
          })();

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => null);

        throw new Error(
          errorData?.detail || 'Unable to create Razorpay order'
        );
      }

      const razorpayOrder = await createResponse.json();

      // --------------------------------------------
      // 2. LOAD RAZORPAY CHECKOUT
      // --------------------------------------------

      const loaded = await loadRazorpayScript();

      if (!loaded) {
        throw new Error('Razorpay Checkout failed to load');
      }

      // --------------------------------------------
      // 3. OPEN RAZORPAY CHECKOUT
      // --------------------------------------------

      setPhase('review');

      const options = {
        key: razorpayOrder.key_id,

        amount: razorpayOrder.amount,

        currency: razorpayOrder.currency,

        name: 'BookVision',

        description: `${product.name} × ${quantity}`,

        order_id: razorpayOrder.razorpay_order_id,

        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },

        notes: {
          product: product.name,
          quantity: String(quantity),
        },

        theme: {
          color: '#3399cc',
        },

        handler: async (response: any) => {
          try {
            setPhase('processing');

            // ----------------------------------------
            // 4. SEND PAYMENT DETAILS TO BACKEND
            // ----------------------------------------

            const verifyResponse = await apiFetch(
              '/payment/verify',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  razorpay_order_id:
                    response.razorpay_order_id,

                  razorpay_payment_id:
                    response.razorpay_payment_id,

                  razorpay_signature:
                    response.razorpay_signature,
                }),
              }
            );

            if (!verifyResponse.ok) {
              const errorData = await verifyResponse
                .json()
                .catch(() => null);

              throw new Error(
                errorData?.detail ||
                  'Payment verification failed'
              );
            }

            const result = await verifyResponse.json();

            console.log(
              'Razorpay payment verified:',
              result
            );

            if (result.success) {
              setOrderResult(result);
              setPhase('approved');
            } else {
              onNavigate('payment-failure');
            }
          } catch (error) {
            console.error(
              'Payment verification error:',
              error
            );

            onNavigate('payment-failure');
          }
        },

        modal: {
          ondismiss: () => {
            console.log('Razorpay Checkout closed');
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on(
        'payment.failed',
        (response: any) => {
          console.error(
            'Razorpay payment failed:',
            response
          );

          onNavigate('payment-failure');
        }
      );

      razorpay.open();
    } catch (error) {
      console.error(
        'Razorpay payment error:',
        error
      );

      onNavigate('payment-failure');
    }
  };

  const cancel = () => {
    setPhase('processing');

    setTimeout(() => {
      onNavigate('payment-failure');
    }, 800);
  };

  /*
   * APPROVED SCREEN
   */

  if (phase === 'approved') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card w-full max-w-md p-8 text-center animate-scale-in">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
            <Check className="h-8 w-8 text-success-600" />
          </div>

          <h2 className="mt-5 font-display text-xl font-bold text-ink-900">
            Payment successful 🎉
          </h2>

          <p className="mt-2 text-sm text-ink-500">
            Your Razorpay payment has been verified and your order is confirmed.
          </p>

          <p className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
            To arrange collection at your preferred location, call{' '}
            <a className="font-semibold underline" href="tel:7483400665">7483400665</a> and share your order ID.
          </p>

          <div className="mt-6 rounded-xl bg-ink-50 p-4 text-left text-sm">

            <Detail
              label="Order ID"
              value={`#${orderResult?.order_id ?? 'N/A'}`}
            />

            <Detail
              label="Product"
              value={orderResult?.product ?? product.name}
            />

            <Detail
              label="Quantity"
              value={String(
                orderResult?.quantity ?? quantity
              )}
            />

            <Detail
              label="Unit price"
              value={formatCurrency(
                orderResult?.unit_price ?? product.price
              )}
            />

            <Detail
              label="Total"
              value={formatCurrency(
                orderResult?.total_amount ?? amount
              )}
            />

            <Detail
              label="Order status"
              value={orderResult?.status ?? 'CONFIRMED'}
            />

            <Detail
              label="Payment status"
              value={orderResult?.payment_status ?? 'PAID'}
            />

            <Detail
              label="Razorpay payment"
              value={
                orderResult?.razorpay_payment_id ??
                'Verified'
              }
            />

          </div>

          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="btn-primary mt-6 w-full"
          >
            View orders
          </button>

        </div>
      </div>
    );
  }

  /*
   * PROCESSING
   */

  if (phase === 'processing') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card w-full max-w-md p-8 text-center">

          <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-500" />

          <p className="mt-5 font-display text-lg font-bold text-ink-900">
            Preparing secure payment…
          </p>

          <p className="mt-1 text-sm text-ink-500">
            Creating and verifying your Razorpay transaction.
          </p>

        </div>
      </div>
    );
  }

  /*
   * REVIEW SCREEN
   */

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
              Payment approval required
            </h2>

            <p className="text-xs text-ink-500">
              Your Payment Agent is requesting authorization for this purchase.
            </p>
          </div>

          <span className="ml-auto chip bg-warning-50 text-warning-700">
            <Clock className="h-3 w-3" />
            Awaiting approval
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
              ? 'Approve & Pay with Razorpay'
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


function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">

      <span className="text-ink-400">
        {label}
      </span>

      <span className="max-w-[65%] text-right font-semibold text-ink-900 break-all">
        {value}
      </span>

    </div>
  );
}

export { ShieldAlert };
