/**
 * RentalGuidelinesSection
 *
 * "How BookVision Rental Works" — six animated instruction cards that
 * reveal on scroll using the Intersection Observer API.
 *
 * No external animation library. Styles live in index.css under .bvr-*.
 * Pricing values intentionally match the live business model:
 *   ₹500 security deposit · ₹50 rental fee · ₹550 total · ₹400 return refund
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ShieldCheck,
  BookOpen,
  Truck,
  RotateCcw,
  AlertTriangle,
  MapPin,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface GuideCard {
  id: string;
  icon: ReactNode;
  step: string;
  title: string;
  body: string;
  accent: string;
}

const cards: GuideCard[] = [
  {
    id: 'deposit',
    icon: <ShieldCheck className="h-6 w-6" strokeWidth={1.6} />,
    step: '01',
    title: 'Membership & Security Deposit',
    body: 'A refundable ₹500 security deposit is collected alongside the ₹50 rental fee at checkout. The deposit is held to protect against loss or damage, and is partially refunded on a clean return.',
    accent: 'bvr-accent--green',
  },
  {
    id: 'care',
    icon: <BookOpen className="h-6 w-6" strokeWidth={1.6} />,
    step: '02',
    title: 'Keep Books Clean & Safe',
    body: 'Please keep rented books dry and clean. Avoid folding pages, writing in the margins, tearing pages, or exposing the book to water, heat, or heavy wear.',
    accent: 'bvr-accent--amber',
  },
  {
    id: 'delivery',
    icon: <Truck className="h-6 w-6" strokeWidth={1.6} />,
    step: '03',
    title: 'Delivery & Pickup',
    body: 'BookVision arranges delivery to your address and pickup on return, subject to our service areas and schedule. You will be notified as your book moves through each step.',
    accent: 'bvr-accent--blue',
  },
  {
    id: 'return',
    icon: <RotateCcw className="h-6 w-6" strokeWidth={1.6} />,
    step: '04',
    title: 'Return Within 30 Days',
    body: 'The rental period is 30 days from delivery. Return the book within this window to receive a ₹400 refund from your deposit. Decide to keep the book, and no additional payment is required.',
    accent: 'bvr-accent--green',
  },
  {
    id: 'damage',
    icon: <AlertTriangle className="h-6 w-6" strokeWidth={1.6} />,
    step: '05',
    title: 'Damage or Lost Book',
    body: 'Excessive damage, water damage, or loss of the rented book may result in a deduction from your security deposit. Normal handling wear is expected and will not incur any charge.',
    accent: 'bvr-accent--red',
  },
  {
    id: 'dropoff',
    icon: <MapPin className="h-6 w-6" strokeWidth={1.6} />,
    step: '06',
    title: 'Pickup & Drop-off Points',
    body: 'BookVision supports designated pickup and drop-off points within our service zones. Select a convenient location at checkout or request a home pickup when arranging your return.',
    accent: 'bvr-accent--amber',
  },
];

// ---------------------------------------------------------------------------
// Animated card
// ---------------------------------------------------------------------------

function GuideCardItem({
  card,
  index,
}: {
  card: GuideCard;
  index: number;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Immediately visible if reduced motion is preferred
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <li
      ref={ref}
      className={`bvr-card${visible ? ' bvr-card--visible' : ''}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Step number — top-right watermark */}
      <span className="bvr-card__step" aria-hidden="true">{card.step}</span>

      {/* Icon */}
      <div className={`bvr-card__icon ${card.accent}`}>
        {card.icon}
      </div>

      {/* Content */}
      <h3 className="bvr-card__title">{card.title}</h3>
      <p className="bvr-card__body">{card.body}</p>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function RentalGuidelinesSection() {
  return (
    <section className="bvr-section" aria-labelledby="bvr-heading">
      {/* Section header */}
      <div className="bvr-header">
        <p className="bookstore-kicker">
          <BookOpen className="h-4 w-4" /> Rental guidelines
        </p>
        <h2
          id="bvr-heading"
          className="bookstore-display bvr-header__title"
        >
          How BookVision Rental Works
        </h2>
        <p className="bvr-header__sub">
          Everything you need to know before you rent — from deposit to
          return, delivery to drop-off.
        </p>
      </div>

      {/* Cards grid */}
      <ul className="bvr-grid" role="list">
        {cards.map((card, i) => (
          <GuideCardItem key={card.id} card={card} index={i} />
        ))}
      </ul>

      {/* Bottom note */}
      <p className="bvr-note">
        Questions about your rental? Use the{' '}
        <strong>Ask BookVision</strong> AI to get answers instantly.
      </p>
    </section>
  );
}
