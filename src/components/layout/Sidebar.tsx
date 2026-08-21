import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Bot,
  TrendingUp,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import type { ViewKey } from '@/types';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: typeof LayoutDashboard;
  group: 'main' | 'payments';
  badge?: string;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'main' },
  { key: 'ai-buyer', label: 'AI Buyer', icon: Bot, group: 'main', badge: 'Live' },
  { key: 'growth', label: 'Merchant Growth', icon: TrendingUp, group: 'main' },
  { key: 'activity', label: 'Agent Activity', icon: Activity, group: 'main' },
  { key: 'payment-approval', label: 'Payment Approval', icon: ShieldCheck, group: 'payments' },
  { key: 'payment-failure', label: 'Payment Failure', icon: ShieldAlert, group: 'payments' },
];

export function Sidebar({
  current,
  onNavigate,
  open,
  onClose,
}: {
  current: ViewKey;
  onNavigate: (v: ViewKey) => void;
  open: boolean;
  onClose: () => void;
}) {
  const main = navItems.filter((n) => n.group === 'main');
  const payments = navItems.filter((n) => n.group === 'payments');

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink-950/40 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-ink-200/70 bg-white transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-3 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-bold text-ink-900">ShopPilot</p>
            <p className="text-[11px] font-medium text-ink-400">Agentic Commerce</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-4 scrollbar-thin">
          <div>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">Workspace</p>
            <div className="space-y-1">
              {main.map((item) => (
                <NavButton key={item.key} item={item} active={current === item.key} onClick={() => onNavigate(item.key)} />
              ))}
            </div>
          </div>
          <div>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">Payments</p>
            <div className="space-y-1">
              {payments.map((item) => (
                <NavButton key={item.key} item={item} active={current === item.key} onClick={() => onNavigate(item.key)} />
              ))}
            </div>
          </div>
        </nav>

        <div className="border-t border-ink-200/70 p-4">
          <div className="rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-soft">
                <Bot className="h-4 w-4 text-brand-600" />
              </div>
              <p className="text-sm font-semibold text-ink-900">Agent online</p>
            </div>
            <p className="mt-2 text-xs text-ink-600">5 agents running. Last sync 12s ago.</p>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse-soft rounded-full bg-success-500" />
              <span className="text-[11px] font-medium text-success-700">All systems operational</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
      )}
    >
      <Icon className={cn('h-[18px] w-[18px] shrink-0 transition-colors', active ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600')} />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge && (
        <span className="chip bg-success-100 text-success-700">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-success-500" />
          {item.badge}
        </span>
      )}
      {active && <ChevronRight className="h-4 w-4 text-brand-500" />}
    </button>
  );
}
