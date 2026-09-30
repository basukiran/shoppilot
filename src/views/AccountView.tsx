import { useEffect, useState, type FormEvent } from 'react';
import {
  BookOpen,
  CreditCard,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { AccountUser } from '@/types';

type AccountSection = 'profile' | 'orders' | 'rentals' | 'payments' | 'refunds' | 'addresses';

interface AccountAddress {
  id: number;
  label: string;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: number;
}

interface AccountOrder {
  id: number;
  product_name: string;
  quantity: number;
  total_amount: number;
  status: string;
  payment_status: string;
}

interface AccountRental {
  id: number;
  product_name: string;
  rental_fee: number;
  membership_fee: number;
  status: string;
  delivery_status: string;
  customer_decision: string;
  refund_amount: number;
  refund_status: string;
}

interface AccountPayment {
  id: number;
  kind: 'purchase' | 'rental';
  book_title: string;
  amount: number;
  status: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
}

interface AccountRefund {
  id: number;
  rental_id: number;
  book_title: string;
  amount: number;
  status: string;
  razorpay_refund_id: string | null;
  created_at: string;
}

interface AccountOverview {
  orders: AccountOrder[];
  rentals: AccountRental[];
  payments: AccountPayment[];
  refunds: AccountRefund[];
  addresses: AccountAddress[];
}

interface AccountViewProps {
  user: AccountUser | null;
  authLoading: boolean;
  onAuthenticated: (user: AccountUser) => void;
  onLogout: () => void;
}

const sections: Array<{ id: AccountSection; label: string; icon: typeof UserRound }> = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'rentals', label: 'My Rentals', icon: RefreshCw },
  { id: 'payments', label: 'Payment history', icon: CreditCard },
  { id: 'refunds', label: 'Refund history', icon: ShieldCheck },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
];

