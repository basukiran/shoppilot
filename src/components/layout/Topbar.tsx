import { Search, Bell, Menu, ChevronDown } from 'lucide-react';
import type { ViewKey } from '@/types';

const titles: Record<ViewKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your agentic commerce performance' },
  'ai-buyer': { title: 'AI Buyer', subtitle: 'Conversational shopping powered by autonomous agents' },
  growth: { title: 'Merchant Growth', subtitle: 'Revenue, conversion, and AI-assisted growth insights' },
  activity: { title: 'Agent Activity', subtitle: 'Audit trail of every action your agents take' },
  'payment-approval': { title: 'Payment Approval', subtitle: 'Review and approve agent-initiated purchases' },
  'payment-failure': { title: 'Payment Failure', subtitle: 'Graceful handling of declined payments' },
};

export function Topbar({ view, onMenu }: { view: ViewKey; onMenu: () => void }) {
  const { title, subtitle } = titles[view];
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-ink-200/70 bg-white/80 px-4 backdrop-blur-md sm:px-6">
      <button onClick={onMenu} className="btn-ghost lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-lg font-bold text-ink-900">{title}</h1>
        <p className="hidden truncate text-xs text-ink-500 sm:block">{subtitle}</p>
      </div>
      <div className="hidden md:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search products, orders, agents…"
            className="input w-72 pl-9 py-2 text-sm"
          />
        </div>
      </div>
      <button className="btn-ghost relative" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
      </button>
      <button className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-2 py-1.5 transition hover:bg-ink-50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
          AM
        </div>
        <div className="hidden text-left leading-tight sm:block">
          <p className="text-sm font-semibold text-ink-900">Alex Morgan</p>
          <p className="text-[11px] text-ink-400">Merchant admin</p>
        </div>
        <ChevronDown className="hidden h-4 w-4 text-ink-400 sm:block" />
      </button>
    </header>
  );
}
