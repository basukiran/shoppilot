import type { Product } from '@/types';
import { getCoverPlaceholder } from '@/lib/bookCovers';

type NumericValue = number | string | null;

export interface BookApiRecord {
  id: number | string;
  name: string;
  author?: string | null;
  description?: string | null;
  cover_image?: string | null;
  coverImage?: string | null;
  brand?: string | null;
  price?: NumericValue;
  originalPrice?: NumericValue;
  rating?: NumericValue;
  reviews?: NumericValue;
  category?: string | null;
  stock?: NumericValue;
  tags?: unknown;
  matchScore?: NumericValue;
  is_rentable?: NumericValue | boolean;
  isRentable?: NumericValue | boolean;
  rental_price?: NumericValue;
  rentalPrice?: NumericValue;
  ownership_price?: NumericValue;
  ownershipPrice?: NumericValue;
  rental_duration_days?: NumericValue;
  rentalDurationDays?: NumericValue;
}

// Owner-provided catalog photos. These local assets take precedence over
// stale cover URLs stored in existing production database rows.
const approvedCoverByTitle: Record<string, string> = {
  'psychology of money': '/covers/psychology-of-money.jpeg',
  ikigai: '/covers/ikigai.jpeg',
  secret: '/covers/secret.jpeg',
  'india s struggle for independence 1857 1947': '/covers/indias-struggle-for-independence.jpeg',
  'deep work': '/covers/deep-work.jpeg',
  'badukuva dari': '/covers/badukuva-dari.jpeg',
  'detox your ego': '/covers/detox-your-ego.jpeg',
  'heli hogu kaarana': '/covers/heli-hogu-kaarana.jpeg',
  'vektitva vikasana': '/covers/vektitva-vikasana.jpeg',
  'why i am an atheist and other writings': '/covers/why-i-am-an-atheist.jpeg',
  avalu: '/covers/avalu.jpeg',
  vakalat: '/covers/vakalat.jpeg',
  'mukajjiya kanasugalu': '/covers/mukajjiya-kanasugalu.jpeg',
  'swara mata laya pita': '/covers/swara-mata-laya-pita.jpeg',
  'zero to hero': '/covers/zero-to-hero.jpg',
  'the power of your subconscious mind': '/covers/power-of-subconscious-mind.jpg',
  'rich dad poor dad': '/covers/rich-dad-poor-dad.jpg',
  'how to win friends and influence people': '/covers/how-to-win-friends.jpg',
  mindset: '/covers/mindset.jpg',
  'nation of idiora': '/covers/nation-of-idiots.jpg',
  grit: '/covers/grit.jpg',
  'chalo dilli endu hodavarelli': '/covers/chalo-dilli-endu-hodavarelli.jpg',
  'the courage to be disliked': '/covers/courage-to-be-disliked.jpg',
  'psycho cybernetics': '/covers/psycho-cybernetics.jpg',
  '48 laws of power': '/covers/48-laws-of-power.jpg',
  'wings of fire': '/covers/wings-of-fire.jpg',
  'the book of elon': '/covers/book-of-elon.jpg',
  'here there and everywhere': '/covers/here-there-everywhere.jpg',
  'think like ceo': '/covers/think-like-ceo.jpg',
  'winning people without losing yourself': '/covers/winning-people-without-losing-yourself.jpg',
  'kaveri inda mekangige': '/covers/kaveri-inda-mekangige.jpg',
  'paripoorna prashnegalu paripoorna uttargalu': '/covers/paripoorna-prashnegalu-paripoorna-uttargalu.jpg',
  'krishnana arasutta': '/covers/krishnana-arasutta.jpg',
  'bijapur bhavya prapancha': '/covers/bijapur-bhavya-prapancha.jpg',
  'updesha kategalu': '/covers/updesha-kategalu.jpg',
  'prachina bharatada maharshigalu': '/covers/prachina-bharatada-maharshigalu.jpg',
};

const knownAuthorByTitle: Record<string, string> = {
  'zero to hero': 'Robin Sharma',
  'the book of elon': 'Walter Isaacson',
  'mukajjiya kanasugalu': 'K. Shivaram Karanth',
  'winning people without losing yourself': 'Ankur Warikoo',
};

function normalizeBookTitle(title: string): string {
  return title
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getApprovedBookCover(title: string): string | undefined {
  return approvedCoverByTitle[normalizeBookTitle(title)];
}

export function toBookProduct(book: BookApiRecord): Product {
  const stockCount = Number(book.stock ?? 0);
  const coverImage = book.cover_image ?? book.coverImage ?? '';
  const approvedCover = getApprovedBookCover(book.name);
  const knownAuthor = knownAuthorByTitle[normalizeBookTitle(book.name)];
  const safeCoverImage = approvedCover ?? (/^(https:\/\/|data:image\/)/i.test(coverImage)
    ? coverImage
    : getCoverPlaceholder(book.name));

  return {
    id: String(book.id),
    name: book.name,
    author: knownAuthor ?? (book.author && !['BookVision', 'Kannada Classic'].includes(book.author)
      ? book.author
      : 'Author unavailable'),
    description: book.description ?? '',
    coverImage: safeCoverImage,
    brand: book.brand ?? 'BookVision',
    price: Number(book.price ?? 0),
    originalPrice: book.originalPrice
      ? Number(book.originalPrice)
      : undefined,
    rating: Number(book.rating ?? 0),
    reviews: Number(book.reviews ?? 0),
    category: book.category ?? 'Books',
    image: 'book',
    inStock: stockCount > 0,
    stockCount,
    tags: Array.isArray(book.tags) ? book.tags : [],
    matchScore: book.matchScore
      ? Number(book.matchScore)
      : undefined,
    isRentable: Number(book.is_rentable ?? book.isRentable ?? 0) === 1,
    rentalPrice: Number(book.rental_price ?? book.rentalPrice ?? 0),
    ownershipPrice:
      book.ownership_price !== undefined || book.ownershipPrice !== undefined
        ? Number(book.ownership_price ?? book.ownershipPrice)
        : undefined,
    rentalDurationDays: Number(
      book.rental_duration_days ?? book.rentalDurationDays ?? 30
    ),
  };
}