export function AccountView({
  user,
  authLoading,
  onAuthenticated,
  onLogout,
}: AccountViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [section, setSection] = useState<AccountSection>('profile');
  const [overview, setOverview] = useState<AccountOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressLabel, setAddressLabel] = useState('Home');
  const [recipientName, setRecipientName] = useState('');
  const [addressPhone, setAddressPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');

  useEffect(() => {
    if (!user) {
      setOverview(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    apiFetch('/account/overview')
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.detail || 'Unable to load account history.');
        }
        if (active) {
          setOverview(data);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load account history.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = mode === 'register'
      ? { name, email, phone, password }
      : { email, password };

    try {
      const response = await apiFetch(`/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to sign in.');
      }
      onAuthenticated(data.user);
      setPassword('');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await apiFetch('/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: addressLabel,
          recipient_name: recipientName,
          phone: addressPhone,
          address_line1: addressLine1,
          address_line2: addressLine2,
          city,
          state,
          postal_code: postalCode,
          country,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to save address.');
      }
      setOverview((current) => current
        ? { ...current, addresses: [data.address, ...current.addresses] }
        : current);
      setAddressFormOpen(false);
      setRecipientName('');
      setAddressPhone('');
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('');
      setPostalCode('');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save address.');
    } finally {
      setSubmitting(false);
    }
  };

  const removeAddress = async (addressId: number) => {
    setError('');
    try {
      const response = await apiFetch(`/account/addresses/${addressId}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to remove address.');
      }
      setOverview((current) => current
        ? { ...current, addresses: current.addresses.filter((address) => address.id !== addressId) }
        : current);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to remove address.');
    }
  };

  if (authLoading) {
    return <div className="py-20 text-center text-sm text-ink-500">Loading your account…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto grid min-h-[68vh] max-w-5xl items-center gap-10 py-8 lg:grid-cols-[1fr_0.8fr]">
        <div className="max-w-xl">
          <p className="bookstore-kicker"><BookOpen className="h-4 w-4" /> Your BookVision shelf</p>
          <h1 className="bookstore-display mt-4 text-4xl leading-tight text-[#183629] sm:text-5xl">
            Your books, all in one place.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-ink-600 sm:text-base">
            Sign in to keep track of orders, rentals, payments, refunds, and saved addresses.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Benefit icon={<Package className="h-4 w-4" />} title="Order history" text="Follow every book purchase." />
            <Benefit icon={<RefreshCw className="h-4 w-4" />} title="Rental updates" text="Manage returns and refunds." />
          </div>
        </div>

        <section className="rounded-md border border-ink-200 bg-white p-6 shadow-soft sm:p-8">
          <div className="flex gap-2 border-b border-ink-100 pb-4">
            {(['login', 'register'] as const).map((authMode) => (
              <button
                type="button"
                key={authMode}
                aria-pressed={mode === authMode}
                onClick={() => { setMode(authMode); setError(''); }}
                className={`rounded-sm px-3 py-2 text-sm font-semibold ${mode === authMode ? 'bg-brand-700 text-white' : 'text-ink-600 hover:bg-ink-50'}`}
              >
                {authMode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <h2 className="bookstore-display mt-5 text-2xl text-ink-900">
            {mode === 'login' ? 'Welcome back' : 'Join BookVision'}
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            {mode === 'login' ? 'Sign in to view your account.' : 'Create an account to keep your reading history together.'}
          </p>

          <form onSubmit={submitAuth} className="mt-6 space-y-4">
            {mode === 'register' && (
              <Field label="Name">
                <input className="input" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
              </Field>
            )}
            <Field label="Email">
              <input className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            {mode === 'register' && (
              <Field label="Phone">
                <input className="input" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required minLength={7} maxLength={24} />
              </Field>
            )}
            <Field label="Password">
              <input className="input" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === 'register' ? 8 : 1} maxLength={128} />
            </Field>
            {error && <p role="alert" className="rounded-sm bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-ink-400">Your password is securely hashed and never returned by BookVision.</p>
        </section>
      </div>
    );
  }

  const data = overview;

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="bookstore-kicker"><UserRound className="h-4 w-4" /> BookVision account</p>
          <h1 className="bookstore-display mt-2 text-4xl text-[#183629]">Hello, {user.name}</h1>
          <p className="mt-1 text-sm text-ink-500">Your profile and reading activity.</p>
        </div>
        <button type="button" onClick={onLogout} className="btn-secondary">Sign out</button>
      </header>

      <nav className="flex gap-2 overflow-x-auto border-b border-ink-200 pb-3" aria-label="Account sections">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            aria-pressed={section === id}
            onClick={() => { setSection(id); setError(''); }}
            className={`inline-flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold ${section === id ? 'bg-brand-700 text-white' : 'text-ink-600 hover:bg-ink-100'}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>

      {error && <p role="alert" className="rounded-sm bg-danger-50 px-4 py-3 text-sm text-danger-700">{error}</p>}
      {loading || !data ? (
        <div className="py-16 text-center text-sm text-ink-500">Loading account history…</div>
      ) : (
        <section className="space-y-4">
          {section === 'profile' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <AccountValue label="Name" value={user.name} />
              <AccountValue label="Email" value={user.email} />
              <AccountValue label="Phone" value={user.phone} />
              <AccountValue label="Member since" value={formatDate(user.created_at)} />
            </div>
          )}

          {section === 'orders' && (
            <HistoryList
              empty="Your book orders will appear here."
              items={data.orders}
              render={(order) => (
                <HistoryRow
                  key={order.id}
                  title={order.product_name}
                  detail={`Order #${order.id} · Quantity ${order.quantity} · ${order.payment_status}`}
                  amount={formatCurrency(Number(order.total_amount))}
                  status={order.status}
                />
              )}
            />
          )}

          {section === 'rentals' && (
            <HistoryList
              empty="Your book rentals will appear here."
              items={data.rentals}
              render={(rental) => (
                <HistoryRow
                  key={rental.id}
                  title={rental.product_name}
                  detail={`Rental #${rental.id} · ${rental.delivery_status} · ${rental.customer_decision}`}
                  amount={formatCurrency(Number(rental.rental_fee) + Number(rental.membership_fee))}
                  status={rental.status}
                />
              )}
            />
          )}

          {section === 'payments' && (
            <HistoryList
              empty="Your BookVision payments will appear here."
              items={data.payments}
              render={(payment) => (
                <HistoryRow
                  key={`${payment.kind}-${payment.id}`}
                  title={payment.book_title}
                  detail={`${payment.kind === 'rental' ? 'Rental' : 'Purchase'} payment · ${payment.razorpay_payment_id || payment.razorpay_order_id}`}
                  amount={formatCurrency(Number(payment.amount))}
                  status={payment.status}
                />
              )}
            />
          )}

          {section === 'refunds' && (
            <HistoryList
              empty="Refunds will appear here after they are processed."
              items={data.refunds}
              render={(refund) => (
                <HistoryRow
                  key={refund.id}
                  title={refund.book_title}
                  detail={`Rental #${refund.rental_id} · ${refund.razorpay_refund_id || 'Refund'}`}
                  amount={formatCurrency(Number(refund.amount))}
                  status={refund.status}
                />
              )}
            />
          )}

          {section === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink-600">Saved delivery addresses</p>
                <button type="button" onClick={() => setAddressFormOpen((open) => !open)} className="btn-secondary">
                  <Plus className="h-4 w-4" /> Add address
                </button>
              </div>

              {addressFormOpen && (
                <form onSubmit={saveAddress} className="grid gap-3 rounded-md border border-ink-200 bg-white p-4 sm:grid-cols-2">
                  <Field label="Label"><input className="input" value={addressLabel} onChange={(event) => setAddressLabel(event.target.value)} required /></Field>
                  <Field label="Recipient"><input className="input" autoComplete="name" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} required /></Field>
                  <Field label="Phone"><input className="input" type="tel" autoComplete="tel" value={addressPhone} onChange={(event) => setAddressPhone(event.target.value)} required /></Field>
                  <Field label="Address line 1"><input className="input" autoComplete="address-line1" value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} required /></Field>
                  <Field label="Address line 2"><input className="input" autoComplete="address-line2" value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} /></Field>
                  <Field label="City"><input className="input" autoComplete="address-level2" value={city} onChange={(event) => setCity(event.target.value)} required /></Field>
                  <Field label="State"><input className="input" autoComplete="address-level1" value={state} onChange={(event) => setState(event.target.value)} required /></Field>
                  <Field label="Postal code"><input className="input" autoComplete="postal-code" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} required /></Field>
                  <Field label="Country"><input className="input" autoComplete="country-name" value={country} onChange={(event) => setCountry(event.target.value)} required /></Field>
                  <button type="submit" disabled={submitting} className="btn-primary sm:col-span-2">{submitting ? 'Saving…' : 'Save address'}</button>
                </form>
              )}

              {data.addresses.length === 0 ? (
                <EmptyState text="No saved addresses yet." />
              ) : data.addresses.map((address) => (
                <article key={address.id} className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-ink-200 bg-white p-4">
                  <div>
                    <p className="font-semibold text-ink-900">{address.label}{address.is_default ? ' · Default' : ''}</p>
                    <p className="mt-1 text-sm text-ink-700">{address.recipient_name} · {address.phone}</p>
                    <p className="text-sm text-ink-600">{address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ''}</p>
                    <p className="text-sm text-ink-600">{address.city}, {address.state} {address.postal_code}, {address.country}</p>
                  </div>
                  <button type="button" onClick={() => removeAddress(address.id)} className="btn-ghost text-danger-700" aria-label={`Remove ${address.label} address`}>
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-ink-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function AccountValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink-200 bg-white p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function HistoryList<T>({
  items,
  empty,
  render,
}: {
  items: T[];
  empty: string;
  render: (item: T) => React.ReactNode;
}) {
  return items.length ? (
    <div className="divide-y divide-ink-100 rounded-md border border-ink-200 bg-white px-4">
      {items.map(render)}
    </div>
  ) : <EmptyState text={empty} />;
}

function HistoryRow({
  title,
  detail,
  amount,
  status,
}: {
  title: string;
  detail: string;
  amount: string;
  status: string;
}) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="font-semibold text-ink-900">{title}</p>
        <p className="mt-1 break-all text-xs text-ink-500">{detail}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-ink-900">{amount}</p>
        <p className="mt-1 text-xs text-ink-500">{status}</p>
      </div>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-ink-300 px-4 py-10 text-center text-sm text-ink-500">{text}</p>;
}

function Benefit({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 border-t border-ink-200 pt-3">
      <span className="mt-0.5 text-brand-700">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-ink-800">{title}</p>
        <p className="mt-1 text-xs text-ink-500">{text}</p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
}