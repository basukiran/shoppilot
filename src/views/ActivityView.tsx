import { useState } from 'react';
import {
  Search,
  PackageCheck,
  Lightbulb,
  ShoppingCart,
  ShieldCheck,
  Bot,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
} from 'lucide-react';
import type { AgentAction, AgentActionStatus, AgentActionType } from '@/types';
import { agentActions } from '@/data/mockData';
import { cn } from '@/lib/utils';

const typeIcon: Record<AgentActionType, typeof Search> = {
  product_search: Search,
  stock_verification: PackageCheck,
  recommendation: Lightbulb,
  order_creation: ShoppingCart,
  payment_approval: ShieldCheck,
};

const typeColor: Record<AgentActionType, string> = {
  product_search: 'bg-brand-50 text-brand-600',
  stock_verification: 'bg-accent-50 text-accent-600',
  recommendation: 'bg-warning-50 text-warning-600',
  order_creation: 'bg-brand-50 text-brand-700',
  payment_approval: 'bg-success-50 text-success-700',
};

const statusMeta: Record<AgentActionStatus, { icon: typeof CheckCircle2; chip: string; dot: string; label: string }> = {
  success: { icon: CheckCircle2, chip: 'bg-success-50 text-success-700', dot: 'bg-success-500', label: 'Success' },
  pending: { icon: Clock, chip: 'bg-warning-50 text-warning-700', dot: 'bg-warning-500 animate-pulse-soft', label: 'Pending' },
  failed: { icon: XCircle, chip: 'bg-danger-50 text-danger-600', dot: 'bg-danger-500', label: 'Failed' },
};

const filters: { key: AgentActionType | 'all'; label: string }[] = [
  { key: 'all', label: 'All actions' },
  { key: 'product_search', label: 'Product search' },
  { key: 'stock_verification', label: 'Stock verification' },
  { key: 'recommendation', label: 'Recommendation' },
  { key: 'order_creation', label: 'Order creation' },
  { key: 'payment_approval', label: 'Payment approval' },
];

export function ActivityView() {
  const [filter, setFilter] = useState<AgentActionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AgentActionStatus | 'all'>('all');

  const filtered = agentActions.filter((a) => {
    const typeOk = filter === 'all' || a.type === filter;
    const statusOk = statusFilter === 'all' || a.status === statusFilter;
    return typeOk && statusOk;
  });

  const counts = {
    total: agentActions.length,
    success: agentActions.filter((a) => a.status === 'success').length,
    pending: agentActions.filter((a) => a.status === 'pending').length,
    failed: agentActions.filter((a) => a.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Total actions" value={counts.total} icon={Bot} color="bg-brand-50 text-brand-600" />
        <SummaryCard label="Successful" value={counts.success} icon={CheckCircle2} color="bg-success-50 text-success-600" />
        <SummaryCard label="Pending" value={counts.pending} icon={Clock} color="bg-warning-50 text-warning-600" />
        <SummaryCard label="Failed" value={counts.failed} icon={XCircle} color="bg-danger-50 text-danger-600" />
      </div>

      <div className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ink-400" />
            <h3 className="font-display text-base font-bold text-ink-900">Audit trail</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'chip border transition',
                  filter === f.key
                    ? 'border-brand-300 bg-brand-50 text-brand-700'
                    : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
          {(['all', 'success', 'pending', 'failed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'chip transition',
                statusFilter === s ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
              )}
            >
              {s === 'all' ? 'All statuses' : statusMeta[s].label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <ol className="relative space-y-4 border-l border-ink-200 pl-6">
            {filtered.map((action, i) => (
              <TimelineEntry key={action.id} action={action} isLast={i === filtered.length - 1} />
            ))}
            {filtered.length === 0 && (
              <li className="py-8 text-center text-sm text-ink-400">No actions match these filters.</li>
            )}
          </ol>
        </div>
      </div>
    </div>
  );
}

function TimelineEntry({ action, isLast }: { action: AgentAction; isLast: boolean }) {
  const Icon = typeIcon[action.type];
  const status = statusMeta[action.status];
  const StatusIcon = status.icon;
  return (
    <li className="relative animate-slide-up" style={{ animationDelay: `${50}ms` }}>
      <span
        className={cn(
          'absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white',
          typeColor[action.type],
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="card card-hover p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink-900">{action.title}</p>
              <span className={cn('chip', status.chip)}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-600">{action.description}</p>
            {action.meta && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(action.meta).map(([k, v]) => (
                  <span key={k} className="chip bg-ink-50 text-ink-500">
                    <span className="text-ink-400">{k}:</span> {v}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-xs font-medium text-ink-700">{action.timestamp}</p>
            <p className="mt-1 text-[11px] text-ink-400">{action.agent}</p>
          </div>
        </div>
      </div>
      {!isLast && <span className="absolute -left-[3px] top-6 h-full w-0.5 -translate-x-1/2 bg-ink-200" />}
    </li>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Bot;
  color: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-ink-900">{value}</p>
          <p className="text-xs text-ink-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
