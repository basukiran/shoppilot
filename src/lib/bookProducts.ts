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

export function toBookProduct(book: BookApiRecord): Product {
  const stockCount = Number(book.stock ?? 0);
  const coverImage = book.cover_image ?? book.coverImage ?? '';
  const safeCoverImage = /^(https:\/\/|data:image\/)/i.test(coverImage)
    ? coverImage
    : getCoverPlaceholder(book.name);

  return {
    id: String(book.id),
    name: book.name,
    author: book.author && !['BookVision', 'Kannada Classic'].includes(book.author)
      ? book.author
      : 'Author unavailable',
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
