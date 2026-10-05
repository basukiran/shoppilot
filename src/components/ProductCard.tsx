import { useState } from 'react';
import {
  Star,
  ShoppingCart,
  Heart,
  Check,
  X,
  TrendingUp,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react';

import type { Product } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { getCoverPlaceholder } from '@/lib/bookCovers';

const iconMap: Record<string, string> = {
  book: '📚',
  default: '📚',
};

export function ProductCard({
  product,
  compact = false,
  onAddToCart,
  onAddRentalToCart,
  onRent,
  isFavorite = false,
  onToggleFavorite,
}: {
  product: Product;
  compact?: boolean;

  onAddToCart?: (
    product: Product,
    quantity: number
  ) => void;

  onAddRentalToCart?: (
    product: Product,
    quantity: number
  ) => void;

  // Rental callback
  onRent?: (
    product: Product,
    quantity: number
  ) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (product: Product) => void;
}) {
  const [quantity, setQuantity] = useState(1);

  const increaseQuantity = () => {
    if (quantity < product.stockCount) {
      setQuantity((q) => q + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  // =========================================
  // RENTAL DATA
  // =========================================

  const isRentable =
    Boolean(product.isRentable);

  const rentalPrice =
    product.rentalPrice ?? 0;

  const rentalDuration =
    product.rentalDurationDays ?? 30;

  // =========================================
  // RENT PRODUCT
  // =========================================

  const handleRent = () => {
    console.log(
      '================================='
    );

    console.log(
      'BOOKVISION RENT BUTTON CLICKED'
    );

    console.log(
      'Product:',
      product.name
    );

    console.log(
      'Product ID:',
      product.id
    );

    console.log(
      'Rental price:',
      rentalPrice
    );

    console.log(
      'Quantity:',
      quantity
    );

    console.log(
      'Calling onRent...'
    );

    console.log(
      '================================='
    );

    onRent?.(
      product,
      quantity
    );
  };

  // =========================================
  // ADD TO CART
  // =========================================

  const handleAddToCart = () => {
    console.log(
      'ADD TO CART CLICKED',
      product,
      'quantity:',
      quantity
    );

    onAddToCart?.(
      product,
      quantity
    );
  };

  const handleAddRentalToCart = () => {
    onAddRentalToCart?.(product, quantity);
  };

  return (
    <div
      className={cn(
        'card card-hover group flex flex-col overflow-hidden',
        compact
          ? 'w-full'
          : 'w-full'
      )}
    >

      {/* ===================================== */}
      {/* PRODUCT IMAGE */}
      {/* ===================================== */}

      <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-ink-50 to-ink-100">

        <span className="text-5xl opacity-80 transition-transform duration-300 group-hover:scale-110">

          {iconMap[product.image] ??
            iconMap.default}

        </span>

        {product.coverImage && (
          <img
            src={product.coverImage}
            alt={`${product.name} cover`}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = getCoverPlaceholder(product.name);
            }}
            className="absolute inset-0 h-full w-full object-contain p-2"
          />
        )}

        {onToggleFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite(product)}
            aria-label={isFavorite ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
            aria-pressed={isFavorite}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className="absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white/95 text-ink-500 shadow-sm transition hover:text-danger-600"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-danger-500 text-danger-500' : ''}`} />
          </button>
        )}

        {/* Discount */}

        {product.originalPrice && (
          <span className="chip absolute left-3 top-3 bg-danger-50 text-danger-600">

            -
            {Math.round(
              (1 -
                product.price /
                  product.originalPrice) *
                100
            )}
            %

          </span>
        )}

        {/* Match score */}

        {product.matchScore && (
          <span className="chip absolute right-3 top-3 bg-white/90 text-brand-700 shadow-soft">

            <TrendingUp className="h-3 w-3" />

            {product.matchScore}% match

          </span>
        )}

        {/* ================================= */}
        {/* RENTABLE BADGE */}
        {/* ================================= */}

        {isRentable && (
          <span className="chip absolute left-3 top-3 bg-brand-50 text-brand-700">

            <RefreshCw className="h-3 w-3" />

            Rentable

          </span>
        )}

      </div>

      {/* ===================================== */}
      {/* PRODUCT CONTENT */}
      {/* ===================================== */}

      <div className="flex flex-1 flex-col gap-2 p-4">

        {/* Brand + category */}

        <div className="flex items-center justify-between">

          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">

            {product.brand}

          </span>

          <span className="text-[11px] font-medium text-ink-400">

            {product.category}

          </span>

        </div>

        {/* Product name */}

        <p className="text-sm font-semibold leading-snug text-ink-900">

          {product.name}

        </p>

        {product.author && (
          <p className="text-xs text-ink-500">by {product.author}</p>
        )}

        {product.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-ink-500">
            {product.description}
          </p>
        )}

        {/* Rating */}

        <div className="flex items-center gap-1.5">

          <Star className="h-3.5 w-3.5 fill-warning-400 text-warning-400" />

          <span className="text-xs font-semibold text-ink-700">

            {product.rating}

          </span>

          <span className="text-xs text-ink-400">

            (
            {product.reviews.toLocaleString()}
            )

          </span>

        </div>

        {/* ================================= */}
        {/* BUY PRICE */}
        {/* ================================= */}

        <div className="mt-auto pt-2">

          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">

            Buy

          </p>

          <p className="font-display text-lg font-bold text-ink-900">

            {formatCurrency(
              product.price
            )}

          </p>

          {product.originalPrice && (
            <p className="text-xs text-ink-400 line-through">

              {formatCurrency(
                product.originalPrice
              )}

            </p>
          )}

        </div>

        {/* ================================= */}
        {/* RENTAL INFORMATION */}
        {/* ================================= */}

        {isRentable && (
          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3">

            <div className="flex items-center gap-2">

              <RefreshCw className="h-4 w-4 text-brand-600" />

              <span className="text-xs font-semibold text-brand-700">

                Rent this product

              </span>

            </div>

            <p className="mt-1 text-sm font-bold text-ink-900">

              {formatCurrency(
                rentalPrice
              )}

              <span className="text-xs font-medium text-ink-500">

                {' '}
                / {rentalDuration} days

              </span>

            </p>

            <p className="mt-1 text-[11px] text-ink-500">

              Select your reader plan at checkout: regular readers keep the annual membership model, while specific-book readers can receive a ₹300 refund after confirmed return.

            </p>

          </div>
        )}

        {/* ================================= */}
        {/* STOCK */}
        {/* ================================= */}

        {product.inStock ? (

          <span className="chip w-fit bg-success-50 text-success-700">

            <Check className="h-3 w-3" />

            {product.stockCount} in stock

          </span>

        ) : (

          <span className="chip w-fit bg-danger-50 text-danger-600">

            <X className="h-3 w-3" />

            Out of stock

          </span>

        )}

        {/* ================================= */}
        {/* QUANTITY */}
        {/* ================================= */}

        {product.inStock && (

          <div className="mt-2 flex items-center justify-between rounded-xl border border-ink-200 bg-white p-2">

            <span className="text-xs font-medium text-ink-500">

              Quantity

            </span>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={
                  decreaseQuantity
                }
                disabled={
                  quantity <= 1
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-700 transition hover:bg-ink-200 disabled:opacity-40"
              >

                <Minus className="h-4 w-4" />

              </button>

              <span className="w-6 text-center text-sm font-bold text-ink-900">

                {quantity}

              </span>

              <button
                type="button"
                onClick={
                  increaseQuantity
                }
                disabled={
                  quantity >=
                  product.stockCount
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-700 transition hover:bg-ink-200 disabled:opacity-40"
              >

                <Plus className="h-4 w-4" />

              </button>

            </div>

          </div>
        )}

        {/* ================================= */}
        {/* RENT BUTTON */}
        {/* ================================= */}

        {isRentable &&
          product.inStock && (
            <>
              <button
                type="button"
                onClick={handleRent}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 active:scale-[0.98]"
              >
                <RefreshCw className="h-4 w-4" />
                Rent now for {formatCurrency(rentalPrice)}
              </button>

              <button
                type="button"
                onClick={handleAddRentalToCart}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
              >
                <ShoppingCart className="h-4 w-4" />
                Add rental to cart
              </button>
            </>

          )}

        {/* ================================= */}
        {/* ADD TO CART */}
        {/* ================================= */}

        <button
          type="button"
          disabled={
            !product.inStock
          }
          onClick={
            handleAddToCart
          }
          className="btn-primary mt-1 w-full text-sm disabled:opacity-40"
        >

          <ShoppingCart className="h-4 w-4" />

          {product.inStock
            ? `Add ${quantity} to cart`
            : 'Unavailable'}

        </button>

      </div>

    </div>
  );
}