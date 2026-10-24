import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  Heart,
  Instagram,
  Leaf,
  Library,
  Mail,
  Mic,
  MessageCircle,
  MapPin,
  ShoppingBag,
  Sparkles,
  Star,
  Youtube,
} from 'lucide-react';

import { toBookProduct, type BookApiRecord } from '@/lib/bookProducts';
import { apiFetch } from '@/lib/api';
import type { Product, ViewKey } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { getCoverPlaceholder } from '@/lib/bookCovers';
import { RentalGuidelinesSection } from '@/components/RentalGuidelinesSection';
import { BookCombosSection } from '@/components/BookCombosSection';
import { AuthorByline } from '@/components/AuthorByline';
import { useLanguage } from '@/lib/language';

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
  const { t } = useLanguage();
  const [books, setBooks] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All books');
  const [welcomeAudioPlaying, setWelcomeAudioPlaying] = useState(false);
  const welcomeAudioRef = useRef<HTMLAudioElement>(null);

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

  const moveStorybookScene = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    const world = event.currentTarget.querySelector<HTMLElement>('.storybook-world');
    const bookScene = event.currentTarget.querySelector<HTMLElement>('.bookstore-hero__art');
    world?.style.setProperty('--scene-shift-x', `${x * -12}px`);
    world?.style.setProperty('--scene-shift-y', `${y * -8}px`);
    bookScene?.style.setProperty('--scene-tilt-x', `${x * 3}deg`);
    bookScene?.style.setProperty('--scene-tilt-y', `${y * -3}deg`);
  };

  const resetStorybookScene = (event: ReactPointerEvent<HTMLElement>) => {
    const world = event.currentTarget.querySelector<HTMLElement>('.storybook-world');
    const bookScene = event.currentTarget.querySelector<HTMLElement>('.bookstore-hero__art');
    world?.style.removeProperty('--scene-shift-x');
    world?.style.removeProperty('--scene-shift-y');
    bookScene?.style.removeProperty('--scene-tilt-x');
    bookScene?.style.removeProperty('--scene-tilt-y');
  };

  const toggleWelcomeAudio = async () => {
    const audio = welcomeAudioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
        setWelcomeAudioPlaying(true);
      } catch (error) {
        console.error('Unable to play the welcome audio:', error);
        setWelcomeAudioPlaying(false);
      }
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    setWelcomeAudioPlaying(false);
  };

  return (
    <div className="bookstore-home">
      <section className="bookstore-hero relative overflow-hidden" onPointerMove={moveStorybookScene} onPointerLeave={resetStorybookScene}>
        <div className="storybook-world" aria-hidden="true">
          <svg viewBox="0 0 1600 720" preserveAspectRatio="xMidYMid slice" className="storybook-world__art">
            <defs>
              <linearGradient id="storybook-sky" x1="800" y1="0" x2="800" y2="720" gradientUnits="userSpaceOnUse"><stop stopColor="#8dd8dc" /><stop offset=".48" stopColor="#c8eef0" /><stop offset="1" stopColor="#ffe2c7" /></linearGradient>
              <linearGradient id="storybook-mountain" x1="800" y1="260" x2="800" y2="540" gradientUnits="userSpaceOnUse"><stop stopColor="#92c6c7" /><stop offset="1" stopColor="#93c5a9" /></linearGradient>
              <linearGradient id="storybook-hill" x1="800" y1="390" x2="800" y2="720" gradientUnits="userSpaceOnUse"><stop stopColor="#8dc39a" /><stop offset="1" stopColor="#488f78" /></linearGradient>
              <linearGradient id="storybook-path" x1="800" y1="470" x2="820" y2="720" gradientUnits="userSpaceOnUse"><stop stopColor="#e8d5b2" /><stop offset="1" stopColor="#c79d73" /></linearGradient>
              <radialGradient id="storybook-sun"><stop stopColor="#fffce0" /><stop offset=".58" stopColor="#fff2bb" /><stop offset="1" stopColor="#fff2bb" stopOpacity="0" /></radialGradient>
            </defs>
            <path fill="url(#storybook-sky)" d="M0 0h1600v720H0z" />
            <circle cx="1170" cy="130" r="126" fill="url(#storybook-sun)" />
            <circle cx="1170" cy="130" r="38" fill="#fff8d5" />
            <g className="storybook-cloud storybook-cloud--one" fill="#fff" opacity=".56">
              <ellipse cx="285" cy="164" rx="92" ry="25" /><ellipse cx="245" cy="151" rx="40" ry="36" /><ellipse cx="300" cy="140" rx="53" ry="46" /><ellipse cx="348" cy="155" rx="42" ry="29" />
            </g>
            <g className="storybook-cloud storybook-cloud--two" fill="#fff" opacity=".44">
              <ellipse cx="1400" cy="250" rx="110" ry="23" /><ellipse cx="1351" cy="239" rx="46" ry="31" /><ellipse cx="1409" cy="229" rx="55" ry="42" /><ellipse cx="1462" cy="244" rx="46" ry="28" />
            </g>
            <path fill="url(#storybook-mountain)" d="m0 475 179-202 111 118 185-239 186 239 116-108 151 191 176-244 195 244 138-137 163 153v230H0z" />
            <path fill="#f4ffff" opacity=".58" d="m475 152 75 98-53-20-34 30-35-24-47 37zM1004 230l72 90-49-17-31 25-37-24-45 25zM291 273l50 55-34-10-21 18-25-18-31 12z" />
            <path fill="#bbdfbd" d="M0 461c179-81 328-44 482 6 166 53 304 32 474-18 235-69 445-57 644 17v254H0z" />
            <path fill="url(#storybook-hill)" d="M0 518c163-61 324-28 461 27 161 65 320 63 470-1 212-90 431-107 669-24v200H0z" />
            <path fill="#66a98b" d="M0 604c209-93 423-56 586 5 169 63 305 53 461-20 184-85 348-60 553-7v138H0z" />
            <path fill="url(#storybook-path)" d="M680 720c69-85 128-137 149-191 16-41 5-70-31-103h112c50 48 51 87 13 133-42 50-73 95-97 161z" />
            <g fill="#3d826d" opacity=".8">
              <path d="M79 517c-23-72-17-127 18-169 35 42 42 97 18 169z"/><path d="M116 518c-7-89 11-151 56-188 19 58 1 121-56 188z"/><path d="M1480 493c-15-72-6-129 28-170 30 46 31 101 3 165z"/><path d="M1513 499c1-82 25-138 71-168 10 56-14 111-71 168z"/>
            </g>
            <g fill="#f8d79b" opacity=".85"><circle cx="250" cy="628" r="5"/><circle cx="287" cy="650" r="4"/><circle cx="1335" cy="610" r="5"/><circle cx="1307" cy="641" r="4"/><circle cx="427" cy="587" r="4"/><circle cx="1195" cy="571" r="4"/></g>
          </svg>
          <div className="storybook-world__veil" />
        </div>
        <svg className="bookstore-vines" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g className="bookstore-vine bookstore-vine--left">
            <path className="bookstore-vine__stem" d="M-18 535C76 454 18 382 91 313S128 203 77 151 37 65 88-18" />
            <path className="bookstore-vine__branch" d="M67 358C130 354 159 320 181 271M76 255C20 241 5 208-3 179M77 151C137 146 162 114 175 75" />
            <path className="bookstore-vine__leaf" d="M0 0C-9-22 4-43 30-49 38-27 26-7 0 0Z" transform="translate(89 315) rotate(40)" />
            <path className="bookstore-vine__leaf" d="M0 0C-9-22 4-43 30-49 38-27 26-7 0 0Z" transform="translate(77 255) rotate(205)" />
            <path className="bookstore-vine__leaf" d="M0 0C-9-22 4-43 30-49 38-27 26-7 0 0Z" transform="translate(77 151) rotate(35)" />
            <path className="bookstore-vine__leaf" d="M0 0C-9-22 4-43 30-49 38-27 26-7 0 0Z" transform="translate(88 62) rotate(210)" />
          </g>
          <g className="bookstore-vine bookstore-vine--right">
            <path className="bookstore-vine__stem" d="M1458 535C1364 454 1422 382 1349 313S1312 203 1363 151 1403 65 1352-18" />
            <path className="bookstore-vine__branch" d="M1373 358C1310 354 1281 320 1259 271M1364 255C1420 241 1435 208 1443 179M1363 151C1303 146 1278 114 1265 75" />
            <path className="bookstore-vine__leaf" d="M0 0C-9-22 4-43 30-49 38-27 26-7 0 0Z" transform="translate(1349 315) rotate(40)" />
            <path className="bookstore-vine__leaf" d="M0 0C-9-22 4-43 30-49 38-27 26-7 0 0Z" transform="translate(1364 255) rotate(205)" />
            <path className="bookstore-vine__leaf" d="M0 0C-9-22 4-43 30-49 38-27 26-7 0 0Z" transform="translate(1363 151) rotate(35)" />
            <path className="bookstore-vine__leaf" d="M0 0C-9-22 4-43 30-49 38-27 26-7 0 0Z" transform="translate(1352 62) rotate(210)" />
          </g>
        </svg>
        <div className="bookstore-hero__inner mx-auto grid max-w-[1440px] items-center gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[500px] lg:grid-cols-[1.05fr_0.95fr] lg:px-14 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <p className="bookstore-kicker">
              <Leaf className="h-4 w-4" /> {t('A little more wonder, every day')}
            </p>
            <h1 className="bookstore-display mt-5 max-w-[650px] text-[42px] leading-[1.05] text-[#183629] sm:text-[56px] lg:text-[64px]">
              {t('Books for Everyone, Rich or Poor, Everyone Deserves the Power of Knowledge.')}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#52665a] sm:text-lg">
              {t('Thoughtful reads for curious minds. Explore stories, ideas, and practical knowledge, then bring your next favorite home.')}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <audio
                ref={welcomeAudioRef}
                src="/audio/jnana-nidhi-welcome.mpeg"
                preload="none"
                onEnded={() => setWelcomeAudioPlaying(false)}
              />
              <button
                type="button"
                onClick={toggleWelcomeAudio}
                aria-label={welcomeAudioPlaying ? t('Pause welcome audio') : t('Play welcome audio')}
                aria-pressed={welcomeAudioPlaying}
                title={welcomeAudioPlaying ? t('Pause welcome audio') : t('Play welcome audio')}
                className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#c8a65e] bg-white/90 text-[#285640] shadow-md transition hover:-translate-y-0.5 hover:bg-[#f9f0d7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285640] ${welcomeAudioPlaying ? 'ring-4 ring-[#c8a65e]/35' : ''}`}
              >
                <Mic className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="text-sm font-medium text-[#52665a]">
                {t(welcomeAudioPlaying ? 'Pause welcome audio' : 'Play welcome audio')}
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => scrollTo('featured-books')}
                className="bookstore-button bookstore-button--dark"
              >
                {t('Explore the shelves')} <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('ai-buyer')}
                className="bookstore-button bookstore-button--light"
              >
                <Sparkles className="h-4 w-4" /> {t('Ask Jnana Nidhi')}
              </button>
            </div>
            <button
              type="button"
              onClick={() => scrollTo('popular-books')}
              className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#52665a] transition hover:text-[#183629]"
            >
              <ArrowDown className="h-4 w-4" /> {t('Browse by category')}
            </button>
          </div>

          <div className="bookstore-hero__art relative mx-auto flex h-[300px] w-full max-w-[560px] items-center justify-center sm:h-[390px]">
            <div className="storybook-garden" aria-hidden="true">
              <svg className="storybook-tree storybook-tree--left" viewBox="0 0 180 240" fill="none">
                <ellipse cx="91" cy="221" rx="72" ry="12" fill="#7c69a5" opacity=".16" />
                <path d="M81 218c11-41 4-73 1-107h23c-4 39-5 71 11 107H81Z" fill="url(#tree-trunk-left)" />
                <path d="M92 143 58 98m48 35 31-45M91 112 82 69" stroke="#94694f" strokeWidth="9" strokeLinecap="round" />
                <g fill="url(#tree-leaf-left)">
                  <circle cx="47" cy="91" r="35" /><circle cx="83" cy="68" r="39" />
                  <circle cx="127" cy="84" r="36" /><circle cx="65" cy="119" r="34" />
                  <circle cx="112" cy="119" r="38" /><circle cx="90" cy="94" r="39" />
                </g>
                <defs>
                  <linearGradient id="tree-trunk-left" x1="82" y1="110" x2="116" y2="220" gradientUnits="userSpaceOnUse"><stop stopColor="#bc8a65" /><stop offset="1" stopColor="#805b54" /></linearGradient>
                  <radialGradient id="tree-leaf-left" cx="0" cy="0" r="1" gradientTransform="matrix(75 85 -91 80 67 50)" gradientUnits="userSpaceOnUse"><stop stopColor="#94d8bd" /><stop offset=".65" stopColor="#57a88f" /><stop offset="1" stopColor="#377d78" /></radialGradient>
                </defs>
              </svg>
              <svg className="storybook-tree storybook-tree--right" viewBox="0 0 180 240" fill="none">
                <ellipse cx="91" cy="221" rx="72" ry="12" fill="#7c69a5" opacity=".16" />
                <path d="M82 218c10-41 5-71 2-104h23c-3 39-4 69 11 104H82Z" fill="url(#tree-trunk-right)" />
                <path d="m94 145-36-44m49 30 29-46M94 111l-5-43" stroke="#94694f" strokeWidth="9" strokeLinecap="round" />
                <g fill="url(#tree-leaf-right)">
                  <circle cx="48" cy="94" r="36" /><circle cx="83" cy="67" r="39" />
                  <circle cx="128" cy="84" r="35" /><circle cx="66" cy="121" r="34" />
                  <circle cx="111" cy="119" r="38" /><circle cx="91" cy="94" r="39" />
                </g>
                <defs>
                  <linearGradient id="tree-trunk-right" x1="82" y1="110" x2="116" y2="220" gradientUnits="userSpaceOnUse"><stop stopColor="#bc8a65" /><stop offset="1" stopColor="#805b54" /></linearGradient>
                  <radialGradient id="tree-leaf-right" cx="0" cy="0" r="1" gradientTransform="matrix(75 85 -91 80 67 50)" gradientUnits="userSpaceOnUse"><stop stopColor="#c5d68e" /><stop offset=".65" stopColor="#82b879" /><stop offset="1" stopColor="#498d7b" /></radialGradient>
                </defs>
              </svg>
              {[0, 1, 2].map((butterfly) => (
                <svg key={butterfly} className={`storybook-butterfly storybook-butterfly--${butterfly + 1}`} viewBox="0 0 48 42">
                  <g className="storybook-wing storybook-wing--left"><path d="M23 21C14 4 2 4 4 16c1 7 9 11 18 8 4-1 4-1 1-3Z" fill="#a679e8" /><path d="M22 23C12 19 8 25 12 31c3 5 10 4 12-4l-2-4Z" fill="#ed91c9" /></g>
                  <g className="storybook-wing storybook-wing--right"><path d="M25 21C34 4 46 4 44 16c-1 7-9 11-18 8-4-1-4-1-1-3Z" fill="#7b8fe4" /><path d="M26 23c10-4 14 2 10 8-3 5-10 4-12-4l2-4Z" fill="#f2b1d8" /></g>
                  <path d="m23 20-2-5m4 5 3-5m-4 8v9" stroke="#49396f" strokeWidth="1.7" strokeLinecap="round" />
                  <ellipse cx="24" cy="22" rx="2" ry="5" fill="#49396f" />
                </svg>
              ))}
            </div>
            <div className="bookstore-hero__arch" aria-hidden="true" />
            <BookCover book={books[1] ?? featuredBook} className="bookstore-hero__cover bookstore-hero__cover--back" />
            <BookCover book={books[2] ?? featuredBook} className="bookstore-hero__cover bookstore-hero__cover--middle" />
            <BookCover book={featuredBook} className="bookstore-hero__cover bookstore-hero__cover--front" />
            <div className="bookstore-hero__note">
              <span className="bookstore-hero__note-icon"><Leaf className="h-4 w-4" /></span>
              <span>{t('Make room for a new perspective.')}</span>
            </div>
          </div>
        </div>
        <div className="bookstore-hero__footnote">
          <span>{t('Good books. Better days.')}</span>
          <span>JNANA NIDHI · EST. FOR THE CURIOUS</span>
        </div>
      </section>

      <section id="featured-books" className="bookstore-section mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
        <div className="bookstore-section-heading">
          <div>
            <p className="bookstore-kicker"><Sparkles className="h-4 w-4" /> {t('A good place to begin')}</p>
            <h2 className="bookstore-display mt-3 text-3xl text-[#183629] sm:text-[40px]">{t('Featured Books')}</h2>
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
              {featuredBook.isRentable && <span className="bookstore-ribbon">{t('Available to rent')}</span>}
            </div>
            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
              <p className="bookstore-kicker"><BookOpen className="h-4 w-4" /> {featuredBook.category}</p>
              <h3 className="bookstore-display mt-4 max-w-2xl text-3xl leading-tight text-[#183629] sm:text-[42px]">
                {featuredBook.name}
              </h3>
              <AuthorByline author={featuredBook.author} className="mt-2 text-base text-[#68766c]" />
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
              <p className="bookstore-kicker"><Library className="h-4 w-4" /> {t('Reader-loved')}</p>
              <h2 className="bookstore-display mt-3 text-3xl text-[#183629] sm:text-[40px]">{t('Popular books')}</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ai-buyer')}
              className="bookstore-text-link"
            >
              {t('Find your next read')} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="bookstore-categories mt-7" aria-label={t('Book categories')}>
            {['All books', ...categories].map((category) => (
              <button
                type="button"
                key={category}
                aria-pressed={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
                className={`bookstore-category ${selectedCategory === category ? 'is-active' : ''}`}
              >
                {t(category)}
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
              {catalogLoading ? t('Loading the Jnana Nidhi catalog…') : catalogError ? t('The catalog is unavailable. Please refresh to try again.') : t('No books in this category yet.')}
            </p>
          )}
        </div>
      </section>

      <BookCombosSection products={books} onAddToCart={onAddToCart} />

      <section className="bookstore-section mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
        <div className="bookstore-recommendation grid gap-8 overflow-hidden lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
            <p className="bookstore-kicker"><Sparkles className="h-4 w-4" /> {t('A thoughtful starting point')}</p>
            <h2 className="bookstore-display mt-4 text-3xl leading-tight text-[#183629] sm:text-[40px]">
              {t('AI recommended books')}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#52665a] sm:text-base">
              {t('Tell Jnana Nidhi what you love, what you are learning, or what mood you are in. Your Buyer Agent can search the catalog and help you find a book that fits.')}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('ai-buyer')}
              className="bookstore-button bookstore-button--dark mt-7 w-fit"
            >
              <Sparkles className="h-4 w-4" /> {t('Get a recommendation')} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 items-center gap-3 p-5 sm:gap-5 sm:p-8 lg:p-10">
            {recommendedBooks.map((book, index) => (
              <div key={book.id} className={`bookstore-recommendation__book is-${index + 1}`}>
                <BookCover book={book} className="bookstore-recommendation__cover" />
                <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-[#263a2e] sm:text-sm">{book.name}</p>
                <AuthorByline author={book.author} className="mt-1 text-[11px] text-[#68766c] sm:text-xs" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {featuredBook?.isRentable && (
        <section className="bookstore-rental px-5 py-12 sm:px-8 sm:py-16 lg:px-14">
          <div className="bookstore-rental__inner mx-auto grid max-w-[1440px] items-center gap-8 sm:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <p className="bookstore-kicker bookstore-kicker--light"><BookOpen className="h-4 w-4" /> {t('Read, return, repeat')}</p>
              <h2 className="bookstore-display mt-4 text-3xl leading-tight text-[#f6f5eb] sm:text-[42px]">{t('Rent a book. Keep your curiosity.')}</h2>
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
                <p className="text-sm font-medium leading-6">{t('A gentler way to discover your next favorite.')}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <RentalGuidelinesSection />

      <section className="bookstore-section mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
        <div className="bookstore-section-heading">
          <div>
            <p className="bookstore-kicker"><BookOpen className="h-4 w-4" /> {t('Browse categories')}</p>
            <h2 className="bookstore-display mt-3 text-3xl text-[#183629] sm:text-[40px]">{t('Find your kind of story')}</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#68766c] sm:text-base">{t('Wander by subject, follow a question, and see where a good book takes you.')}</p>
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
              <span>{t(category)}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ))}
        </div>
      </section>

      <section className="bookstore-why px-5 py-14 sm:px-8 sm:py-18 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-2xl">
            <p className="bookstore-kicker"><Leaf className="h-4 w-4" /> {t('A bookstore for the curious')}</p>
            <h2 className="bookstore-display mt-3 text-3xl text-[#183629] sm:text-[40px]">{t('Why Jnana Nidhi')}</h2>
          </div>
          <div className="mt-9 grid gap-8 border-t border-[#d9dfd3] pt-7 md:grid-cols-3 md:gap-12">
            <ValuePoint number="01" title={t('A shelf with a point of view')} text={t('Explore books chosen for clear ideas, memorable stories, and the questions they leave with you.')} />
            <ValuePoint number="02" title={t('Find a better fit')} text={t('Ask the AI Buyer for help by subject, author, budget, or the kind of reading you are in the mood for.')} />
            <ValuePoint number="03" title={t('Read at your own pace')} text={t('Buy a book for your shelves or rent an eligible title and decide what to do after reading.')} />
          </div>
        </div>
      </section>

      <section aria-labelledby="about-us-title" className="bookstore-about px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
        <div className="mx-auto grid max-w-[1440px] gap-9 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="bookstore-kicker"><BookOpen className="h-4 w-4" /> {t('Our story')}</p>
            <h2 id="about-us-title" className="bookstore-display mt-3 text-3xl text-[#183629] sm:text-[40px]">{t('About Us')}</h2>
            <p className="mt-5 text-sm leading-7 text-[#52665a] sm:text-base">
              {t('Welcome to Jnana Nidhi Hubballi, an online bookstore founded by Krishna. Our core vision is rooted in a powerful belief:')}
            </p>
            <p className="mt-4 rounded-2xl border border-[#dfd9ef] bg-white/80 p-5 text-base font-semibold leading-7 text-[#34225d] shadow-sm sm:text-lg">
              “{t('Books for Everyone, Rich or Poor, Everyone Deserves the Power of Knowledge.')}”
            </p>
            <p className="mt-5 text-sm leading-7 text-[#52665a] sm:text-base">
              {t('We understand that buying every book you wish to read can be expensive. That is why we are here to bridge the gap—making reading affordable and accessible to all without heavy costs. We bring original, high-quality, branded books straight to your hands at a minimal cost, ensuring that financial constraints never stand between you and a great story.')}
            </p>
          </div>
          <div className="grid gap-4">
            <p className="bookstore-kicker"><Sparkles className="h-4 w-4" /> {t('Special Quotes')}</p>
            <blockquote className="rounded-2xl border border-[#dfd9ef] bg-white/85 p-5 text-sm font-medium leading-7 text-[#34225d] shadow-sm sm:p-6 sm:text-base">
              {t('“No need to buy expensive books anymore! At a lesser cost, we bring books right to your doorstep for reading.”')}
            </blockquote>
            <blockquote className="rounded-2xl border border-[#dfd9ef] bg-white/85 p-5 text-sm font-medium leading-7 text-[#34225d] shadow-sm sm:p-6 sm:text-base">
              {t('“Worry less about money and keep reading... because what you read matters to us!”')}
            </blockquote>
          </div>
        </div>
      </section>

      <section id="locations" className="bookstore-locations px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
        <div className="mx-auto grid max-w-[1440px] gap-9 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="bookstore-kicker"><MapPin className="h-4 w-4" /> {t('Find us in Hubli')}</p>
            <h2 className="bookstore-display mt-3 text-3xl text-[#183629] sm:text-[40px]">{t('Come by the shelves.')}</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#68766c]">{t('Visit a Jnana Nidhi location and find your next read in person.')}</p>
            <img src="/bookvision-logo.webp" alt="Jnana Nidhi Hubballi logo" className="mt-7 h-20 w-20 object-contain" />
            <figure className="mt-6 w-full max-w-[220px] text-center">
              <img
                src="/whatsapp-business-qr.png"
                alt="Scan to start a WhatsApp chat with Jnana Nidhi Hubli"
                loading="lazy"
                className="h-auto w-full rounded-2xl"
              />
              <figcaption className="mt-2 text-xs text-[#68766c]">{t('Scan to WhatsApp Jnana Nidhi about books and locations')}</figcaption>
            </figure>
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
          <img src="/bookvision-logo.webp" alt="Jnana Nidhi Hubballi logo" className="h-14 w-14 shrink-0 object-contain" />
          <div>
            <p className="bookstore-display text-xl text-[#30224e]">Jnana Nidhi</p>
            <p className="mt-1 text-xs text-[#5c5273]">{t('A little more wonder, every day')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#40355f]">
          <button type="button" onClick={() => onNavigate('ai-buyer')} className="transition hover:text-[#6d3ba8]">{t('AI Buyer')}</button>
          <button type="button" onClick={() => onNavigate('orders')} className="transition hover:text-[#6d3ba8]">{t('Orders')}</button>
          <button type="button" onClick={() => onNavigate('cart')} className="transition hover:text-[#6d3ba8]">{t('Reading bag')}</button>
          <button type="button" onClick={() => onNavigate('rental-management')} className="transition hover:text-[#6d3ba8]">{t('Rentals')}</button>
        </div>
        <div className="flex flex-col gap-3 text-sm text-[#40355f]">
          <a href="tel:9071111074" className="inline-flex items-center gap-2 transition hover:text-[#6d3ba8]">
            <span>{t('Book collection at your preferred location: 9071111074')}</span>
          </a>
          <a
            href="https://youtube.com/@jnana_nidhi_hubli?si=ISWLctad-Ps_mtjp"
            target="_blank"
            rel="noreferrer"
            aria-label="Visit Our YouTube Channel"
            className="inline-flex items-center gap-2 transition hover:text-[#6d3ba8]"
          >
            <Youtube className="h-4 w-4 shrink-0" />
            <span>{t('Visit Our YouTube Channel')}</span>
          </a>
          <a
            href="https://www.instagram.com/jnana_nidhi_hubli?stkn=MWJtOGJkaGxxb3Z3YQ=="
            target="_blank"
            rel="noreferrer"
            aria-label="Follow Us on Instagram"
            className="inline-flex items-center gap-2 transition hover:text-[#6d3ba8]"
          >
            <Instagram className="h-4 w-4 shrink-0" />
            <span>{t('Follow Us on Instagram')}</span>
          </a>
          <span className="mt-1 text-xs text-[#5c5273]">© 2026 Jnana Nidhi</span>
        </div>
      </footer>

      <section aria-labelledby="website-services-title" className="bg-[#eeefe7] px-5 py-12 sm:px-8 sm:py-16 lg:px-14">
        <div className="mx-auto grid max-w-[1100px] items-center gap-8 rounded-3xl bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-[1fr_auto]">
          <div className="max-w-xl">
            <p className="bookstore-kicker"><MessageCircle className="h-4 w-4" /> {t('Website services')}</p>
            <h2 id="website-services-title" className="bookstore-display mt-3 text-3xl text-[#183629] sm:text-[40px]">
              {t('Need a website like this?')}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#52665a] sm:text-base">
              {t('Need a website for your business? Email us to discuss your project.')}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="mailto:kiranbasu30@gmail.com" className="bookstore-button bookstore-button--dark">
                <Mail className="h-4 w-4" /> kiranbasu30@gmail.com
              </a>
            </div>
          </div>
        </div>
      </section>
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
  const { t } = useLanguage();
  return (
    <article className="book-tile group">
      <div className="book-tile__cover-wrap">
        <BookCover book={book} className="book-tile__cover" />
        {book.isRentable && <span className="bookstore-ribbon">{t('Rentable')}</span>}
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
        <AuthorByline author={book.author} className="mt-1 text-xs text-[#68766c]" />
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
              <button type="button" onClick={() => onRent(book, 1)} className="text-xs font-semibold text-[#426c4d] hover:text-[#183629]">{t('Rent now')}</button>
              <button type="button" onClick={() => onAddRentalToCart(book, 1)} className="text-xs font-semibold text-[#426c4d] hover:text-[#183629]">{t('Add rental to bag')}</button>
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
