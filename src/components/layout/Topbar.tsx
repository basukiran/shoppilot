import { useState } from 'react';
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  ShoppingCart,
  CheckCircle,
  Package,
  CreditCard,
  X,
} from 'lucide-react';
import type { ViewKey } from '@/types';

const titles: Record<ViewKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Overview of your commerce operations',
  },
  'ai-buyer': {
    title: 'AI Buyer',
    subtitle: 'Conversational shopping powered by autonomous agents',
  },
  cart: {
    title: 'Cart',
    subtitle: 'Review and manage items in your shopping cart',
  },
  orders: {
    title: 'Orders',
    subtitle: 'View and manage customer orders',
  },
  growth: {
    title: 'Merchant Growth',
    subtitle: 'AI-powered growth opportunities',
  },
  activity: {
    title: 'Agent Activity',
    subtitle: 'Monitor autonomous agent actions',
  },
  'payment-approval': {
    title: 'Payment Approval',
    subtitle: 'Review and authorize agent purchases',
  },
  'payment-failure': {
    title: 'Payment Failure',
    subtitle: 'Review failed payment attempts',
  },
};

export function Topbar({
  view,
  onMenu,
}: {
  view: ViewKey;
  onMenu: () => void;
}) {
  const { title, subtitle } = titles[view];

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifications = [
    {
      icon: <CheckCircle className="h-4 w-4 text-success-600" />,
      title: 'Order confirmed',
      message: 'Your recent order was successfully placed.',
    },
    {
      icon: <Package className="h-4 w-4 text-brand-600" />,
      title: 'Stock update',
      message: 'Product stock levels were updated.',
    },
    {
      icon: <CreditCard className="h-4 w-4 text-accent-600" />,
      title: 'Payment approved',
      message: 'Your latest payment was successfully approved.',
    },
  ];

  const handleSearch = async () => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    try {
      setSearching(true);

      const response = await fetch(
        `http://127.0.0.1:8000/products/search?q=${encodeURIComponent(search)}`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const toggleNotifications = () => {
    setNotificationOpen((value) => !value);
    setProfileOpen(false);
  };

  const toggleProfile = () => {
    setProfileOpen((value) => !value);
    setNotificationOpen(false);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-ink-200/70 bg-white/80 px-4 backdrop-blur-md sm:px-6">

      {/* MOBILE MENU */}
      <button
        type="button"
        onClick={onMenu}
        className="btn-ghost lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* PAGE TITLE */}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-lg font-bold text-ink-900">
          {title}
        </h1>

        <p className="hidden truncate text-xs text-ink-500 sm:block">
          {subtitle}
        </p>
      </div>

      {/* SEARCH */}
      <div className="relative hidden md:block">
        <div className="flex items-center gap-2">

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              placeholder="Search products..."
              className="input w-64 py-2 pl-9 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleSearch}
            disabled={!search.trim() || searching}
            className="btn-primary px-3 py-2 disabled:opacity-40"
          >
            <Search className="h-4 w-4" />
          </button>

        </div>

        {/* SEARCH RESULTS */}
        {search.trim() && results.length > 0 && (
          <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-ink-200 bg-white p-2 shadow-lg">

            <p className="px-3 py-2 text-xs font-semibold text-ink-400">
              Search results
            </p>

            {results.map((product) => (
              <div
                key={product.id}
                className="rounded-lg p-3 transition hover:bg-ink-50"
              >
                <div className="flex items-center justify-between gap-3">

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {product.name}
                    </p>

                    <p className="text-xs text-ink-400">
                      {product.category}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-ink-900">
                      ₹{product.price}
                    </p>

                    <p className="text-xs text-success-600">
                      {product.stock > 0
                        ? `${product.stock} in stock`
                        : 'Out of stock'}
                    </p>
                  </div>

                </div>
              </div>
            ))}

          </div>
        )}

        {search.trim() && !searching && results.length === 0 && (
          <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-ink-200 bg-white p-4 shadow-lg">
            <p className="text-sm text-ink-500">
              No products found.
            </p>
          </div>
        )}
      </div>

      {/* NOTIFICATIONS */}
      <div className="relative">
        <button
          type="button"
          onClick={toggleNotifications}
          className="btn-ghost relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
        </button>

        {notificationOpen && (
          <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-ink-900">
                  Notifications
                </p>
                <p className="text-xs text-ink-400">
                  Recent activity
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNotificationOpen(false)}
                className="rounded-lg p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  className="flex gap-3 border-b border-ink-100 px-4 py-3 hover:bg-ink-50"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-50">
                    {notification.icon}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      {notification.title}
                    </p>

                    <p className="mt-0.5 text-xs text-ink-500">
                      {notification.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-ink-100 px-4 py-3">
              <p className="text-center text-xs text-ink-400">
                You're all caught up
              </p>
            </div>

          </div>
        )}
      </div>

      {/* PROFILE */}
      <div className="relative">
        <button
          type="button"
          onClick={toggleProfile}
          className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-2 py-1.5 transition hover:bg-ink-50"
        >

          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
            AM
          </div>

          <div className="hidden text-left leading-tight sm:block">
            <p className="text-sm font-semibold text-ink-900">
              Alex Morgan
            </p>

            <p className="text-[11px] text-ink-400">
              Merchant admin
            </p>
          </div>

          <ChevronDown className="hidden h-4 w-4 text-ink-400 sm:block" />

        </button>

        {profileOpen && (
          <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl">

            <div className="border-b border-ink-100 px-4 py-4">
              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 font-bold text-white">
                  AM
                </div>

                <div>
                  <p className="text-sm font-bold text-ink-900">
                    Alex Morgan
                  </p>

                  <p className="text-xs text-ink-400">
                    alex@shoppilot.ai
                  </p>
                </div>

              </div>
            </div>

            <div className="p-2">

              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
              >
                <ShoppingCart className="h-4 w-4" />
                Shopping preferences
              </button>

              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
              >
                <Bell className="h-4 w-4" />
                Notification settings
              </button>

            </div>

            <div className="border-t border-ink-100 p-3">
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
              >
                Close
              </button>
            </div>

          </div>
        )}
      </div>

    </header>
  );
}