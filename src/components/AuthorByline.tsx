import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AuthorPortrait {
  names: string[];
  file: string;
  source: string;
}

const authorPortraits: AuthorPortrait[] = [
  { names: ['joseph murphy'], file: 'joseph-murphy.jpg', source: 'https://www.yakaboo.ua/author/view/Dzhozef_Mjerfi' },
  { names: ['francesc miralles'], file: 'francesc-miralles.jpg', source: 'https://today.yougov.com/topics/entertainment/explore/writer/Francesc_Miralles' },
  { names: ['morgan housel'], file: 'morgan-housel.jpg', source: 'https://www.booktopia.com.au/the-psychology-of-money-morgan-housel/book/9780857197689.html' },
  { names: ['abdul kalam'], file: 'apj-abdul-kalam.jpg', source: 'https://commons.wikimedia.org/wiki/File:A._P._J._Abdul_Kalam.jpg' },
  { names: ['bhagat singh'], file: 'bhagat-singh.jpg', source: 'https://commons.wikimedia.org/wiki/File:Lahore_conspiracy_case_poster_9th_Oct_193o_jindal_sunam_12x9_copy_(cropped).jpg' },
  { names: ['cal newport'], file: 'cal-newport.jpg', source: 'https://www.leighbureau.com/books/deep-work' },
  { names: ['robert kiyosaki'], file: 'robert-kiyosaki.jpg', source: 'https://commons.wikimedia.org/wiki/File:Robert_Kiyosaki_(53864555330)_(cropped).jpg' },
  { names: ['dale carnegie'], file: 'dale-carnegie.jpg', source: 'https://commons.wikimedia.org/wiki/File:Dale_Carnegie_(1937).jpg' },
  { names: ['carol dweck'], file: 'carol-dweck.jpg', source: 'https://commons.wikimedia.org/wiki/File:Carol_Dweck_for_Innovation_documentary.jpg' },
  { names: ['angela duckworth'], file: 'angela-duckworth.jpg', source: 'https://commons.wikimedia.org/wiki/File:Angela_Duckworth,_2017_(cropped).jpg' },
  { names: ['ichiro kishimi'], file: 'ichiro-kishimi.jpg', source: 'https://www.rowohlt.de/autor/ichiro-kishimi-21725' },
  { names: ['fumitake koga'], file: 'fumitake-koga.jpg', source: 'https://www.sekigaku-agora.net/course/akf24b.html' },
  { names: ['bipan chandra'], file: 'bipan-chandra.jpg', source: 'https://www.hindustantimes.com/india/bipan-chandra-the-historian-exemplar-indian-extraordinaire/story-QXpo8Y9I7zEQtqkcwIWILM.html' },
  { names: ['shivaram karanth'], file: 'shivaram-karanth.jpg', source: 'https://www.loksatta.com/navneet/well-known-kannada-writer-k-shivaram-karanth-1449449/' },
  { names: ['maxwell maltz'], file: 'maxwell-maltz.jpg', source: 'https://us.macmillan.com/author/maxwellmaltz' },
  { names: ['robert greene'], file: 'robert-greene.jpg', source: 'https://livetalksla.org/tag/robert-greene/' },
  { names: ['rhonda byrne'], file: 'rhonda-byrne.jpg', source: 'https://www.themoviedb.org/person/74665-rhonda-byrne' },
  { names: ['walter isaacson'], file: 'walter-isaacson.jpg', source: 'https://www.aspenideas.org/speakers/walter-isaacson' },
  { names: ['robin sharma'], file: 'robin-sharma.jpg', source: 'https://www.penguin.co.nz/authors/robin-sharma' },
  { names: ['ankur warikoo'], file: 'ankur-warikoo.jpg', source: 'https://openlibrary.org/authors/OL10140136A/Ankur_Warikoo' },
];

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function Portrait({ author, portrait }: { author: string; portrait: AuthorPortrait }) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <a
      href={portrait.source}
      target="_blank"
      rel="noreferrer"
      aria-label={`View portrait source for ${author}`}
      title={`Portrait source for ${author}`}
      className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-ink-200 bg-ink-100"
    >
      <img
        src={`/authors/${portrait.file}`}
        alt={`${author} portrait`}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </a>
  );
}

export function AuthorByline({
  author,
  className,
}: {
  author: string;
  className?: string;
}) {
  const normalizedAuthor = normalize(author);
  const portraits = authorPortraits.filter((portrait) =>
    portrait.names.some((name) => normalizedAuthor.includes(normalize(name)))
  ).slice(0, 2);

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      {portraits.map((portrait) => (
        <Portrait key={portrait.file} author={author} portrait={portrait} />
      ))}
      <span className="min-w-0 truncate">by {author}</span>
    </div>
  );
}
