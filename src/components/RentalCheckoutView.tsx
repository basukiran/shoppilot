import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  CreditCard,
} from 'lucide-react';
import type { Product } from '../types';
import { apiFetch, normalizeProductId } from '../lib/api';

interface RentalCheckoutViewProps {
  product: Product;
  quantity: number;
  onBack: () => void;
  onSuccess?: (data: any) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RAZORPAY_SCRIPT =
  'https://checkout.razorpay.com/v1/checkout.js';

export default function RentalCheckoutView({
  product,
  quantity,
  onBack,
  onSuccess,
}: RentalCheckoutViewProps) {
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [readerType, setReaderType] = useState<'REGULAR_READER' | 'SPECIFIC_BOOK_READER'>('REGULAR_READER');

  const membershipFee = 500;

  const rentalFee =
    (product.rentalPrice ?? 0) * quantity;

  const totalAmount =
    membershipFee + rentalFee;
  const rentalDuration =
    product.rentalDurationDays ?? 30;

  const readerDetails = {
    REGULAR_READER: {
      label: 'Regular Reader',
      subtitle: 'Annual membership · ₹500',
      description: 'Access rentals for 1 year with no early refund.',
      refund: 'No early refund.',
    },
    SPECIFIC_BOOK_READER: {
      label: 'Specific Book Reader',
      subtitle: '1-month rental plan · ₹500',
      description: 'Book-specific membership with a ₹300 refund after the returned book is received and verified.',
      refund: 'Up to ₹300 refund after return confirmation.',
    },
  };

  const loadRazorpay = () => {
    return new Promise<boolean>((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');

      script.src = RAZORPAY_SCRIPT;

      script.onload = () => resolve(true);

      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    setProcessing(true);
    setError('');

    try {
      const normalizedProductId = normalizeProductId(product.id);

      if (normalizedProductId === null) {
        throw new Error('Invalid product ID for rental checkout.');
      }

      const razorpayLoaded = await loadRazorpay();

      if (!razorpayLoaded) {
        throw new Error('Unable to load payment gateway.');
      }

      // ---------------------------------------------
      // CREATE RENTAL PAYMENT
      // ---------------------------------------------

      const createResponse = await apiFetch(
        `/rental/payment/create?product_id=${normalizedProductId}&quantity=${quantity}&reader_type=${readerType}`,
        {
          method: 'POST',
        }
      );

      const createData = await createResponse.json();

      if (!createResponse.ok || !createData.success) {
        throw new Error(
          createData.detail ||
          'Unable to create rental payment.'
        );
      }

      // ---------------------------------------------
      // OPEN RAZORPAY
      // ---------------------------------------------

      const options = {
        key: createData.key_id,

        amount: createData.amount,

        currency: createData.currency,

        name: 'BookVision',

        description:
          `Rental of ${createData.product}`,

        order_id:
          createData.razorpay_order_id,

        notes: {
          type: 'rental',
          product_id: String(normalizedProductId),
          quantity: String(quantity),
        },

        handler: async (response: any) => {
          try {
            // ---------------------------------------
            // VERIFY PAYMENT
            // ---------------------------------------

            const verifyResponse = await apiFetch(
              '/rental/payment/verify',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body: JSON.stringify({
                  razorpay_order_id:
                    response.razorpay_order_id,

                  razorpay_payment_id:
                    response.razorpay_payment_id,

                  razorpay_signature:
                    response.razorpay_signature,
                }),
              }
            );

            const verifyData =
              await verifyResponse.json();

            if (
              !verifyResponse.ok ||
              !verifyData.success
            ) {
              throw new Error(
                verifyData.detail ||
                'Rental payment verification failed.'
              );
            }

            setSuccess(true);

            if (onSuccess) {
              onSuccess(verifyData);
            }
          } catch (err: any) {
            setError(
              err.message ||
              'Payment verification failed.'
            );
          } finally {
            setProcessing(false);
          }
        },

        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },

        theme: {
          color: '#111827',
        },
      };

      const razorpay =
        new window.Razorpay(options);

      razorpay.on(
        'payment.failed',
        (response: any) => {
          console.error(
            'Rental payment failed:',
            response
          );

          setError(
            'Rental payment failed. Please try again.'
          );

          setProcessing(false);
        }
      );

      razorpay.open();

    } catch (err: any) {
      console.error(
        'Rental checkout error:',
        err
      );

      setError(
        err.message ||
        'Something went wrong.'
      );

      setProcessing(false);
    }
  };

  // ---------------------------------------------
  // SUCCESS SCREEN
  // ---------------------------------------------

  if (success) {
    return (
      <div className="min-h-full bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl">

          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle
                className="h-9 w-9 text-green-600"
              />
            </div>

            <h1 className="text-2xl font-bold text-gray-900">
              Book Rental Activated
            </h1>

            <p className="mt-2 text-gray-600">
              Your book rental payment was successful.
            </p>

            <div className="mt-6 rounded-xl bg-gray-50 p-5 text-left">

              <div className="flex justify-between">
                <span>Book</span>
                <strong>{product.name}</strong>
              </div>

              <div className="mt-3 flex justify-between">
                <span>Rental period</span>
                <strong>
                  {rentalDuration} days
                </strong>
              </div>

              <div className="mt-3 flex justify-between">
                <span>Delivery status</span>
                <strong className="text-orange-600">
                  Pending
                </strong>
              </div>

              <div className="mt-3 flex justify-between">
                <span>Rental status</span>
                <strong className="text-green-600">
                  Active
                </strong>
              </div>

            </div>

            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-left">
              <p className="font-semibold text-blue-900">
                {readerType === 'REGULAR_READER' ? 'Regular Reader' : 'Specific Book Reader'} plan active
              </p>
              <p className="mt-2 text-sm text-blue-800">
                {readerType === 'REGULAR_READER'
                  ? 'Your membership is valid for 1 year. You pay the rental fee and keep the book as needed, with no early refund.'
                  : 'Your rental is for one month. When the book is returned and confirmed, a ₹300 refund can be processed for the specific-book plan.'}
              </p>
            </div>

            <button
              onClick={onBack}
              className="mt-6 w-full rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-800"
            >
              Back to AI Buyer
            </button>

          </div>

        </div>
      </div>
    );
  }

  // ---------------------------------------------
  // CHECKOUT SCREEN
  // ---------------------------------------------

  return (
    <div className="min-h-full bg-gray-50 p-6">

      <div className="mx-auto max-w-4xl">

        {/* HEADER */}

        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to AI Buyer
        </button>

        <h1 className="text-2xl font-bold text-gray-900">
          Rental Checkout
        </h1>

        <p className="mt-1 text-gray-500">
          Review your 30-day book rental before payment.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-3">

          {/* PRODUCT */}

          <div className="md:col-span-2 rounded-2xl bg-white p-6 shadow-sm">

            <div className="flex gap-5">

              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-4xl">
                <span>📚</span>
                {product.coverImage && (
                  <img
                    src={product.coverImage}
                    alt={`${product.name} cover`}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )}
              </div>

              <div className="flex-1">

                <div className="flex items-center gap-2">

                  <h2 className="text-lg font-bold text-gray-900">
                    {product.name}
                  </h2>

                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                    RENTABLE
                  </span>

                </div>

                <p className="mt-1 text-sm text-gray-500">
                  {product.author && `by ${product.author} · `}
                  Quantity: {quantity}
                </p>

                <p className="mt-3 text-sm text-gray-600">
                  Rental period:
                  <strong className="ml-1">
                    {rentalDuration} days
                  </strong>
                </p>

              </div>

            </div>

            {/* RENTAL DETAILS */}

            <div className="mt-6 border-t pt-6">

              <h3 className="font-semibold text-gray-900">
                Reader plan
              </h3>

              <div className="mt-4 grid gap-3">
                {Object.entries(readerDetails).map(([key, plan]) => {
                  const isSelected = readerType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setReaderType(key as 'REGULAR_READER' | 'SPECIFIC_BOOK_READER')}
                      className={[
                        'rounded-xl border p-4 text-left transition',
                        isSelected
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{plan.label}</p>
                          <p className={isSelected ? 'mt-1 text-sm text-gray-200' : 'mt-1 text-sm text-gray-500'}>{plan.subtitle}</p>
                        </div>
                        <span className={[
                          'rounded-full px-2 py-1 text-xs font-semibold',
                          isSelected ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700',
                        ].join(' ')}>{plan.refund}</span>
                      </div>
                      <p className={isSelected ? 'mt-3 text-sm text-gray-200' : 'mt-3 text-sm text-gray-600'}>{plan.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 space-y-3 text-sm">

                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Membership / security deposit
                  </span>

                  <span className="font-medium">
                    ₹{membershipFee.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">
                    One-month book rental
                  </span>

                  <span className="font-medium">
                    ₹{rentalFee.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="border-t pt-3 flex justify-between text-base">
                  <span className="font-semibold">
                    Total upfront
                  </span>

                  <span className="font-bold">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>

              </div>

            </div>

            {/* KEEP OR RETURN TERMS */}

            <div className="mt-6 rounded-xl bg-yellow-50 p-4">

              <p className="text-sm font-semibold text-yellow-900">
                At the end of your rental
              </p>

              <p className="mt-1 text-sm leading-6 text-yellow-800">
                <strong>Keep:</strong> the book becomes yours and the actual purchase price is recorded against the book.
                <br />
                <strong>Return:</strong> {readerType === 'REGULAR_READER'
                  ? 'Regular Reader plans do not receive an early refund.'
                  : 'Specific Book Reader plans can receive a ₹300 refund after the returned book is received and validated.'}
              </p>

            </div>

          </div>

          {/* PAYMENT SUMMARY */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="font-bold text-gray-900">
              Payment Summary
            </h2>

            <div className="mt-5 space-y-3 text-sm">

              <div className="flex justify-between">
                <span className="text-gray-600">
                    Deposit
                </span>

                <span>
                  ₹{membershipFee}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">
                    Rental · {rentalDuration} days
                </span>

                <span>
                  ₹{rentalFee}
                </span>
              </div>

              <div className="border-t pt-4 flex justify-between text-lg font-bold">
                <span>Total upfront</span>

                <span>
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>

            </div>

            {error && (
              <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={processing}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CreditCard className="h-5 w-5" />

              {processing
                ? 'Processing...'
                : `Pay ₹${totalAmount.toLocaleString('en-IN')} upfront`}
            </button>

            <p className="mt-4 text-center text-xs text-gray-500">
              Secure payment powered by Razorpay
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}