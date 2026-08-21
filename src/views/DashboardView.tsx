import { ArrowUpRight, Bot, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { ProductCard } from '@/components/ProductCard';
import { Bars, Donut } from '@/components/ui/Charts';
import { metrics, revenueSeries, products, agentActions } from '@/data/mockData';
import type { ViewKey } from '@/types';

export function DashboardView({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const topProducts = products.slice(0, 3);
  const recentActions = agentActions.slice(0, 4);

  return (
    <div className="space-y-6">
      <HeroBanner onNavigate={onNavigate} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <StatCard key={m.label} metric={m} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-ink-900">Revenue this week</h3>
              <p className="text-xs text-ink-500">Daily revenue and order volume</p>
            </div>
            <span className="chip bg-success-50 text-success-700">
              <ArrowUpRight className="h-3 w-3" /> +12.4% vs last week
            </span>
          </div>
          <div className="mt-6">
            <Bars
              data={revenueSeries.map((r) => ({ label: r.label, value: r.revenue }))}
              color="bg-gradient-to-t from-brand-500 to-brand-300"
              height={160}
            />
          </div>
        </div>

        <div className="card flex flex-col items-center p-6">
          <h3 className="self-start font-display text-base font-bold text-ink-900">Sales mix</h3>
          <p className="self-start text-xs text-ink-500">AI-assisted vs manual</p>
          <div className="my-6">
            <Donut
              segments={[
                { value: 42, color: '#0f86f2', label: 'AI-assisted' },
                { value: 58, color: '#c2cad8', label: 'Manual' },
              ]}
              centerLabel="42%"
              centerSub="AI sales"
            />
          </div>
          <div className="w-full space-y-2">
            <Legend color="#0f86f2" label="AI-assisted sales" value="$42,180" />
            <Legend color="#c2cad8" label="Manual sales" value="$86,240" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink-900">Top recommendations</h3>
            <button onClick={() => onNavigate('ai-buyer')} className="btn-ghost text-sm text-brand-600">
              Open AI Buyer <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {topProducts.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink-900">Recent agent activity</h3>
            <button onClick={() => onNavigate('activity')} className="btn-ghost text-sm text-brand-600">
              View all
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {recentActions.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-50">
                  <Bot className="h-3.5 w-3.5 text-ink-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800">{a.title}</p>
                  <p className="truncate text-xs text-ink-400">{a.timestamp} · {a.agent}</p>
                </div>
                <StatusDot status={a.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroBanner({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink-950 p-6 text-white sm:p-8 animate-fade-in">
      <div className="absolute inset-0 bg-mesh opacity-60" />
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="absolute -bottom-16 right-20 h-40 w-40 rounded-full bg-accent-500/15 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <span className="chip bg-white/10 text-brand-200 backdrop-blur">
            <Sparkles className="h-3 w-3" /> Agentic Commerce Platform
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl text-balance">
            Your AI agents sold $42,180 this month.
          </h2>
          <p className="mt-2 text-sm text-ink-300">
            ShopPilot agents search, verify stock, recommend, and create orders — then ask you to approve payments.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => onNavigate('ai-buyer')} className="btn-primary">
              <Bot className="h-4 w-4" /> Try AI Buyer
            </button>
            <button onClick={() => onNavigate('payment-approval')} className="btn bg-white/10 text-white hover:bg-white/20 px-4 py-2.5">
              <ShieldCheck className="h-4 w-4" /> Review payment
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <HeroStat icon={<Zap className="h-4 w-4" />} label="Agents" value="5" />
          <HeroStat icon={<Bot className="h-4 w-4" />} label="Auto-orders" value="128" />
          <HeroStat icon={<ShieldCheck className="h-4 w-4" />} label="Approvals" value="42" />
        </div>
      </div>
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 backdrop-blur ring-1 ring-white/10">
      <div className="flex items-center gap-1.5 text-brand-200">{icon}</div>
      <p className="mt-2 font-display text-xl font-bold">{value}</p>
      <p className="text-[11px] text-ink-300">{label}</p>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-ink-600">{label}</span>
      </div>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}

function StatusDot({ status }: { status: 'success' | 'pending' | 'failed' }) {
  const map = {
    success: 'bg-success-500',
    pending: 'bg-warning-500 animate-pulse-soft',
    failed: 'bg-danger-500',
  };
  return <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${map[status]}`} />;
}
