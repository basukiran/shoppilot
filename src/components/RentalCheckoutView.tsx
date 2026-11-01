import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, MessageCircle, QrCode, Smartphone } from 'lucide-react';
import type { Product } from '../types';
import { createUpiPaymentLink } from '../lib/upi';
import { AuthorByline } from './AuthorByline';

interface RentalCheckoutViewProps {
  product: Product;
  quantity: number;
  onBack: () => void;
  // Kept for compatibility with the parent view; manual UPI is not auto-verified.
  onSuccess?: (data: any) => void;
}

type ReaderType = 'REGULAR_READER' | 'SPECIFIC_BOOK_READER';

export default function RentalCheckoutView({ product, quantity, onBack }: RentalCheckoutViewProps) {
  const [readerType, setReaderType] = useState<ReaderType>('REGULAR_READER');
  const [showQr, setShowQr] = useState(false);

  const membershipFee = 500;
  const rentalFee = (product.rentalPrice ?? 0) * quantity;
  const totalAmount = membershipFee + rentalFee;
  const rentalDuration = product.rentalDurationDays ?? 30;
  const upiPaymentHref = createUpiPaymentLink(totalAmount, `Book rental: ${product.name}`);

  const whatsappHref = useMemo(() => {
    const message = [
      'Hello Jnana Nidhi, I have paid for a book rental by UPI.',
      `Book: ${product.name}`,
      `Quantity: ${quantity}`,
      `Plan: ${readerType === 'REGULAR_READER' ? 'Regular Reader' : 'Specific Book Reader'}`,
      `Amount: ₹${totalAmount.toLocaleString('en-IN')}`,
      'I will share the UPI transaction reference/receipt for confirmation.',
    ].join('\n');
    return `https://wa.me/919071111074?text=${encodeURIComponent(message)}`;
  }, [product.name, quantity, readerType, totalAmount]);

  const readerDetails: Record<ReaderType, { label: string; subtitle: string; description: string; refund: string }> = {
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

  return (
    <div className="min-h-full bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back to books
        </button>

        <h1 className="text-2xl font-bold text-gray-900">Rental Checkout</h1>
        <p className="mt-1 text-gray-500">Choose your reader plan, then scan the UPI code to pay.</p>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex gap-5">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-4xl">
                <span aria-hidden="true">📚</span>
                {product.coverImage && <img src={product.coverImage} alt={`${product.name} cover`} className="absolute inset-0 h-full w-full object-contain" />}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">RENTABLE</span>
                </div>
                {product.author && <AuthorByline author={product.author} className="mt-1 text-sm text-gray-500" />}
                <p className="mt-1 text-sm text-gray-500">Quantity: {quantity}</p>
                <p className="mt-3 text-sm text-gray-600">Rental period: <strong className="ml-1">{rentalDuration} days</strong></p>
              </div>
            </div>

            <div className="mt-6 border-t pt-6">
              <h3 className="font-semibold text-gray-900">Reader plan</h3>
              <div className="mt-4 grid gap-3">
                {(Object.entries(readerDetails) as [ReaderType, (typeof readerDetails)[ReaderType]][]).map(([key, plan]) => {
                  const selected = readerType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setReaderType(key); setShowQr(false); }}
                      className={`rounded-xl border p-4 text-left transition ${selected ? 'border-violet-700 bg-violet-900 text-white' : 'border-gray-200 bg-white text-gray-900 hover:border-violet-300'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{plan.label}</p>
                          <p className={selected ? 'mt-1 text-sm text-violet-100' : 'mt-1 text-sm text-gray-500'}>{plan.subtitle}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${selected ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'}`}>{plan.refund}</span>
                      </div>
                      <p className={selected ? 'mt-3 text-sm text-violet-100' : 'mt-3 text-sm text-gray-600'}>{plan.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Membership / security deposit</span><span className="font-medium">₹{membershipFee.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Book rental</span><span className="font-medium">₹{rentalFee.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between border-t pt-3 text-base"><span className="font-semibold">Total upfront</span><span className="font-bold">₹{totalAmount.toLocaleString('en-IN')}</span></div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-pink-50 p-4">
              <p className="text-sm font-semibold text-fuchsia-950">At the end of your rental</p>
              <p className="mt-1 text-sm leading-6 text-fuchsia-900">
                <strong>Keep:</strong> the book becomes yours and the actual purchase price is recorded against it.<br />
                <strong>Return:</strong> {readerType === 'REGULAR_READER' ? 'Regular Reader plans do not receive an early refund.' : 'Specific Book Reader plans can receive a ₹300 refund after the returned book is received and validated.'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-gray-900">Payment Summary</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Membership / deposit</span><span>₹{membershipFee}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Rental · {rentalDuration} days</span><span>₹{rentalFee}</span></div>
              <div className="flex justify-between border-t pt-4 text-lg font-bold"><span>Total to pay</span><span>₹{totalAmount.toLocaleString('en-IN')}</span></div>
            </div>

            {!showQr ? (
              <button
                type="button"
                onClick={() => setShowQr(true)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-800 px-5 py-3 font-semibold text-white transition hover:bg-violet-900"
              >
                <QrCode className="h-5 w-5" /> Show UPI scanner
              </button>
            ) : (
              <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-center">
                <h3 className="font-bold text-gray-900">Scan to pay ₹{totalAmount.toLocaleString('en-IN')}</h3>
                <p className="mt-1 text-xs leading-5 text-gray-600">Pay directly from this phone, or scan the QR from another device.</p>
                <a href={upiPaymentHref} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5f259f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4b1d80]">
                  <Smartphone className="h-4 w-4" /> Pay ₹{totalAmount.toLocaleString('en-IN')} with PhonePe / UPI
                </a>
                <p className="mt-3 text-xs font-medium text-gray-700">Or scan this UPI code from another device:</p>
                <a href={upiPaymentHref} aria-label="Open PhonePe or another UPI app to pay for this rental" title="Tap to open PhonePe or another UPI app">
                  <img src="/rental-upi-qr.png" alt="Tap to open a UPI app or scan this QR from another device" className="mx-auto mt-4 w-full max-w-[280px] cursor-pointer rounded-xl" />
                </a>
                <div className="mt-4 rounded-xl bg-amber-50 p-3 text-left text-xs leading-5 text-amber-900">
                  Payment is not confirmed automatically from this static QR. After paying, share your UPI transaction reference or receipt with Jnana Nidhi. The rental activates after the payment is checked.
                </div>
                <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800">
                  <MessageCircle className="h-4 w-4" /> Share payment reference on WhatsApp
                </a>
                <p className="mt-3 text-[11px] leading-4 text-gray-500">Do not share your UPI PIN or OTP. Never approve a collect request to receive a refund.</p>
              </div>
            )}

            <p className="mt-4 text-center text-xs text-gray-500">
              {showQr ? 'Rental activation happens after manual payment confirmation.' : 'The scanner will appear here; your selected plan stays unchanged.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
