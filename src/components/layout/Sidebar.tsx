import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Bot,
  ShoppingBag,
  ShoppingCart,
  ChevronRight,
  RefreshCw,
  BookOpen,
  UserRound,
} from 'lucide-react';
import type { ViewKey } from '@/types';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: typeof LayoutDashboard;
  group: 'main';
  badge?: string;
}

const navItems: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Home',
    icon: LayoutDashboard,
    group: 'main',
  },
  {
    key: 'account',
    label: 'My Account',
    icon: UserRound,
    group: 'main',
  },
  {
    key: 'ai-buyer',
    label: 'Ask BookVision',
    icon: Bot,
    group: 'main',
    badge: 'Live',
  },
  {
    key: 'orders',
    label: 'My Orders',
    icon: ShoppingBag,
    group: 'main',
  },
  {
    key: 'cart',
    label: 'Reading Bag',
    icon: ShoppingCart,
    group: 'main',
  },
  {
    key: 'rental-management',
    label: 'Rentals',
    icon: RefreshCw,
    group: 'main',
  },
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

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-ink-200/70 bg-white transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-[76px] items-center gap-3 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-700 text-white shadow-soft">
            <BookOpen className="h-5 w-5" />
          </div>

          <div className="leading-tight">
            <p className="font-display text-base font-bold text-ink-900">
              BookVision
            </p>

            <p className="text-[10px] font-medium text-ink-500">
              Books · Reading · Ideas
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-4 scrollbar-thin">

          {/* Workspace */}
          <div>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
              Workspace
            </p>

            <div className="space-y-1">
              {main.map((item) => (
                <NavButton
                  key={item.key}
                  item={item}
                  active={current === item.key}
                  onClick={() => onNavigate(item.key)}
                />
              ))}
            </div>
          </div>
        </nav>

        {/* Agent status */}
        <div className="border-t border-ink-200/70 p-4">
          <div className="rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 p-4">

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-soft">
                <Bot className="h-4 w-4 text-brand-600" />
              </div>

              <p className="text-sm font-semibold text-ink-900">
                BookVision AI ready
              </p>
            </div>

            <p className="mt-2 text-xs text-ink-600">
              Search by title, author, subject, or mood.
            </p>

            <div className="mt-3 flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse-soft rounded-full bg-success-500" />

              <span className="text-[11px] font-medium text-success-700">
                All systems operational
              </span>
            </div>

          </div>
        </div>
      </aside>
    </>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-brand-50 text-brand-700'
          : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
      )}
    >
      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0 transition-colors',
          active
            ? 'text-brand-600'
            : 'text-ink-400 group-hover:text-ink-600',
        )}
      />

      <span className="flex-1 text-left">
        {item.label}
      </span>

      {item.badge && (
        <span className="chip bg-success-100 text-success-700">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-success-500" />
          {item.badge}
        </span>
      )}

      {active && (
        <ChevronRight className="h-4 w-4 text-brand-500" />
      )}
    </button>
  );
}