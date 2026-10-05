import { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Search, Users } from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface CustomerRecord {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  order_count: number;
  rental_count: number;
  purchase_count: number;
  purchase_total: number;
  rental_total: number;
}

export function CustomersView() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch('/admin/customers')
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.detail || 'Unable to load customer records.');
        }
        if (active) setCustomers(Array.isArray(data?.customers) ? data.customers : []);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load customer records.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.phone].some((value) => value.toLowerCase().includes(query))
    );
  }, [customers, search]);

  const totalRevenue = customers.reduce(
    (total, customer) => total + Number(customer.purchase_total) + Number(customer.rental_total),
    0,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Developer workspace</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-900">Customer details</h1>
          <p className="mt-1 text-sm text-ink-500">Private customer account and purchase overview.</p>
        </div>
        <label className="relative block w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-400"
            placeholder="Search name, email, or phone"
            aria-label="Search customers"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Users className="h-5 w-5" /></span>
          <div><p className="text-xs text-ink-500">Customer accounts</p><p className="font-display text-2xl font-bold text-ink-900">{loading ? '—' : customers.length}</p></div>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-500">Recorded paid revenue</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink-900">{loading ? '—' : formatCurrency(totalRevenue)}</p>
          <p className="mt-1 text-xs text-ink-400">Purchases and rentals from customer accounts</p>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div>}

      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 px-5 py-4">
          <h2 className="font-semibold text-ink-900">Registered customers</h2>
        </div>
        {loading ? (
          <p className="p-8 text-center text-sm text-ink-500">Loading customer records…</p>
        ) : filteredCustomers.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-500">{customers.length ? 'No customers match your search.' : 'No customer accounts yet.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 font-semibold">Orders / rentals</th>
                  <th className="px-5 py-3 text-right font-semibold">Paid total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="align-top hover:bg-ink-50/60">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink-900">{customer.name}</p>
                      <a className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-brand-700" href={`mailto:${customer.email}`}><Mail className="h-3.5 w-3.5" />{customer.email}</a>
                      <a className="mt-1 flex items-center gap-1.5 text-xs text-ink-500 hover:text-brand-700" href={`tel:${customer.phone}`}><Phone className="h-3.5 w-3.5" />{customer.phone}</a>
                    </td>
                    <td className="px-5 py-4 text-ink-600">{new Date(customer.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-ink-600">{customer.order_count} orders · {customer.rental_count} rentals</td>
                    <td className="px-5 py-4 text-right font-semibold text-ink-900">{formatCurrency(Number(customer.purchase_total) + Number(customer.rental_total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
