

import { useEffect, useState } from 'react';
import { Package, RefreshCw, CheckCircle2, Clock, CreditCard } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

interface Order {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  total_amount: number;
  status: string;
  payment_status: string;
}

interface RentalOrder {
  id: number;
  product_name: string;
  rental_fee: number;
  membership_fee: number;
  status: string;
  payment_status: string;
  delivery_status: string;
  customer_decision: string;
  refund_amount: number;
  refund_status: string;
}

export function OrdersView({
  onManageRentals,
}: {
  onManageRentals: () => void;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [rentals, setRentals] = useState<RentalOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const [ordersResponse, rentalsResponse] = await Promise.all([
        apiFetch('/orders'),
        apiFetch('/rentals'),
      ]);

      if (!ordersResponse.ok || !rentalsResponse.ok) {
        throw new Error('Failed to fetch orders');
      }

      const [ordersData, rentalsData] = await Promise.all([
        ordersResponse.json(),
        rentalsResponse.json(),
      ]);

      setOrders(ordersData);
      setRentals(rentalsData.rentals || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-brand-500" />
          <p className="mt-3 text-sm text-ink-500">
            Loading orders...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Orders
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Orders created by your AI commerce agent
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="btn-secondary"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>

        <button
          onClick={onManageRentals}
          className="btn-secondary"
        >
          <RefreshCw className="h-4 w-4" />
          Manage rentals
        </button>
      </div>

      {orders.length === 0 && rentals.length === 0 ? (
        <div className="card p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-ink-300" />

          <h2 className="mt-4 font-display text-lg font-bold text-ink-900">
            No orders yet
          </h2>

          <p className="mt-1 text-sm text-ink-500">
            Orders created by the AI agent will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">

          {orders.map((order) => (
            <div
              key={order.id}
              className="card card-hover p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                    <Package className="h-6 w-6 text-brand-600" />
                  </div>

                  <div>
                    <p className="font-semibold text-ink-900">
                      {order.product_name}
                    </p>

                    <p className="mt-1 text-xs text-ink-400">
                      Order #{order.id} · Quantity: {order.quantity}
                    </p>
                  </div>

                </div>

                <div className="text-left md:text-right">

                  <p className="font-display text-xl font-bold text-ink-900">
                    {formatCurrency(order.total_amount)}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2 md:justify-end">

                    <span
                      className={cn(
                        'chip',
                        order.status === 'PENDING'
                          ? 'bg-warning-50 text-warning-700'
                          : 'bg-success-50 text-success-700'
                      )}
                    >
                      {order.status === 'PENDING' ? (
                        <Clock className="h-3 w-3" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}

                      {order.status}
                    </span>

                    <span
                      className={cn(
                        'chip',
                        order.payment_status === 'PAID'
                          ? 'bg-success-50 text-success-700'
                          : 'bg-ink-100 text-ink-600'
                      )}
                    >
                      <CreditCard className="h-3 w-3" />
                      {order.payment_status}
                    </span>

                  </div>

                </div>

              </div>
            </div>
          ))}

        </div>
      )}

      {rentals.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">
              Rentals
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Rental payments and delivery decisions
            </p>
          </div>

          <div className="grid gap-4">
            {rentals.map((rental) => (
              <div
                key={`rental-${rental.id}`}
                className="card card-hover p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                      <RefreshCw className="h-6 w-6 text-brand-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900">
                        {rental.product_name}
                      </p>
                      <p className="mt-1 text-xs text-ink-400">
                        Rental #{rental.id}
                      </p>
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="font-display text-xl font-bold text-ink-900">
                      {formatCurrency(
                        Number(rental.rental_fee) +
                          Number(rental.membership_fee)
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 md:justify-end">
                      <span className="chip bg-success-50 text-success-700">
                        <CreditCard className="h-3 w-3" />
                        {rental.payment_status}
                      </span>
                      <span className="chip bg-ink-100 text-ink-600">
                        Delivery: {rental.delivery_status.split('_').join(' ')}
                      </span>
                      <span className="chip bg-brand-50 text-brand-700">
                        {rental.customer_decision === 'PENDING'
                          ? 'Decision pending'
                          : rental.customer_decision}
                      </span>
                    </div>
                    {rental.refund_status === 'PENDING' && (
                      <p className="mt-2 text-xs font-medium text-warning-700">
                        Refund pending: {formatCurrency(rental.refund_amount)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}

