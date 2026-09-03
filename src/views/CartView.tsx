import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Package,
} from 'lucide-react';

import type { Product } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

export interface CartItem {
  product: Product;
  quantity: number;
}

export function CartView({
  cart,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}: {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: (product: Product, quantity: number) => void;
}) {
  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  if (cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card w-full max-w-md p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
            <ShoppingCart className="h-8 w-8 text-brand-600" />
          </div>

          <h2 className="mt-5 font-display text-xl font-bold text-ink-900">
            Your cart is empty
          </h2>

          <p className="mt-2 text-sm text-ink-500">
            Add products from the AI Buyer to start shopping.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Shopping Cart
        </h1>

        <p className="mt-1 text-sm text-ink-500">
          {totalItems} item{totalItems !== 1 ? 's' : ''} in your cart
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Cart items */}
        <div className="space-y-4 lg:col-span-2">

          {cart.map((item) => {
            const { product, quantity } = item;

            const itemTotal = product.price * quantity;

            return (
              <div
                key={product.id}
                className="card card-hover p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

                  {/* Product icon */}
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-4xl">
                    📦
                  </div>

                  {/* Product details */}
                  <div className="min-w-0 flex-1">

                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                      {product.category}
                    </p>

                    <p className="mt-1 text-base font-semibold text-ink-900">
                      {product.name}
                    </p>

                    <p className="mt-1 text-sm text-ink-500">
                      {formatCurrency(product.price)} each
                    </p>

                    <div className="mt-2">
                      {product.inStock ? (
                        <span className="chip bg-success-50 text-success-700">
                          <Package className="h-3 w-3" />
                          {product.stockCount} in stock
                        </span>
                      ) : (
                        <span className="chip bg-danger-50 text-danger-600">
                          Out of stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-2">

                    <button
                      onClick={() =>
                        onUpdateQuantity(
                          product.id,
                          Math.max(1, quantity - 1)
                        )
                      }
                      disabled={quantity <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white hover:bg-ink-50 disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <span className="flex h-9 min-w-10 items-center justify-center rounded-lg bg-ink-50 px-3 text-sm font-bold text-ink-900">
                      {quantity}
                    </span>

                    <button
                      onClick={() =>
                        onUpdateQuantity(
                          product.id,
                          Math.min(
                            product.stockCount,
                            quantity + 1
                          )
                        )
                      }
                      disabled={
                        quantity >= product.stockCount
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white hover:bg-ink-50 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>

                  </div>

                  {/* Price + remove */}
                  <div className="flex items-center justify-between gap-5 sm:block sm:text-right">

                    <p className="font-display text-lg font-bold text-ink-900">
                      {formatCurrency(itemTotal)}
                    </p>

                    <button
                      onClick={() => onRemove(product.id)}
                      className="mt-2 flex items-center gap-1 text-xs font-medium text-danger-600 hover:text-danger-700 sm:ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>

                  </div>

                </div>
              </div>
            );
          })}

        </div>

        {/* Summary */}
        <div className="lg:col-span-1">

          <div className="card sticky top-24 p-5">

            <h2 className="font-display text-base font-bold text-ink-900">
              Order Summary
            </h2>

            <div className="mt-4 space-y-3">

              <div className="flex justify-between text-sm">
                <span className="text-ink-500">
                  Items
                </span>

                <span className="font-medium text-ink-900">
                  {totalItems}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-ink-500">
                  Subtotal
                </span>

                <span className="font-medium text-ink-900">
                  {formatCurrency(total)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-ink-500">
                  Delivery
                </span>

                <span className="font-medium text-success-600">
                  FREE
                </span>
              </div>

              <div className="border-t border-ink-100 pt-3">
                <div className="flex justify-between">

                  <span className="font-semibold text-ink-900">
                    Total
                  </span>

                  <span className="font-display text-xl font-bold text-ink-900">
                    {formatCurrency(total)}
                  </span>

                </div>
              </div>

            </div>

            {/* Checkout */}
            <button
              onClick={() => {
                const firstItem = cart[0];

                onCheckout(
                  firstItem.product,
                  firstItem.quantity
                );
              }}
              className="btn-primary mt-5 w-full"
            >
              Proceed to checkout
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="mt-3 text-center text-[11px] text-ink-400">
              Payment requires your explicit approval.
            </p>

          </div>

        </div>

      </div>
    </div>
  );
}