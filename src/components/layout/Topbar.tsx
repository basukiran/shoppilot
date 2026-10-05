import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  CreditCard,
  Loader2,
  LogOut,
  Menu,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { getCoverPlaceholder } from '@/lib/bookCovers';
import jnanaNidhiLogo from '@/assets/jnana-nidhi-hubballi.jpeg';
import type { AccountUser } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewKey =
  | 'dashboard'
  | 'account'
  | 'favorites'
  | 'ai-buyer'
  | 'cart'
  | 'growth'
  | 'activity'
  | 'rental-checkout'
  | 'rental-management'
  | 'orders'
  | 'payment-approval'
  | 'payment-failure'
  | 'customers';

interface BackendNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  related_order_id: number | null;
  related_rental_id: number | null;
  is_read: number; // 0 or 1 (SQLite integer)
  created_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const titles: Record<ViewKey, { title: string; subtitle: string }> = {
  account: {
    title: 'My Account',
    subtitle: 'Profile, orders, rentals, payments, and addresses',
  },
  customers: {
    title: 'Customers',
    subtitle: 'Customer accounts, orders, and spending',
  },
  favorites: {
    title: 'Favorites',
    subtitle: 'Books saved to your reading list',
  },
  dashboard: {
    title: 'Bookstore',
    subtitle: 'Find a book that feels like yours',
  },
  'ai-buyer': {
    title: 'AI Buyer',
    subtitle: 'Find books by title, author, subject, or mood',
  },
  cart: {
    title: 'Cart',
    subtitle: 'Your reading bag',
  },
  growth: {
    title: 'Growth',
    subtitle: 'Business performance and opportunities',
  },
  activity: {
    title: 'Activity',
    subtitle: 'Recent BookVision activity',
  },
  'rental-checkout': {
    title: 'Rental Checkout',
    subtitle: 'Complete your membership and rental payment',
  },
  'rental-management': {
    title: 'Rental Management',
    subtitle: 'Manage your rental agreements and schedules',
  },
  orders: {
    title: 'Orders',
    subtitle: 'Books on their way and reads already found',
  },
  'payment-approval': {
    title: 'Payment',
    subtitle: 'Review and complete your payment',
  },
  'payment-failure': {
    title: 'Payment',
    subtitle: 'Something went wrong with your payment',
  },
};

// ---------------------------------------------------------------------------
// Notification icon + colour helper
// ---------------------------------------------------------------------------

function notifIcon(type: string) {
  const base = 'h-4 w-4';
  switch (type) {
    case 'order_confirmed':
    case 'order_placed':
      return <Package className={`${base} text-brand-600`} />;
    case 'payment_success':
      return <CreditCard className={`${base} text-success-600`} />;
    case 'rental_payment':
    case 'rental_activated':
      return <BookOpen className={`${base} text-brand-600`} />;
    case 'rental_dispatched':
    case 'rental_delivered':
      return <RefreshCw className={`${base} text-accent-600`} />;
    case 'return_requested':
    case 'return_received':
      return <RefreshCw className={`${base} text-warning-600`} />;
    case 'refund_processed':
    case 'refund_initiated':
      return <ShieldCheck className={`${base} text-success-600`} />;
    case 'book_kept':
      return <Check className={`${base} text-success-600`} />;
    case 'account_welcome':
      return <Sparkles className={`${base} text-accent-600`} />;
    default:
      return <Bell className={`${base} text-ink-500`} />;
  }
}

