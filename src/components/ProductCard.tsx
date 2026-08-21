import { Star, ShoppingCart, Check, X, TrendingUp } from 'lucide-react';
import type { Product } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';

const iconMap: Record<string, string> = {
  headphones: '🎧',
  keyboard: '⌨️',
  'laptop-stand': '💻',
  webcam: '📷',
  lamp: '💡',
  ssd: '💾',
};

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  return (
    <div
      className={cn(
        'card card-hover group flex flex-col overflow-hidden',
        compact ? 'w-full' : 'w-full',
      )}
    >
      <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-ink-50 to-ink-100">
        <span className="text-5xl opacity-80 transition-transform duration-300 group-hover:scale-110">
          {iconMap[product.image] ?? '📦'}
        </span>
        {product.originalPrice && (
          <span className="chip absolute left-3 top-3 bg-danger-50 text-danger-600">
            -{Math.round((1 - product.price / product.originalPrice) * 100)}%
          </span>
        )}
        {product.matchScore && (
          <span className="chip absolute right-3 top-3 bg-white/90 text-brand-700 shadow-soft">
            <TrendingUp className="h-3 w-3" />
            {product.matchScore}% match
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{product.brand}</span>
          <span className="text-[11px] font-medium text-ink-400">{product.category}</span>
        </div>
        <p className="text-sm font-semibold leading-snug text-ink-900">{product.name}</p>
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 fill-warning-400 text-warning-400" />
          <span className="text-xs font-semibold text-ink-700">{product.rating}</span>
          <span className="text-xs text-ink-400">({product.reviews.toLocaleString()})</span>
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <p className="font-display text-lg font-bold text-ink-900">{formatCurrency(product.price)}</p>
            {product.originalPrice && (
              <p className="text-xs text-ink-400 line-through">{formatCurrency(product.originalPrice)}</p>
            )}
          </div>
          {product.inStock ? (
            <span className="chip bg-success-50 text-success-700">
              <Check className="h-3 w-3" /> {product.stockCount} in stock
            </span>
          ) : (
            <span className="chip bg-danger-50 text-danger-600">
              <X className="h-3 w-3" /> Out of stock
            </span>
          )}
        </div>
        <button
          disabled={!product.inStock}
          className="btn-primary mt-1 w-full text-sm disabled:opacity-40"
        >
          <ShoppingCart className="h-4 w-4" />
          {product.inStock ? 'Add to cart' : 'Unavailable'}
        </button>
      </div>
    </div>
  );
}
