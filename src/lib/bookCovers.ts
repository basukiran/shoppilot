// ---------------------------------------------------------------------------
// verifiedCoverIds — OpenLibrary cover IDs for the BookVision / Jnana Nidhi
// Hubballi catalog.
//
// Key  : book title in lower-case (used as lookup key)
// Value: OpenLibrary cover ID  →  https://covers.openlibrary.org/b/id/{id}-L.jpg
//
// Titles without a confirmed OpenLibrary record fall back to getCoverPlaceholder(),
// which generates a unique, branded SVG cover so every card looks polished.
// ---------------------------------------------------------------------------

const verifiedCoverIds: Record<string, string> = {
  // ── International titles ─────────────────────────────────────────────────
  'the power of your subconscious mind': '6553019',
  "india's struggle for independence 1857-1947": '15201172',
  'ikigai': '11300391',
  'deep work': '7988607',
  'psychology of money': '10389354',
  'rich dad poor dad': '8315603',
  'how to win friends and influence people': '13314878',
  'mindset': '746414',
  'grit': '7438753',
  'secret': '845815',
  'psycho cybernetics': '14428293',
  '48 laws of power': '6424160',
  'wings of fire': '9153819',
  'the courage to be disliked': '15179268',
  'why i am an atheist and other writings': '15088375',
  'the book of elon': '8463846',

  // ── Titles whose correct covers were already in the previous version ──────
  // (kept here as aliases in case title casing varies)
  'how to win friends & influence people': '13314878',
  'psycho-cybernetics': '14428293',
  'the 48 laws of power': '6424160',
};

// ---------------------------------------------------------------------------
// getCoverPlaceholder — generates a unique branded SVG when no cover photo
// is available. Each book gets a distinct colour, pattern, and circle shape
// derived deterministically from its title.
// ---------------------------------------------------------------------------

export function getCoverPlaceholder(title: string, accent = '#0c4a3a', highlight = '#d9b76f') {
  const seed = Array.from(title).reduce((value, character) => value + character.charCodeAt(0), 0);
  const offset = seed % 90;
  const stripeSize = 24 + seed % 22;
  const rotation = seed % 50;
  const circleX = 180 + seed % 440;
  const circleY = 320 + seed % 390;
  const circleRadius = 90 + seed % 110;
  const stripeWidth = 3 + seed % 7;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100" role="img" aria-label="Cover image unavailable">
      <defs>
        <pattern id="lines" width="${stripeSize}" height="${stripeSize}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rotation})">
          <path d="M0 0V1100" stroke="${highlight}" stroke-opacity=".3" stroke-width="${stripeWidth}"/>
        </pattern>
      </defs>
      <rect width="800" height="1100" fill="#f5f1e8"/>
      <path d="M0 ${180 + offset} Q400 ${-80 + offset} 800 ${180 + offset} V1100 H0Z" fill="${accent}"/>
      <rect width="800" height="1100" fill="url(#lines)"/>
      <circle cx="${circleX}" cy="${circleY}" r="${circleRadius}" fill="${highlight}" fill-opacity=".36"/>
      <rect x="82" y="760" width="636" height="190" rx="8" fill="#f5f1e8" fill-opacity=".96"/>
      <text x="400" y="834" text-anchor="middle" fill="${accent}" font-size="32" font-weight="700" letter-spacing="2" font-family="Arial, sans-serif">COVER IMAGE</text>
      <text x="400" y="887" text-anchor="middle" fill="${accent}" font-size="32" font-weight="700" letter-spacing="2" font-family="Arial, sans-serif">UNAVAILABLE</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// ---------------------------------------------------------------------------
// getBookCoverImage — primary entry point used throughout the app.
// Returns a real OpenLibrary JPEG if available, otherwise a placeholder SVG.
// ---------------------------------------------------------------------------

export function getBookCoverImage(title: string, accent = '#0c4a3a', highlight = '#d9b76f') {
  const coverId = verifiedCoverIds[title.trim().toLowerCase()];
  return coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
    : getCoverPlaceholder(title, accent, highlight);
}