// Relative time formatter
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Topbar({
  view,
  onMenu,
  user,
  onAccount,
  onLogout,
  onNavigate,
}: {
  view: ViewKey;
  onMenu: () => void;
  user: AccountUser | null;
  onAccount: () => void;
  onLogout: () => void;
  onNavigate?: (v: 'orders' | 'rental-management') => void;
}) {
  const { title, subtitle } = titles[view] ?? {
    title: 'BookVision',
    subtitle: 'Your reading companion',
  };

  const initials = user
    ? user.name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    : 'BV';

  // ── Search state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Notification state ────────────────────────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // ── Profile state ─────────────────────────────────────────────────────────
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // ── Click-outside handler ─────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Unread count poll (every 30 s, or on user change) ────────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiFetch('/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count ?? 0);
      }
    } catch {
      // silently ignore — bell badge just won't update
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, user]);

  // ── Fetch notifications when panel opens ─────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setNotifLoading(true);
    try {
      const res = await apiFetch('/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch {
      // silently ignore
    } finally {
      setNotifLoading(false);
    }
  }, [user]);

  const openNotifications = () => {
    setNotifOpen((open) => {
      const next = !open;
      if (next) {
        fetchNotifications();
      }
      return next;
    });
    setProfileOpen(false);
    setSearchOpen(false);
  };

  // ── Mark one notification as read ─────────────────────────────────────────
  const markRead = async (id: number) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      // revert if it fails
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
    } catch {
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    const q = search.trim();
    if (!q) {
      setResults([]);
      setSearchOpen(false);
      setSearchError('');
      return;
    }

    setSearching(true);
    setSearchError('');

    try {
      const res = await apiFetch(
        `/products/search?q=${encodeURIComponent(q)}`
      );

      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }

      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setSearchOpen(true);
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Search unavailable. Please try again.');
      setResults([]);
      setSearchOpen(true);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearch('');
    setResults([]);
    setSearchOpen(false);
    setSearchError('');
  };

  // ── Notification click — navigate to related view ─────────────────────────
  const handleNotifClick = (n: BackendNotification) => {
    if (n.is_read === 0) markRead(n.id);
    if (onNavigate) {
      if (n.related_order_id) {
        onNavigate('orders');
        setNotifOpen(false);
      } else if (n.related_rental_id) {
        onNavigate('rental-management');
        setNotifOpen(false);
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200/70 bg-white/80 px-4 backdrop-blur-md sm:px-6">

      {/* MOBILE MENU */}
      <button
        type="button"
        onClick={onMenu}
        className="btn-ghost lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* LOGO — visible on mobile only (sidebar shows it on desktop) */}
      <img
        src={jnanaNidhiLogo}
        alt="Jnana Nidhi Hubballi"
        className="h-8 w-8 shrink-0 object-contain lg:hidden"
        aria-hidden="true"
      />

      {/* PAGE TITLE */}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-lg font-bold text-ink-900">
          {title}
        </h1>
        <p className="hidden truncate text-xs text-ink-500 sm:block">
          {subtitle}
        </p>
      </div>

      {/* ── SEARCH ─────────────────────────────────────────────────────── */}
      <div ref={searchRef} className="relative hidden md:block">
        <div className="flex items-center gap-2">
          <div className="relative">
            {searching ? (
              <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-400" />
            ) : (
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
                if (e.key === 'Escape') clearSearch();
              }}
              placeholder="Search books or authors…"
              aria-label="Search books"
              className="input w-64 py-2 pl-9 pr-8 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-400 hover:text-ink-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSearch}
            disabled={!search.trim() || searching}
            aria-label="Run search"
            className="btn-primary px-3 py-2 disabled:opacity-40"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Search dropdown */}
        {searchOpen && (
          <div className="absolute right-0 top-12 z-50 w-96 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl">

            {/* Error state */}
            {searchError && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-danger-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {searchError}
              </div>
            )}

            {/* Loading state */}
            {searching && !searchError && (
              <div className="flex items-center gap-2 px-4 py-4 text-sm text-ink-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching the catalog…
              </div>
            )}

            {/* Results */}
            {!searching && !searchError && results.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold text-ink-400">
                  {results.length} book{results.length !== 1 ? 's' : ''} found
                </p>
                <div className="max-h-80 overflow-y-auto">
                  {results.map((product) => (
                    <div
                      key={product.id}
                      className="flex gap-3 border-t border-ink-100 px-4 py-3 transition hover:bg-ink-50"
                    >
                      {product.cover_image ? (
                        <img
                          src={product.cover_image}
                          alt={`${product.name} cover`}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = getCoverPlaceholder(product.name);
                          }}
                          className="h-14 w-10 shrink-0 rounded-sm object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-sm bg-ink-100">
                          <BookOpen className="h-5 w-5 text-ink-400" />
                        </div>
                      )}
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-900">
                            {product.name}
                          </p>
                          {product.author && (
                            <p className="truncate text-xs text-ink-500">
                              by {product.author}
                            </p>
                          )}
                          <p className="text-xs text-ink-400">{product.category}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-ink-900">
                            ₹{product.price}
                          </p>
                          <p className={`text-xs ${product.stock > 0 ? 'text-success-600' : 'text-danger-500'}`}>
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </p>
                          {product.is_rentable === 1 && (
                            <p className="text-xs text-brand-600">
                              Rent ₹{product.rental_price}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Empty state */}
            {!searching && !searchError && results.length === 0 && (
              <div className="px-4 py-6 text-center">
                <Search className="mx-auto mb-2 h-6 w-6 text-ink-300" />
                <p className="text-sm font-medium text-ink-600">No books found</p>
                <p className="mt-1 text-xs text-ink-400">
                  Try a different title, author, or category.
                </p>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── NOTIFICATIONS ──────────────────────────────────────────────── */}
      <div ref={notifRef} className="relative">
        <button
          type="button"
          onClick={openNotifications}
          className="btn-ghost relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-12 z-50 w-96 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-ink-900">Notifications</p>
                <p className="text-xs text-ink-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  className="rounded-lg p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-96 overflow-y-auto">

              {/* Not logged in */}
              {!user && (
                <div className="px-4 py-8 text-center">
                  <Bell className="mx-auto mb-2 h-6 w-6 text-ink-300" />
                  <p className="text-sm font-medium text-ink-600">Sign in to see notifications</p>
                  <p className="mt-1 text-xs text-ink-400">
                    Notifications appear for orders, rentals, and refunds.
                  </p>
                </div>
              )}

              {/* Loading */}
              {user && notifLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading notifications…
                </div>
              )}

              {/* Empty */}
              {user && !notifLoading && notifications.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <Bell className="mx-auto mb-2 h-6 w-6 text-ink-300" />
                  <p className="text-sm font-medium text-ink-600">No notifications yet</p>
                  <p className="mt-1 text-xs text-ink-400">
                    Notifications will appear when you place an order or rent a book.
                  </p>
                </div>
              )}

              {/* Notification list */}
              {user && !notifLoading && notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleNotifClick(notif)}
                  className={`flex w-full gap-3 border-b border-ink-100 px-4 py-3 text-left transition hover:bg-ink-50 ${
                    notif.is_read === 0 ? 'bg-brand-50/40' : ''
                  }`}
                >
                  {/* Unread dot */}
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100">
                    {notifIcon(notif.type)}
                    {notif.is_read === 0 && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger-500 ring-1 ring-white" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-5 ${notif.is_read === 0 ? 'font-semibold text-ink-900' : 'text-ink-700'}`}>
                      {notif.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">
                      {notif.message}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-400">
                      {relativeTime(notif.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            {user && !notifLoading && notifications.length > 0 && (
              <div className="border-t border-ink-100 px-4 py-2.5 text-center">
                <p className="text-xs text-ink-400">
                  Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── PROFILE ────────────────────────────────────────────────────── */}
      <div ref={profileRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setProfileOpen((open) => !open);
            setNotifOpen(false);
            setSearchOpen(false);
          }}
          className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-2 py-1.5 transition hover:bg-ink-50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
            {initials}
          </div>
          <div className="hidden text-left leading-tight sm:block">
            <p className="text-sm font-semibold text-ink-900">
              {user?.name ?? 'Your account'}
            </p>
            <p className="text-[11px] text-ink-400">
              {user ? 'BookVision member' : 'Sign in or register'}
            </p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-ink-400 sm:block" />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="border-b border-ink-100 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 font-bold text-white">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-ink-900">
                    {user?.name ?? 'Welcome, reader'}
                  </p>
                  <p className="text-xs text-ink-400">
                    {user?.email ?? 'Sign in to view your account'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                type="button"
                onClick={() => { setProfileOpen(false); onAccount(); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
              >
                <UserRound className="h-4 w-4" />
                {user ? 'Profile and history' : 'Sign in / create account'}
              </button>

              {user && (
                <button
                  type="button"
                  onClick={() => { setProfileOpen(false); onLogout(); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              )}
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
