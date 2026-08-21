import { TrendingUp, Target, Zap, ArrowUpRight, Lightbulb, PackageCheck } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Bars, Donut, Progress } from '@/components/ui/Charts';
import { metrics, revenueSeries, growthOpportunities } from '@/data/mockData';
import { cn } from '@/lib/utils';

export function GrowthView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <StatCard key={m.label} metric={m} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-ink-900">Revenue trend</h3>
              <p className="text-xs text-ink-500">Last 7 days · revenue and orders</p>
            </div>
            <div className="flex gap-2">
              <span className="chip bg-brand-50 text-brand-700">Revenue</span>
              <span className="chip bg-ink-100 text-ink-500">Orders</span>
            </div>
          </div>
          <div className="mt-6">
            <Bars
              data={revenueSeries.map((r) => ({ label: r.label, value: r.revenue }))}
              color="bg-gradient-to-t from-brand-600 to-brand-300"
              height={180}
            />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-ink-100 pt-4">
            <Summary label="Total revenue" value="$66,400" delta="+12.4%" />
            <Summary label="Total orders" value="1,130" delta="+8.2%" />
            <Summary label="Avg order value" value="$58.76" delta="+3.9%" />
          </div>
        </div>

        <div className="card flex flex-col p-6">
          <h3 className="font-display text-base font-bold text-ink-900">Conversion funnel</h3>
          <p className="text-xs text-ink-500">From visit to purchase</p>
          <div className="mt-6 space-y-4">
            <FunnelStep label="Visitors" value="12,480" pct={100} color="bg-brand-500" />
            <FunnelStep label="Product views" value="6,240" pct={50} color="bg-brand-400" />
            <FunnelStep label="Add to cart" value="2,180" pct={17.5} color="bg-accent-500" />
            <FunnelStep label="Checkout" value="1,090" pct={8.7} color="bg-accent-400" />
            <FunnelStep label="Purchased" value="602" pct={4.82} color="bg-success-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Zap className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="font-display text-base font-bold text-ink-900">AI-assisted sales</h3>
          </div>
          <div className="mt-5 flex items-center justify-center">
            <Donut
              segments={[
                { value: 42, color: '#0f86f2', label: 'AI-assisted' },
                { value: 58, color: '#eef1f5', label: 'Manual' },
              ]}
              centerLabel="$42.1k"
              centerSub="this month"
            />
          </div>
          <div className="mt-5 space-y-2">
            <Row label="AI-assisted" value="$42,180" pct="42%" color="bg-brand-500" />
            <Row label="Manual" value="$86,240" pct="58%" color="bg-ink-300" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50">
              <Target className="h-4 w-4 text-accent-600" />
            </div>
            <h3 className="font-display text-base font-bold text-ink-900">Conversion rate</h3>
          </div>
          <p className="mt-4 font-display text-3xl font-bold text-ink-900">4.82%</p>
          <p className="text-sm text-success-600">+0.6pp vs last month</p>
          <div className="mt-5 space-y-3">
            <Channel label="Organic search" value="5.4%" pct={80} />
            <Channel label="Direct" value="4.9%" pct={72} />
            <Channel label="Social" value="3.8%" pct={56} />
            <Channel label="AI Buyer" value="6.2%" pct={92} highlight />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-50">
              <TrendingUp className="h-4 w-4 text-warning-600" />
            </div>
            <h3 className="font-display text-base font-bold text-ink-900">Growth opportunities</h3>
          </div>
          <div className="mt-5 space-y-3">
            {growthOpportunities.slice(0, 3).map((o) => (
              <div key={o.id} className="rounded-xl border border-ink-100 p-3 transition hover:border-brand-200 hover:bg-brand-50/40">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900">{o.title}</p>
                  <span className="chip bg-success-50 text-success-700 shrink-0">
                    <ArrowUpRight className="h-3 w-3" /> {o.impact}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-ink-400">{o.category}</span>
                  <span className="text-[11px] text-ink-500">{o.confidence}% confidence</span>
                </div>
                <Progress value={o.confidence} className="mt-1.5" barClass="bg-accent-500" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Lightbulb className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="font-display text-base font-bold text-ink-900">All growth opportunities</h3>
          </div>
          <span className="chip bg-ink-100 text-ink-600">{growthOpportunities.length} active</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {growthOpportunities.map((o) => (
            <div key={o.id} className="flex items-center gap-4 rounded-xl border border-ink-100 p-4 transition hover:border-brand-200 hover:shadow-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-accent-50">
                <PackageCheck className="h-5 w-5 text-brand-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">{o.title}</p>
                <p className="text-xs text-ink-400">{o.category}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-success-600">{o.impact}</p>
                <p className="text-[11px] text-ink-400">{o.confidence}% confidence</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div>
      <p className="text-xs text-ink-400">{label}</p>
      <p className="font-display text-lg font-bold text-ink-900">{value}</p>
      <p className="text-xs text-success-600">{delta}</p>
    </div>
  );
}

function FunnelStep({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-600">{label}</span>
        <span className="font-semibold text-ink-900">{value}</span>
      </div>
      <div className="mt-1.5 h-7 w-full overflow-hidden rounded-lg bg-ink-100">
        <div className={cn('h-full rounded-lg transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Row({ label, value, pct, color }: { label: string; value: string; pct: string; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className={cn('h-2.5 w-2.5 rounded-full', color)} />
        <span className="text-ink-600">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-ink-900">{value}</span>
        <span className="text-xs text-ink-400">{pct}</span>
      </div>
    </div>
  );
}

function Channel({ label, value, pct, highlight }: { label: string; value: string; pct: number; highlight?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className={cn('text-ink-600', highlight && 'font-semibold text-brand-700')}>{label}</span>
        <span className="font-semibold text-ink-900">{value}</span>
      </div>
      <Progress value={pct} className="mt-1.5" barClass={highlight ? 'bg-brand-500' : 'bg-ink-300'} />
    </div>
  );
}
