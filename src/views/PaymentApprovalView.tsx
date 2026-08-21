import { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Bot,
  Check,
  X,
  Clock,
  Store,
  Tag,
  Wallet,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import type { ViewKey } from '@/types';
import { paymentRequest } from '@/data/mockData';
import { formatCurrency, cn } from '@/lib/utils';

type Phase = 'review' | 'processing' | 'approved' | 'declined';

export function PaymentApprovalView({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const [phase, setPhase] = useState<Phase>('review');
  const req = paymentRequest;
  const remaining = req.spendingLimit - req.amount;
  const pct = (req.amount / req.spendingLimit) * 100;

  const approve = () => {
    setPhase('processing');
    setTimeout(() => setPhase('approved'), 1600);
  };

  const cancel = () => {
    setPhase('processing');
    setTimeout(() => onNavigate('payment-failure'), 1400);
  };

  if (phase === 'approved') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card w-full max-w-md p-8 text-center animate-scale-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
            <Check className="h-8 w-8 text-success-600" />
          </div>
          <h2 className="mt-5 font-display text-xl font-bold text-ink-900">Payment approved</h2>
          <p className="mt-2 text-sm text-ink-500">
            {formatCurrency(req.amount)} charged successfully. Order {req.id.toUpperCase()} is confirmed.
          </p>
          <div className="mt-6 rounded-xl bg-ink-50 p-4 text-left text-sm">
            <Detail label="Order" value={req.id.toUpperCase()} />
            <Detail label="Amount" value={formatCurrency(req.amount)} />
            <Detail label="Merchant" value={req.merchant} />
          </div>
          <button onClick={() => onNavigate('dashboard')} className="btn-primary mt-6 w-full">
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'processing') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card w-full max-w-md p-8 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-500" />
          <p className="mt-5 font-display text-lg font-bold text-ink-900">Processing payment…</p>
          <p className="mt-1 text-sm text-ink-500">Contacting issuer and capturing funds securely.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button onClick={() => onNavigate('activity')} className="btn-ghost text-sm text-ink-500">
        <ArrowLeft className="h-4 w-4" /> Back to activity
      </button>

      <div className="card overflow-hidden animate-fade-in">
        <div className="flex items-center gap-3 border-b border-ink-100 bg-gradient-to-r from-brand-50/60 to-accent-50/40 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-soft">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink-900">Payment approval required</h2>
            <p className="text-xs text-ink-500">Your Payment Agent is requesting authorization for this purchase.</p>
          </div>
          <span className="ml-auto chip bg-warning-50 text-warning-700">
            <Clock className="h-3 w-3" /> Awaiting approval
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl bg-ink-50 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white text-4xl shadow-soft">
                🎧
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">{req.product}</p>
                <p className="text-xs text-ink-400">{req.brand}</p>
              </div>
            </div>

            <DetailRow icon={<Store className="h-4 w-4" />} label="Merchant" value={req.merchant} />
            <DetailRow icon={<Tag className="h-4 w-4" />} label="Category" value={req.category} />
            <DetailRow icon={<Bot className="h-4 w-4" />} label="Initiated by" value={req.agent} />
            <DetailRow icon={<Clock className="h-4 w-4" />} label="Requested at" value={req.createdAt} />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-ink-100 p-5">
              <p className="text-xs text-ink-400">Amount</p>
              <p className="font-display text-3xl font-bold text-ink-900">{formatCurrency(req.amount)}</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-ink-500">
                    <Wallet className="h-3.5 w-3.5" /> Spending limit
                  </span>
                  <span className="font-semibold text-ink-900">{formatCurrency(req.spendingLimit)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      pct < 80 ? 'bg-success-500' : 'bg-warning-500',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-400">{pct.toFixed(0)}% of limit used</span>
                  <span className="font-medium text-success-600">{formatCurrency(remaining)} remaining</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                <Bot className="h-3.5 w-3.5" /> Agent's reasoning
              </p>
              <p className="mt-2 text-sm text-ink-700">{req.reason}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-ink-100 p-5 sm:flex-row sm:justify-end">
          <button onClick={cancel} className="btn-secondary w-full sm:w-auto">
            <X className="h-4 w-4" /> Cancel payment
          </button>
          <button onClick={approve} className="btn-primary w-full sm:w-auto">
            <ShieldCheck className="h-4 w-4" /> Approve payment
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-1 py-1.5">
      <span className="flex items-center gap-2 text-sm text-ink-500">
        <span className="text-ink-400">{icon}</span>
        {label}
      </span>
      <span className="text-sm font-medium text-ink-900">{value}</span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-ink-400">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}

export { ShieldAlert };
