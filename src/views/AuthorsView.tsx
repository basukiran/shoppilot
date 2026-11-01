import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, Search, UserRound } from 'lucide-react';
import { getAuthorPortraitUrl } from '@/components/AuthorByline';
import { apiFetch } from '@/lib/api';
import { toBookProduct, type BookApiRecord } from '@/lib/bookProducts';
import type { Product } from '@/types';

const authorNotes: Record<string, string> = {
  'joseph murphy': 'Writer and New Thought minister whose work explores the subconscious mind and personal development.',
  'francesc miralles': 'Spanish writer and journalist known for reflective fiction and books about wellbeing.',
  'morgan housel': 'Financial writer who explains how behavior and psychology shape the way people think about money.',
  'abdul kalam': 'Aerospace scientist and former President of India, remembered for his work in science, education, and public service.',
  'bhagat singh': 'Indian independence activist and writer whose essays and prison writings remain widely read.',
  'cal newport': 'Computer science professor and author who writes about focused work and digital habits.',
  'robert kiyosaki': 'Author and educator known for books about financial literacy and personal finance.',
  'dale carnegie': 'Writer and lecturer whose work focuses on communication, relationships, and personal effectiveness.',
  'carol dweck': 'Psychologist whose research explores motivation, learning, and the idea of a growth mindset.',
  'angela duckworth': 'Psychologist and researcher known for her work on grit, perseverance, and achievement.',
  'ichiro kishimi': 'Japanese philosopher and counselor who writes about Adlerian psychology and personal growth.',
  'fumitake koga': 'Japanese writer who works with Ichiro Kishimi on accessible books about psychology and philosophy.',
  'bipan chandra': 'Indian historian known for writing about modern Indian history and the independence movement.',
  'shivaram karanth': 'Kannada writer, novelist, playwright, and environmentalist whose work is a major part of Kannada literature.',
  'maxwell maltz': 'American surgeon and author whose work connected self-image with personal change.',
  'robert greene': 'American author known for books examining strategy, power, and human behavior through history.',
  'rhonda byrne': 'Australian author and producer known for writing about positive thinking and personal goals.',
  'walter isaacson': 'American biographer and journalist known for detailed biographies of influential figures.',
  'robin sharma': 'Canadian writer and speaker whose books focus on leadership, habits, and personal development.',
  'ankur warikoo': 'Indian entrepreneur, educator, and author who writes about work, money, and personal growth.',
};

function normalize(value: string) {
  return value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

function getAuthorNote(author: string) {
  const name = normalize(author);
  const match = Object.entries(authorNotes).find(([key]) => name.includes(key));
  return match?.[1] ?? 'Discover this author’s work through the books available at Jnana Nidhi.';
}

export function AuthorsView() {
  const [books, setBooks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch('/products')
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load authors');
        return response.json() as Promise<BookApiRecord[]>;
      })
      .then((records) => {
        if (active && Array.isArray(records)) setBooks(records.map(toBookProduct));
      })
      .catch((loadError) => {
        if (active) {
          console.error('Author catalog load error:', loadError);
          setError(true);
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const authors = useMemo(() => {
    const groups = new Map<string, { name: string; books: Product[] }>();
    books.forEach((book) => {
      const name = book.author?.trim();
      if (!name) return;
      const key = normalize(name);
      const group = groups.get(key);
      if (group) group.books.push(book);
      else groups.set(key, { name, books: [book] });
    });
    return [...groups.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((author) => normalize(author.name).includes(normalize(query)));
  }, [books, query]);

  return (
    <section className="bv-cosmic-page mx-auto max-w-7xl rounded-3xl p-5 sm:p-8 lg:p-10">
      <header className="bv-cosmic-page-heading mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-800">
          <BookOpen className="h-4 w-4" /> Meet the authors
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">Stories begin with their authors</h1>
        <p className="mt-3 text-base leading-7 sm:text-lg">Discover the writers and thinkers behind the books on our shelves.</p>
      </header>

      <label className="mx-auto mt-8 flex max-w-xl items-center gap-3 rounded-2xl border border-violet-200 bg-white/90 px-4 py-3 shadow-sm">
        <Search className="h-5 w-5 shrink-0 text-violet-600" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search authors…"
          className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-500"
        />
      </label>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-violet-900"><Loader2 className="h-5 w-5 animate-spin" /> Loading authors…</div>
      ) : error ? (
        <div role="status" className="mx-auto mt-10 max-w-xl rounded-2xl border border-pink-200 bg-pink-50 p-6 text-center text-sm font-medium text-fuchsia-950">
          We couldn’t load the author list right now. Please try again in a moment.
        </div>
      ) : authors.length === 0 ? (
        <div className="py-16 text-center text-sm font-medium text-ink-700">No authors found. Try another name.</div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {authors.map(({ name, books: authorBooks }) => {
            const portrait = getAuthorPortraitUrl(name);
            const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
            return (
              <article key={normalize(name)} className="card overflow-hidden rounded-3xl border border-violet-200/70 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-6">
                <div className="flex items-center gap-4">
                  {portrait ? (
                    <img src={portrait} alt={`${name} portrait`} loading="lazy" className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-sm" />
                  ) : (
                    <div aria-label={`${name} portrait unavailable`} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-200 via-pink-200 to-rose-200 text-xl font-bold text-violet-950">
                      {initials || <UserRound className="h-8 w-8" />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-bold text-violet-950">{name}</h2>
                    <p className="mt-1 text-sm font-semibold text-fuchsia-800">{authorBooks.length} {authorBooks.length === 1 ? 'book' : 'books'} in our catalog</p>
                  </div>
                </div>
                <p className="mt-5 min-h-[4.5rem] text-sm leading-6 text-ink-700">{getAuthorNote(name)}</p>
                <div className="mt-4 border-t border-violet-100 pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-800">Available titles</h3>
                  <ul className="mt-2 space-y-1.5">
                    {authorBooks.slice(0, 4).map((book) => <li key={book.id} className="flex items-start gap-2 text-sm font-medium text-ink-800"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-700" /><span>{book.name}</span></li>)}
                    {authorBooks.length > 4 && <li className="pl-6 text-xs font-semibold text-ink-600">and {authorBooks.length - 4} more</li>}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
