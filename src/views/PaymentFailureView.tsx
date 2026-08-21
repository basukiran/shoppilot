import { ShieldAlert, RotateCcw, ArrowLeft, CreditCard, AlertTriangle, Bot } from 'lucide-react';
import type { ViewKey } from '@/types';
import { paymentFailure } from '@/data/mockData';
import { formatCurrency } from '@/lib/utils';

export function PaymentFailureView({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const f = paymentFailure;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => onNavigate('activity')} className="btn-ghost text-sm text-ink-500">
        <ArrowLeft className="h-4 w-4" /> Back to activity
      </button>

      <div className="card overflow-hidden animate-fade-in">
        <div className="flex flex-col items-center gap-4 border-b border-ink-100 bg-gradient-to-br from-danger-50/60 to-ink-50 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-50 ring-8 ring-danger-50/40">
            <ShieldAlert className="h-8 w-8 text-danger-600" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">{f.title}</h2>
            <p className="mt-2 max-w-md text-sm text-ink-500">{f.message}</p>
          </div>
          <span className="chip bg-danger-50 text-danger-600">
            <AlertTriangle className="h-3 w-3" /> Error code: {f.code}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <InfoTile label="Order reference" value={f.orderRef} />
          <InfoTile label="Amount" value={formatCurrency(f.amount, 'USD')} />
          <InfoTile label="Attempted at" value={f.attemptedAt} />
          <InfoTile label="Retryable" value={f.retryable ? 'Yes' : 'No'} highlight={f.retryable} />
        </div>

        <div className="mx-6 rounded-xl border border-ink-100 bg-ink-50 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
            <Bot className="h-3.5 w-3.5 text-brand-600" /> What the agent did
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-600">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success-500" />
              No funds were captured — your balance is unchanged.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success-500" />
              Order {f.orderRef} is held and can be retried without re-entering details.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success-500" />
              Your spending limit was not affected.
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 border-t border-ink-100 p-5 sm:flex-row sm:justify-end">
          <button onClick={() => onNavigate('payment-approval')} className="btn-secondary w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4" /> Back to approval
          </button>
          <button onClick={() => onNavigate('payment-approval')} className="btn-primary w-full sm:w-auto">
            <RotateCcw className="h-4 w-4" /> Retry payment
          </button>
        </div>
      </div>

      <div className="card flex items-center gap-3 p-4">
        <CreditCard className="h-5 w-5 text-ink-400" />
        <p className="text-sm text-ink-500">
          Tip: you can add a backup payment method so agents can retry automatically next time.
        </p>
      </div>
    </div>
  );
}

function InfoTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-100 p-4">
      <p className="text-xs text-ink-400">{label}</p>
      <p className={`mt-1 font-display text-base font-bold ${highlight ? 'text-success-600' : 'text-ink-900'}`}>{value}</p>
    </div>
  );
}
