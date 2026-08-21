import { ArrowUpRight, ArrowDownRight, DollarSign, Percent, Bot, Lightbulb } from 'lucide-react';
import type { Metric } from '@/types';
import { Sparkline } from '@/components/ui/Charts';
import { cn } from '@/lib/utils';

const iconFor = (icon: Metric['icon']) => {
  switch (icon) {
    case 'revenue':
      return DollarSign;
    case 'conversion':
      return Percent;
    case 'ai-sales':
      return Bot;
    case 'opportunity':
      return Lightbulb;
  }
};

const accentMap: Record<Metric['accent'], { text: string; bg: string; stroke: string; ring: string }> = {
  brand: { text: 'text-brand-600', bg: 'bg-brand-50', stroke: '#0f86f2', ring: 'ring-brand-100' },
  accent: { text: 'text-accent-600', bg: 'bg-accent-50', stroke: '#06d28a', ring: 'ring-accent-100' },
  success: { text: 'text-success-600', bg: 'bg-success-50', stroke: '#12b76a', ring: 'ring-success-100' },
  warning: { text: 'text-warning-600', bg: 'bg-warning-50', stroke: '#f79009', ring: 'ring-warning-100' },
  danger: { text: 'text-danger-600', bg: 'bg-danger-50', stroke: '#f04438', ring: 'ring-danger-100' },
};

export function StatCard({ metric }: { metric: Metric }) {
  const Icon = iconFor(metric.icon);
  const a = accentMap[metric.accent];
  const positive = metric.delta >= 0;
  return (
    <div className="card card-hover p-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl ring-4', a.bg, a.ring)}>
          <Icon className={cn('h-5 w-5', a.text)} />
        </div>
        <span
          className={cn(
            'chip',
            positive ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-600',
          )}
        >
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {positive ? '+' : ''}
          {metric.delta}
          {metric.icon === 'conversion' ? 'pp' : '%'}
        </span>
      </div>
      <p className="mt-4 text-xs font-medium text-ink-400">{metric.label}</p>
      <p className="font-display text-2xl font-bold text-ink-900">{metric.value}</p>
      <div className="mt-2">
        <Sparkline data={metric.trend} className="h-9 w-full" stroke={a.stroke} fill={a.stroke} />
      </div>
    </div>
  );
}
