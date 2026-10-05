import { Heart, UserRound } from 'lucide-react';

import { ProductCard } from '@/components/ProductCard';
import type { AccountUser, Product, ViewKey } from '@/types';

interface FavoritesViewProps {
  user: AccountUser | null;
  loading: boolean;
  products: Product[];
  onNavigate: (view: ViewKey) => void;
  onToggleFavorite: (product: Product) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onAddRentalToCart: (product: Product, quantity?: number) => void;
  onRent: (product: Product, quantity?: number) => void;
}

export function FavoritesView({
  user,
  loading,
  products,
  onNavigate,
  onToggleFavorite,
  onAddToCart,
  onAddRentalToCart,
  onRent,
}: FavoritesViewProps) {
  if (!user) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
        <UserRound className="h-9 w-9 text-brand-600" />
        <h1 className="bookstore-display mt-4 text-3xl text-[#183629]">Sign in to see your favorites</h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">Your saved books stay with your BookVision account.</p>
        <button type="button" onClick={() => onNavigate('account')} className="btn-primary mt-6">Go to account</button>
      </section>
    );
  }

  return (
    <section className="space-y-6 py-3">
      <header>
        <p className="bookstore-kicker"><Heart className="h-4 w-4" /> Your saved shelf</p>
        <h1 className="bookstore-display mt-2 text-3xl text-[#183629] sm:text-4xl">Favorites</h1>
        <p className="mt-2 text-sm text-ink-500">Saved for your next reading session.</p>
      </header>

      {loading ? (
        <p className="py-12 text-center text-sm text-ink-500">Loading your favorites…</p>
      ) : products.length === 0 ? (
        <div className="border-y border-ink-200 py-12 text-center">
          <Heart className="mx-auto h-8 w-8 text-ink-300" />
          <p className="mt-3 text-sm text-ink-500">No favorites saved yet.</p>
          <button type="button" onClick={() => onNavigate('dashboard')} className="btn-secondary mt-5">Browse books</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorite
              onToggleFavorite={onToggleFavorite}
              onAddToCart={onAddToCart}
              onAddRentalToCart={onAddRentalToCart}
              onRent={onRent}
            />
          ))}
        </div>
      )}
    </section>
  );
}