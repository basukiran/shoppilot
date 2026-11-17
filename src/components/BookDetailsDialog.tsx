import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Heart, PackageCheck, ShoppingBag, X } from 'lucide-react';
import type { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { AuthorByline } from '@/components/AuthorByline';
import { useLanguage } from '@/lib/language';

export function BookDetailsDialog({
  book,
  onClose,
  onAddToBag,
  onRent,
}: {
  book: Product;
  onClose: () => void;
  onAddToBag: () => void;
  onRent?: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div className="book-details-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="book-details-title" className="book-details-dialog">
        <button type="button" onClick={onClose} aria-label={t('Close book details')} className="book-details-close"><X className="h-5 w-5" /></button>
        <div className="book-details-layout">
          <div className="book-details-cover-wrap">
            <img src={book.coverImage} alt={`${book.name} cover`} className="book-details-cover" />
          </div>
          <div className="min-w-0">
            <p className="book-details-category">{t(book.category)}</p>
            <h2 id="book-details-title" className="book-details-title">{book.name}</h2>
            <AuthorByline author={book.author} className="mt-2 text-sm text-violet-800" />
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="book-details-price">{formatCurrency(book.price)}</span>
              <span className={`book-details-stock${book.inStock ? ' is-available' : ''}`}><PackageCheck className="h-4 w-4" />{book.inStock ? `${book.stockCount} ${t('in stock')}` : t('Unavailable')}</span>
            </div>
            <div className="book-details-description">
              <h3><BookOpen className="h-4 w-4" />{t('What you’ll find inside')}</h3>
              <p>{book.description || t('Explore the ideas, stories, and insights in this book.')}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" disabled={!book.inStock} onClick={onAddToBag} className="bookstore-button bookstore-button--dark disabled:opacity-50"><ShoppingBag className="h-4 w-4" />{t('Add to Reading Bag')}</button>
              {book.isRentable && onRent && <button type="button" disabled={!book.inStock} onClick={onRent} className="bookstore-button bookstore-button--light disabled:opacity-50"><Heart className="h-4 w-4" />{t('Rent for')} {formatCurrency(book.rentalPrice)} · {book.rentalDurationDays} {t('days')}</button>}
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
