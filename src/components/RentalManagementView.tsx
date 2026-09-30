import { useEffect, useState } from 'react';
import {
  Package,
  Truck,
  CheckCircle,
  RefreshCw,
  RotateCcw,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

type Rental = {
  id: number;
  customer_id: string;
  product_id: string;
  product_name: string;
  rental_fee: number;
  ownership_price: number;
  rental_start_date: string;
  rental_end_date: string;
  status: string;
  delivery_status: string;
  customer_decision: string;
  payment_status: string;
  membership_fee: number;
  refund_amount: number;
  refund_status: string;
};

export default function RentalManagementView({
  onBack,
}: {
  onBack: () => void;
}) {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const loadRentals = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiFetch('/rentals');

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.detail || 'Unable to load rentals'
        );
      }

      setRentals(data.rentals || []);
    } catch (err: any) {
      console.error('Rental load error:', err);

      setError(
        err.message ||
          'Unable to load rental information.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRentals();
  }, []);

  // =====================================================
  // UPDATE DELIVERY
  // =====================================================

  const updateDelivery = async (
    rentalId: number,
    deliveryStatus: string
  ) => {
    try {
      setUpdating(true);
      setError('');

      const response = await apiFetch(
        `/rentals/${rentalId}/delivery`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            delivery_status: deliveryStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.detail ||
            'Unable to update delivery status'
        );
      }

      await loadRentals();
    } catch (err: any) {
      console.error(
        'Delivery update error:',
        err
      );

      setError(
        err.message ||
          'Unable to update delivery status.'
      );
    } finally {
      setUpdating(false);
    }
  };

  // =====================================================
  // KEEP / RETURN
  // =====================================================

  const chooseDecision = async (
    rentalId: number,
    decision: 'KEEP' | 'RETURN'
  ) => {
    const confirmed = window.confirm(
      decision === 'KEEP'
        ? 'Keep this book? The ₹500 deposit will be retained. No additional payment is due.'
        : 'Request a return? BookVision refunds ₹400 of the deposit after receiving the book and retains ₹100.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdating(true);
      setError('');

      const response = await apiFetch(
        `/rentals/${rentalId}/decision`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            decision,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.detail ||
            'Unable to update rental decision'
        );
      }

      await loadRentals();
    } catch (err: any) {
      console.error(
        'Rental decision error:',
        err
      );

      setError(
        err.message ||
          'Unable to update rental decision.'
      );
    } finally {
      setUpdating(false);
    }
  };

  const completeReturn = async (rentalId: number) => {
    const confirmed = window.confirm(
      'Confirm that BookVision received the returned book and process the ₹400 refund?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdating(true);
      setError('');

      const response = await apiFetch(
        `/rentals/${rentalId}/return/complete`,
        { method: 'POST' }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.detail || 'Unable to process the rental refund.'
        );
      }

      await loadRentals();
    } catch (err: any) {
      setError(err.message || 'Unable to process the rental refund.');
    } finally {
      setUpdating(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />

          <p className="mt-3 text-sm text-ink-500">
            Loading rentals...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN
  // =====================================================

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>
          <button
            onClick={onBack}
            className="mb-3 flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <h1 className="font-display text-2xl font-bold text-ink-900">
            Rental Management
          </h1>

          <p className="mt-1 text-sm text-ink-500">
            Track delivery and manage your active rentals.
          </p>
        </div>

        <button
          onClick={loadRentals}
          disabled={loading || updating}
          className="btn-secondary"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>

      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4 text-danger-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Rental update failed
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* EMPTY */}

      {rentals.length === 0 && (
        <div className="card p-10 text-center">

          <Package className="mx-auto h-10 w-10 text-ink-300" />

          <h2 className="mt-4 font-display text-lg font-bold text-ink-900">
            No rentals yet
          </h2>

          <p className="mt-1 text-sm text-ink-500">
            Your activated rentals will appear here.
          </p>

        </div>
      )}

      {/* RENTALS */}

      <div className="space-y-5">

        {rentals.map((rental) => {

          const delivery =
            rental.delivery_status?.toUpperCase() ||
            'PENDING';

          const decision =
            rental.customer_decision?.toUpperCase() ||
            'PENDING';

          const rentalStatus =
            rental.status?.toUpperCase() ||
            'ACTIVE';

          const owned =
            decision === 'KEEP' || rentalStatus === 'OWNED';

          const delivered =
            delivery === 'DELIVERED';

          const decisionPending =
            decision === 'PENDING';

          return (
            <div
              key={rental.id}
              className="card overflow-hidden"
            >

              {/* ================================================= */}
              {/* RENTAL HEADER */}
              {/* ================================================= */}

              <div className="border-b border-ink-100 bg-gradient-to-r from-brand-50/60 to-accent-50/30 p-5">

                <div className="flex flex-wrap items-center justify-between gap-4">

                  <div className="flex items-center gap-4">

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-soft">
                      <Package className="h-6 w-6 text-brand-600" />
                    </div>

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                        Rental #{rental.id}
                      </p>

                      <h2 className="font-display text-lg font-bold text-ink-900">
                        {rental.product_name}
                      </h2>

                    </div>

                  </div>

                  <span
                    className={
                      rentalStatus === 'ACTIVE' || owned
                        ? 'chip bg-success-50 text-success-700'
                        : 'chip bg-warning-50 text-warning-700'
                    }
                  >
                    {owned ? 'OWNED' : rentalStatus}
                  </span>

                </div>

              </div>

              {/* ================================================= */}
              {/* RENTAL DETAILS */}
              {/* ================================================= */}

              <div className="grid gap-5 p-5 md:grid-cols-2">

                {/* LEFT */}

                <div className="space-y-3">

                  <Detail
                    label="Payment"
                    value={rental.payment_status}
                  />

                  <Detail
                    label="Rental fee"
                    value={`₹${Number(
                      rental.rental_fee
                    ).toLocaleString('en-IN')}`}
                  />

                  <Detail
                    label="Membership/security deposit"
                    value={`₹${Number(
                      rental.membership_fee
                    ).toLocaleString('en-IN')}`}
                  />

                  <Detail
                    label="Refund after book is received"
                    value={`₹${Number(
                      rental.refund_amount || 400
                    ).toLocaleString('en-IN')}`}
                  />

                  <Detail
                    label="Start date"
                    value={rental.rental_start_date}
                  />

                  <Detail
                    label="End date"
                    value={rental.rental_end_date}
                  />

                </div>

                {/* RIGHT */}

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Rental lifecycle
                  </p>

                  <div className="mt-4 space-y-4">

                    {/* PAYMENT */}

                    <TimelineStep
                      icon={
                        <CheckCircle className="h-4 w-4" />
                      }
                      title="Payment completed"
                      active={
                        rental.payment_status ===
                        'PAID'
                      }
                      description="Rental payment verified"
                    />

                    {/* DELIVERY */}

                    <TimelineStep
                      icon={
                        <Truck className="h-4 w-4" />
                      }
                      title="Delivery"
                      active={delivered}
                      description={delivery.split('_').join(' ')}
                    />

                    {/* RENTAL */}

                    <TimelineStep
                      icon={
                        <RefreshCw className="h-4 w-4" />
                      }
                      title={owned ? 'Book owned' : 'Rental active'}
                      active={
                        rentalStatus === 'ACTIVE' || owned
                      }
                      description={owned
                        ? 'No additional payment required'
                        : `${Math.max(
                            0,
                            Math.ceil(
                              (new Date(
                                rental.rental_end_date
                              ).getTime() -
                                new Date().getTime()) /
                                (1000 * 60 * 60 * 24)
                            )
                          )} days remaining`}
                    />

                  </div>

                </div>

              </div>

              {/* ================================================= */}
              {/* DELIVERY CONTROLS */}
              {/* ================================================= */}

              <div className="border-t border-ink-100 p-5">

                <p className="text-sm font-semibold text-ink-900">
                  Delivery status
                </p>

                <div className="mt-3 flex flex-wrap gap-2">

                  <button
                    disabled={
                      updating ||
                      delivery !== 'PENDING'
                    }
                    onClick={() =>
                      updateDelivery(
                        rental.id,
                        'OUT_FOR_DELIVERY'
                      )
                    }
                    className={cnButton(
                      delivery ===
                        'OUT_FOR_DELIVERY'
                    )}
                  >
                    <Truck className="h-4 w-4" />
                    Out for delivery
                  </button>

                  <button
                    disabled={
                      updating ||
                      delivery !==
                        'OUT_FOR_DELIVERY'
                    }
                    onClick={() =>
                      updateDelivery(
                        rental.id,
                        'DELIVERED'
                      )
                    }
                    className={cnButton(
                      delivery === 'DELIVERED'
                    )}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Delivered
                  </button>

                </div>

              </div>

              {/* ================================================= */}
              {/* KEEP / RETURN */}
              {/* ================================================= */}

              <div className="border-t border-ink-100 bg-ink-50/50 p-5">

                <div className="flex flex-wrap items-center justify-between gap-4">

                  <div>

                    <p className="text-sm font-semibold text-ink-900">
                      Keep or return
                    </p>

                    <p className="mt-1 text-xs text-ink-500">

                      {delivered
                        ? decisionPending
                          ? 'Keep the book with no additional payment, or return it for a ₹400 deposit refund after receipt.'
                          : decision === 'KEEP'
                            ? 'This book is yours. The ₹500 deposit is retained; no additional payment is required.'
                            : `Decision: ${decision}`
                        : 'Keep or return options are available after the book is delivered.'}

                    </p>

                  </div>

                  <div className="flex gap-2">

                    <button
                      disabled={
                        updating ||
                        !delivered ||
                        !decisionPending
                      }
                      onClick={() =>
                        chooseDecision(
                          rental.id,
                          'KEEP'
                        )
                      }
                      className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Keep
                    </button>

                    <button
                      disabled={
                        updating ||
                        !delivered ||
                        !decisionPending
                      }
                      onClick={() =>
                        chooseDecision(
                          rental.id,
                          'RETURN'
                        )
                      }
                      className="flex items-center gap-2 rounded-xl border border-danger-200 bg-danger-50 px-4 py-2.5 text-sm font-semibold text-danger-700 transition hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Return
                    </button>

                  </div>

                </div>

                {/* KEPT BOOK */}

                {decision === 'KEEP' && (
                  <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">

                    <p className="text-sm font-semibold text-brand-800">
                      Book kept
                    </p>

                    <p className="mt-1 text-sm text-brand-700">
                      The book is yours. ₹500 of your deposit is retained; no
                      additional payment is required.
                    </p>

                  </div>
                )}

                {/* RETURN */}

                {decision === 'RETURN' && (
                  <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 p-4">

                    <p className="text-sm font-semibold text-warning-800">
                      Return request created
                    </p>

                    <p className="mt-1 text-sm text-warning-700">
                      Return the book to BookVision. ₹400 is refunded after receipt; ₹100 of the deposit is retained. Refund status: {rental.refund_status}.
                    </p>

                    {rental.refund_status === 'PENDING' && (
                      <button
                        disabled={updating}
                        onClick={() => completeReturn(rental.id)}
                        className="mt-3 rounded-lg bg-warning-700 px-4 py-2 text-sm font-semibold text-white hover:bg-warning-800 disabled:opacity-50"
                      >
                        Confirm book received and refund ₹
                        {Number(rental.refund_amount).toLocaleString('en-IN')}
                      </button>
                    )}

                    {rental.refund_status === 'PROCESSED' && (
                      <p className="mt-2 text-sm font-semibold text-success-700">
                        ₹
                        {Number(rental.refund_amount).toLocaleString('en-IN')}
                        {' '}refunded after receipt. ₹100 retained by BookVision.
                      </p>
                    )}

                  </div>
                )}

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}


// =========================================================
// SMALL COMPONENTS
// =========================================================

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3">

      <span className="text-sm text-ink-500">
        {label}
      </span>

      <span className="text-sm font-semibold text-ink-900">
        {value}
      </span>

    </div>
  );
}


function TimelineStep({
  icon,
  title,
  active,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  active: boolean;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">

      <div
        className={
          active
            ? 'flex h-9 w-9 items-center justify-center rounded-full bg-success-100 text-success-700'
            : 'flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-400'
        }
      >
        {icon}
      </div>

      <div>

        <p
          className={
            active
              ? 'text-sm font-semibold text-ink-900'
              : 'text-sm font-medium text-ink-500'
          }
        >
          {title}
        </p>

        <p className="text-xs capitalize text-ink-400">
          {description}
        </p>

      </div>

    </div>
  );
}


function cnButton(active: boolean) {
  return active
    ? 'flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white'
    : 'flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40';
}