import { ArrowRight, BookOpen, Layers3 } from 'lucide-react';

import { bookCombos } from '@/data/bookCombos';
import { getCoverPlaceholder } from '@/lib/bookCovers';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';

export function BookCombosSection({
  products,
  onAddToCart,
}: {
  products: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
}) {
  const productsByName = new Map(products.map((product) => [product.name.trim().toLowerCase(), product]));

  return (
    <section id="book-combos" className="bookstore-section px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
      <div className="mx-auto max-w-[1440px]">
        <div className="bookstore-section-heading">
          <div>
            <p className="bookstore-kicker"><Layers3 className="h-4 w-4" /> Curated reading sets</p>
            <h2 className="bookstore-display mt-3 text-3xl text-[#183629] sm:text-[40px]">Book Combos</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#68766c] sm:text-base">
            Thoughtful groupings from the approved BookVision collection.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bookCombos.map((combo) => {
            const includedBooks = combo.bookTitles
              .map((title) => productsByName.get(title.trim().toLowerCase()))
              .filter((product): product is Product => Boolean(product));
            const complete = includedBooks.length === combo.bookTitles.length;
            const individualTotal = includedBooks.reduce((total, product) => total + product.price, 0);
            const comboPrice = combo.comboPrice ?? individualTotal;
            const savings = individualTotal - comboPrice;
            const canAdd = complete && comboPrice === individualTotal && includedBooks.every((book) => book.inStock);
            const comboProduct: Product = {
              id: `combo-${combo.id}`,
              name: combo.name,
              author: 'BookVision collection',
              description: combo.description,
              coverImage: includedBooks[0]?.coverImage || getCoverPlaceholder(combo.name),
              brand: 'BookVision',
              price: comboPrice,
              originalPrice: individualTotal,
              rating: includedBooks.length
                ? includedBooks.reduce((total, book) => total + book.rating, 0) / includedBooks.length
                : 0,
              reviews: 0,
              category: 'Book Combo',
              image: 'book',
              inStock: canAdd,
              stockCount: includedBooks.length
                ? Math.min(...includedBooks.map((book) => book.stockCount))
                : 0,
              tags: ['combo'],
              isRentable: false,
              rentalPrice: 0,
              rentalDurationDays: 30,
              comboItems: includedBooks.map((book) => ({ productId: book.id, quantity: 1 })),
            };

            return (
              <article key={combo.id} className="flex min-w-0 flex-col border border-[#e0e3d8] bg-[#fffefa] p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#edf1e7] text-[#55735b]">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="bookstore-display text-xl leading-snug text-[#20392b]">{combo.name}</h3>
                    <p className="mt-1 text-xs leading-5 text-[#68766c]">{combo.description}</p>
                  </div>
                </div>

                <div className="mt-5 flex min-h-16 items-center gap-2">
                  {includedBooks.slice(0, 5).map((book) => (
                    <img
                      key={book.id}
                      src={book.coverImage || getCoverPlaceholder(book.name)}
                      alt={`${book.name} cover`}
                      title={book.name}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = getCoverPlaceholder(book.name);
                      }}
                      className="h-16 w-11 shrink-0 border border-[#e3e1d5] bg-[#f5f1e8] object-cover"
                    />
                  ))}
                  <span className="ml-2 text-xs text-[#68766c]">{includedBooks.length} books</span>
                </div>

                <ul className="mt-4 flex-1 space-y-1.5 border-t border-[#e7e8df] pt-4 text-xs leading-5 text-[#52665a]">
                  {includedBooks.map((book) => (
                    <li key={book.id} className="flex justify-between gap-3">
                      <span className="line-clamp-1">{book.name}</span>
                      <span className="shrink-0">{formatCurrency(book.price)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-[#e7e8df] pt-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-[#68766c]">Individual total</p>
                    <p className="mt-1 text-sm font-medium text-[#263a2e]">{formatCurrency(individualTotal)}</p>
                    <p className="mt-2 text-[10px] font-semibold uppercase text-[#68766c]">Combo price</p>
                    <p className="mt-1 text-lg font-semibold text-[#183629]">{formatCurrency(comboPrice)}</p>
                    {savings > 0 && <p className="mt-1 text-xs font-semibold text-[#55735b]">Save {formatCurrency(savings)}</p>}
                  </div>
                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={() => onAddToCart(comboProduct, 1)}
                    className="bookstore-button bookstore-button--dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Add Combo to Cart <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                {!complete && <p className="mt-3 text-xs text-rose-700">A book in this combo is unavailable.</p>}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
