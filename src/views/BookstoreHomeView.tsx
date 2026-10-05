import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  Heart,
  Instagram,
  Leaf,
  Library,
  MapPin,
  ShoppingBag,
  Sparkles,
  Star,
  Youtube,
} from 'lucide-react';

import jnanaNidhiLogo from '@/assets/jnana-nidhi-hubballi.jpeg';
import { toBookProduct, type BookApiRecord } from '@/lib/bookProducts';
import { apiFetch } from '@/lib/api';
import type { Product, ViewKey } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { getCoverPlaceholder } from '@/lib/bookCovers';
import { RentalGuidelinesSection } from '@/components/RentalGuidelinesSection';
import { BookCombosSection } from '@/components/BookCombosSection';

interface BookstoreHomeViewProps {
  onNavigate: (view: ViewKey) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onAddRentalToCart: (product: Product, quantity?: number) => void;
  onRent: (product: Product, quantity?: number) => void;
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (product: Product) => void;
}

export function BookstoreHomeView({
  onNavigate,
  onAddToCart,
  onAddRentalToCart,
  onRent,
  favoriteIds,
  onToggleFavorite,
}: BookstoreHomeViewProps) {
  const [books, setBooks] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All books');

  useEffect(() => {
    let active = true;

    apiFetch('/products')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load the book catalog');
        }

        return response.json() as Promise<BookApiRecord[]>;
      })
      .then((records) => {
        if (active && Array.isArray(records) && records.length > 0) {
          setBooks(records.map(toBookProduct));
        }
        if (active && Array.isArray(records)) {
          setCatalogError(false);
        }
      })
      .catch((error) => {
        if (active) {
          console.error('Book catalog load error:', error);
          setCatalogError(true);
        }
      })
      .finally(() => {
        if (active) {
          setCatalogLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const featuredBook = books.find((book) => book.isRentable) ?? books[0];
  const categories = Array.from(
    new Set(books.map((book) => book.category))
  );
  const filteredBooks =
    selectedCategory === 'All books'
      ? books
      : books.filter((book) => book.category === selectedCategory);
  const popularBooks = [...filteredBooks]
    .sort((first, second) => second.rating - first.rating)
    .slice(0, 4);
  const recommendedBooks = [...books]
    .sort((first, second) => second.rating - first.rating)
    .slice(0, 3);

  const scrollTo = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="bookstore-home">
      <section className="bookstore-hero relative overflow-hidden">
        <div className="bookstore-hero__inner mx-auto grid max-w-[1440px] items-center gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[500px] lg:grid-cols-[1.05fr_0.95fr] lg:px-14 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <p className="bookstore-kicker">
              <Leaf className="h-4 w-4" /> A little more wonder, every day
            </p>
            <h1 className="bookstore-display mt-5 max-w-[650px] text-[42px] leading-[1.05] text-[#183629] sm:text-[56px] lg:text-[64px]">
              Find a book that <em>feels like yours.</em>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#52665a] sm:text-lg">
              Thoughtful reads for curious minds. Explore stories, ideas, and
              practical knowledge, then bring your next favorite home.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => scrollTo('featured-books')}
                className="bookstore-button bookstore-button--dark"
              >
                Explore the shelves <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('ai-buyer')}
                className="bookstore-button bookstore-button--light"
              >
                <Sparkles className="h-4 w-4" /> Ask BookVision
              </button>
            </div>
            <button
              type="button"
              onClick={() => scrollTo('popular-books')}
              className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#52665a] transition hover:text-[#183629]"
            >
              <ArrowDown className="h-4 w-4" /> Browse by category
            </button>
          </div>

          <div className="bookstore-hero__art relative mx-auto flex h-[300px] w-full max-w-[560px] items-center justify-center sm:h-[390px]">
            <div className="bookstore-hero__arch" aria-hidden="true" />
            <BookCover book={books[1] ?? featuredBook} className="bookstore-hero__cover bookstore-hero__cover--back" />
            <BookCover book={books[2] ?? featuredBook} className="bookstore-hero__cover bookstore-hero__cover--middle" />
            <BookCover book={featuredBook} className="bookstore-hero__cover bookstore-hero__cover--front" />
            <div className="bookstore-hero__note">
              <span className="bookstore-hero__note-icon"><Leaf className="h-4 w-4" /></span>
              <span>Make room for a new perspective.</span>
            </div>
          </div>
        </div>
        <div className="bookstore-hero__footnote">
          <span>Good books. Better days.</span>
          <span>BOOKVISION · EST. FOR THE CURIOUS</span>
        </div>
      </section>

      <section id="featured-books" className="bookstore-section mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
        <div className="bookstore-section-heading">
          <div>
            <p className="bookstore-kicker"><Sparkles className="h-4 w-4" /> A good place to begin</p>
            <h2 className="bookstore-display mt-3 text-3xl text-[#183629] sm:text-[40px]">Featured Books</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#68766c] sm:text-base">
            Selected for its practical ideas, clear voice, and pages you will
            want to return to.
          </p>
        </div>

        {featuredBook && (
          <article className="bookstore-featured mt-8 grid overflow-hidden lg:grid-cols-[0.8fr_1.2fr]">
            <div className="bookstore-featured__visual relative flex min-h-[320px] items-center justify-center px-8 py-10 sm:min-h-[400px]">
              <div className="bookstore-featured__wash" aria-hidden="true" />
              <BookCover book={featuredBook} className="bookstore-featured__cover" />
              {featuredBook.isRentable && <span className="bookstore-ribbon">Available to rent</span>}
            </div>
            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
              <p className="bookstore-kicker"><BookOpen className="h-4 w-4" /> {featuredBook.category}</p>
              <h3 className="bookstore-display mt-4 max-w-2xl text-3xl leading-tight text-[#183629] sm:text-[42px]">
                {featuredBook.name}
              </h3>
              <p className="mt-2 text-base text-[#68766c]">by {featuredBook.author}</p>
              <p className="mt-5 max-w-xl text-sm leading-7 text-[#52665a] sm:text-base">
                {featuredBook.description}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#3d5f47]">
                  <Star className="h-4 w-4 fill-[#bd9853] text-[#bd9853]" /> {featuredBook.rating.toFixed(1)} reader rating
                </span>
                <span className="text-sm text-[#68766c]">{featuredBook.stockCount} in stock</span>
                <button
                  type="button"
                  onClick={() => onToggleFavorite(featuredBook)}
                  aria-label={favoriteIds.has(featuredBook.id) ? `Remove ${featuredBook.name} from favorites` : `Add ${featuredBook.name} to favorites`}
                  aria-pressed={favoriteIds.has(featuredBook.id)}
                  title={favoriteIds.has(featuredBook.id) ? 'Remove from favorites' : 'Add to favorites'}
                  className="inline-flex h-9 w-9 items-center justify-center text-[#55735b] transition hover:text-rose-700"
                >
                  <Heart className={`h-4 w-4 ${favoriteIds.has(featuredBook.id) ? 'fill-rose-700 text-rose-700' : ''}`} />
                </button>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <span className="mr-2 text-2xl font-semibold text-[#183629]">{formatCurrency(featuredBook.price)}</span>
                <button
                  type="button"
                  onClick={() => onAddToCart(featuredBook, 1)}
                  className="bookstore-button bookstore-button--dark"
                  disabled={!featuredBook.inStock}
                >
                  <ShoppingBag className="h-4 w-4" /> Add to bag
                </button>
                {featuredBook.isRentable && (
                  <button
                    type="button"
                    onClick={() => onRent(featuredBook, 1)}
                    className="bookstore-button bookstore-button--outline"
                  >
                    Rent for {formatCurrency(featuredBook.rentalPrice)}
                  </button>
                )}
              </div>
            </div>
          </article>
        )}
      </section>

      <section id="popular-books" className="bookstore-band px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <div className="bookstore-section-heading">
            <div>
              <p className="bookstore-kicker"><Library className="h-4 w-4" /> Reader-loved</p>
              <h2 className="bookstore-display mt-3 text-3xl text-[#183629] sm:text-[40px]">Popular books</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ai-buyer')}
              className="bookstore-text-link"
            >
              Find your next read <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="bookstore-categories mt-7" aria-label="Book categories">
            {['All books', ...categories].map((category) => (
              <button
                type="button"
                key={category}
                aria-pressed={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
                className={`bookstore-category ${selectedCategory === category ? 'is-active' : ''}`}
              >
                {category}
              </button>
            ))}
          </div>
          {popularBooks.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
              {popularBooks.map((book) => (
                <BookTile
                  key={book.id}
                  book={book}
                  onAddToCart={onAddToCart}
                  onAddRentalToCart={onAddRentalToCart}
                  isFavorite={favoriteIds.has(book.id)}
                  onToggleFavorite={onToggleFavorite}
                  onRent={onRent}
                />
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-[#68766c]">
              {catalogLoading ? 'Loading the BookVision catalog…' : catalogError ? 'The catalog is unavailable. Please refresh to try again.' : 'No books in this category yet.'}
            </p>
          )}
        </div>
      </section>

      <BookCombosSection products={books} onAddToCart={onAddToCart} />

      <section className="bookstore-section mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
        <div className="bookstore-recommendation grid gap-8 overflow-hidden lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
            <p className="bookstore-kicker"><Sparkles className="h-4 w-4" /> A thoughtful starting point</p>
            <h2 className="bookstore-display mt-4 text-3xl leading-tight text-[#183629] sm:text-[40px]">
              AI recommended books
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#52665a] sm:text-base">
              Tell BookVision what you love, what you are learning, or what mood
              you are in. Your Buyer Agent can search the catalog and help you
              find a book that fits.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('ai-buyer')}
              className="bookstore-button bookstore-button--dark mt-7 w-fit"
            >
              <Sparkles className="h-4 w-4" /> Get a recommendation <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 items-center gap-3 p-5 sm:gap-5 sm:p-8 lg:p-10">
            {recommendedBooks.map((book, index) => (
              <div key={book.id} className={`bookstore-recommendation__book is-${index + 1}`}>
                <BookCover book={book} className="bookstore-recommendation__cover" />
                <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-[#263a2e] sm:text-sm">{book.name}</p>
                <p className="mt-1 truncate text-[11px] text-[#68766c] sm:text-xs">{book.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {featuredBook?.isRentable && (
        <section className="bookstore-rental px-5 py-12 sm:px-8 sm:py-16 lg:px-14">
          <div className="bookstore-rental__inner mx-auto grid max-w-[1440px] items-center gap-8 sm:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <p className="bookstore-kicker bookstore-kicker--light"><BookOpen className="h-4 w-4" /> Read, return, repeat</p>
              <h2 className="bookstore-display mt-4 text-3xl leading-tight text-[#f6f5eb] sm:text-[42px]">Rent a book. Keep your curiosity.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#d1dbcf] sm:text-base">
                Try a new subject without committing to a shelf. {featuredBook.name}
                is available for {featuredBook.rentalDurationDays} days.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onRent(featuredBook, 1)}
                  className="bookstore-button bookstore-button--cream"
                >
                  Rent for {formatCurrency(featuredBook.rentalPrice)} <ArrowRight className="h-4 w-4" />
                </button>
                <span className="text-sm text-[#d1dbcf]">{featuredBook.rentalDurationDays} days · {featuredBook.stockCount} available</span>
              </div>
            </div>
            <div className="hidden items-center gap-5 sm:flex">
              <BookCover book={featuredBook} className="bookstore-rental__cover" />
              <div className="max-w-[170px] text-[#d1dbcf]">
                <Check className="mb-3 h-5 w-5 text-[#c3b47c]" />
                <p className="text-sm font-medium leading-6">A gentler way to discover your next favorite.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <RentalGuidelinesSection />

      <section className="bookstore-section mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
        <div className="bookstore-section-heading">
          <div>
            <p className="bookstore-kicker"><BookOpen className="h-4 w-4" /> Browse categories</p>
            <h2 className="bookstore-display mt-3 text-3xl text-[#183629] sm:text-[40px]">Find your kind of story</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#68766c] sm:text-base">Wander by subject, follow a question, and see where a good book takes you.</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category, index) => (
            <button
              type="button"
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                scrollTo('popular-books');
              }}
              className={`bookstore-category-tile tone-${index % 4}`}
            >
              <span>{category}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ))}
        </div>
      </section>

      <section className="bookstore-why px-5 py-14 sm:px-8 sm:py-18 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-2xl">
            <p className="bookstore-kicker"><Leaf className="h-4 w-4" /> A bookstore for the curious</p>
            <h2 className="bookstore-display mt-3 text-3xl text-[#183629] sm:text-[40px]">Why BookVision</h2>
          </div>
          <div className="mt-9 grid gap-8 border-t border-[#d9dfd3] pt-7 md:grid-cols-3 md:gap-12">
            <ValuePoint number="01" title="A shelf with a point of view" text="Explore books chosen for clear ideas, memorable stories, and the questions they leave with you." />
            <ValuePoint number="02" title="Find a better fit" text="Ask the AI Buyer for help by subject, author, budget, or the kind of reading you are in the mood for." />
            <ValuePoint number="03" title="Read at your own pace" text="Buy a book for your shelves or rent an eligible title and decide what to do after reading." />
          </div>
        </div>
      </section>

      <section id="locations" className="bookstore-locations px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
        <div className="mx-auto grid max-w-[1440px] gap-9 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="bookstore-kicker"><MapPin className="h-4 w-4" /> Find us in Hubli</p>
            <h2 className="bookstore-display mt-3 text-3xl text-[#183629] sm:text-[40px]">Come by the shelves.</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#68766c]">Visit a Jnana Nidhi location and find your next read in person.</p>
            <img src={jnanaNidhiLogo} alt="Jnana Nidhi Hubballi" className="mt-7 h-20 w-20 object-contain" />
          </div>
          <div className="grid gap-x-8 sm:grid-cols-2">
            {[
              'Unkal Cross, Hubli – 580031',
              'Vidyanagar Cross, Hubli – 580021',
              'BVB College, Near Hubli – 580031',
              'Inorbit Mall, Near Hubli – 580030',
              'Urban Oasis Mall, Near Hubli – 580030',
              'New Bus Stand, Dharwad – 580008',
            ].map((location) => (
              <a
                key={location}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-16 items-center gap-3 border-b border-[#d9dfd3] py-4 text-sm font-medium leading-6 text-[#263a2e] transition hover:text-[#55735b]"
              >
                <MapPin className="h-4 w-4 shrink-0 text-[#a08b5e]" />
                <span>{location}</span>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="bookstore-footer grid gap-8 px-5 py-9 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1fr_auto_auto] lg:px-14">
        <div className="flex items-center gap-4">
          <img src={jnanaNidhiLogo} alt="Jnana Nidhi Hubballi" className="h-14 w-14 shrink-0 object-contain" />
          <div>
            <p className="bookstore-display text-xl text-[#f6f5eb]">Jnana Nidhi · BookVision</p>
            <p className="mt-1 text-xs text-[#c0ccbf]">A little more wonder, every day.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#d1dbcf]">
          <button type="button" onClick={() => onNavigate('ai-buyer')} className="hover:text-white">AI Buyer</button>
          <button type="button" onClick={() => onNavigate('orders')} className="hover:text-white">Orders</button>
          <button type="button" onClick={() => onNavigate('cart')} className="hover:text-white">Reading bag</button>
          <button type="button" onClick={() => onNavigate('rental-management')} className="hover:text-white">Rentals</button>
        </div>
        <div className="flex flex-col gap-3 text-sm text-[#d1dbcf]">
          <a href="tel:7483400665" className="inline-flex items-center gap-2 transition hover:text-white">
            <span>Call 7483400665 to arrange book collection at your preferred location</span>
          </a>
          <a
            href="https://youtube.com/@jnana_nidhi_hubli?si=ISWLctad-Ps_mtjp"
            target="_blank"
            rel="noreferrer"
            aria-label="Visit Our YouTube Channel"
            className="inline-flex items-center gap-2 transition hover:text-white"
          >
            <Youtube className="h-4 w-4 shrink-0" />
            <span>Visit Our YouTube Channel</span>
          </a>
          <a
            href="https://www.instagram.com/jnana_nidhi_hubli?stkn=MWJtOGJkaGxxb3Z3YQ=="
            target="_blank"
            rel="noreferrer"
            aria-label="Follow Us on Instagram"
            className="inline-flex items-center gap-2 transition hover:text-white"
          >
            <Instagram className="h-4 w-4 shrink-0" />
            <span>Follow Us on Instagram</span>
          </a>
          <span className="mt-1 text-xs text-[#9eae9f]">© 2026 BookVision</span>
        </div>
      </footer>
    </div>
  );
}

function BookCover({
  book,
  className,
}: {
  book?: Product;
  className: string;
}) {
  return (
    <div className={`book-cover ${className}`}>
      {book?.coverImage ? (
        <img
          src={book.coverImage}
          alt={`${book.name} cover`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = getCoverPlaceholder(book.name);
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-[#6f8c73]">
          <BookOpen className="h-10 w-10" />
        </div>
      )}
    </div>
  );
}

function BookTile({
  book,
  onAddToCart,
  onAddRentalToCart,
  isFavorite,
  onToggleFavorite,
  onRent,
}: {
  book: Product;
  onAddToCart: (product: Product, quantity?: number) => void;
  onAddRentalToCart: (product: Product, quantity?: number) => void;
  isFavorite: boolean;
  onToggleFavorite: (product: Product) => void;
  onRent: (product: Product, quantity?: number) => void;
}) {
  return (
    <article className="book-tile group">
      <div className="book-tile__cover-wrap">
        <BookCover book={book} className="book-tile__cover" />
        {book.isRentable && <span className="bookstore-ribbon">Rentable</span>}
        <button
          type="button"
          onClick={() => onAddToCart(book, 1)}
          disabled={!book.inStock}
          className="book-tile__quick-add"
          aria-label={`Add ${book.name} to cart`}
        >
          <ShoppingBag className="h-4 w-4" />
        </button>
      </div>
      <div className="pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-[#6b7d6d]">{book.category}</p>
          <button
            type="button"
            onClick={() => onToggleFavorite(book)}
            aria-label={isFavorite ? `Remove ${book.name} from favorites` : `Add ${book.name} to favorites`}
            aria-pressed={isFavorite}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className="flex h-8 w-8 shrink-0 items-center justify-center text-[#6b7d6d] transition hover:text-rose-700"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-rose-700 text-rose-700' : ''}`} />
          </button>
        </div>
        <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#20392b]">{book.name}</h3>
        <p className="mt-1 truncate text-xs text-[#68766c]">{book.author}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-semibold text-[#20392b]">{formatCurrency(book.price)}</span>
          <span className="inline-flex items-center gap-1 text-xs text-[#68766c]">
            <Star className="h-3.5 w-3.5 fill-[#bd9853] text-[#bd9853]" /> {book.rating.toFixed(1)}
          </span>
        </div>
        {book.isRentable && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-medium text-[#68766c]">
              Rent {formatCurrency(book.rentalPrice)} · {book.rentalDurationDays} days
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onRent(book, 1)} className="text-xs font-semibold text-[#426c4d] hover:text-[#183629]">Rent now</button>
              <button type="button" onClick={() => onAddRentalToCart(book, 1)} className="text-xs font-semibold text-[#426c4d] hover:text-[#183629]">Add rental to bag</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function ValuePoint({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article>
      <span className="text-xs font-semibold text-[#a08b5e]">{number}</span>
      <h3 className="bookstore-display mt-3 text-xl text-[#20392b]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#68766c]">{text}</p>
    </article>
  );
}
