import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type SiteLanguage = 'en' | 'kn';

const KANNADA: Record<string, string> = {
  'Home': 'ಮುಖಪುಟ',
  'My Account': 'ನನ್ನ ಖಾತೆ',
  'Customers': 'ಗ್ರಾಹಕರು',
  'Favorites': 'ಮೆಚ್ಚಿನವುಗಳು',
  'Ask Jnana Nidhi': 'ಜ್ಞಾನ ನಿಧಿಯನ್ನು ಕೇಳಿ',
  'My Orders': 'ನನ್ನ ಆರ್ಡರ್‌ಗಳು',
  'Reading Bag': 'ಓದುವ ಚೀಲ',
  'Rentals': 'ಬಾಡಿಗೆಗಳು',
  'Bookstore': 'ಪುಸ್ತಕ ಮಳಿಗೆ',
  'Profile, orders, rentals, payments, and addresses': 'ಪ್ರೊಫೈಲ್, ಆರ್ಡರ್‌ಗಳು, ಬಾಡಿಗೆ, ಪಾವತಿಗಳು ಮತ್ತು ವಿಳಾಸಗಳು',
  'Books for Everyone, Rich or Poor, Everyone Deserves the Power of Knowledge.': 'ಪುಸ್ತಕಗಳು ಎಲ್ಲರಿಗಾಗಿ — ಶ್ರೀಮಂತರಾಗಲಿ ಬಡವರಾಗಲಿ, ಜ್ಞಾನದ ಶಕ್ತಿ ಎಲ್ಲರಿಗೂ ಸಿಗಬೇಕು.',
  'A little more wonder, every day': 'ಪ್ರತಿದಿನವೂ ಇನ್ನಷ್ಟು ಅದ್ಭುತ',
  'Thoughtful reads for curious minds. Explore stories, ideas, and practical knowledge, then bring your next favorite home.': 'ಕುತೂಹಲದ ಮನಸ್ಸುಗಳಿಗೆ ಅರ್ಥಪೂರ್ಣ ಓದು. ಕಥೆಗಳು, ಆಲೋಚನೆಗಳು ಮತ್ತು ಉಪಯುಕ್ತ ಜ್ಞಾನವನ್ನು ಅನ್ವೇಷಿಸಿ; ನಿಮ್ಮ ಮುಂದಿನ ಮೆಚ್ಚಿನ ಪುಸ್ತಕವನ್ನು ಮನೆಗೆ ಕೊಂಡೊಯ್ಯಿರಿ.',
  'Explore the shelves': 'ಪುಸ್ತಕಗಳನ್ನು ಅನ್ವೇಷಿಸಿ',
  'Browse by category': 'ವರ್ಗದ ಪ್ರಕಾರ ನೋಡಿ',
  'Reader-loved': 'ಓದುಗರ ಮೆಚ್ಚಿನವು',
  'Popular books': 'ಜನಪ್ರಿಯ ಪುಸ್ತಕಗಳು',
  'Find your next read': 'ಮುಂದಿನ ಓದನ್ನು ಹುಡುಕಿ',
  'All books': 'ಎಲ್ಲ ಪುಸ್ತಕಗಳು',
  'Loading the Jnana Nidhi catalog…': 'ಜ್ಞಾನ ನಿಧಿ ಪುಸ್ತಕಗಳ ಪಟ್ಟಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
  'The catalog is unavailable. Please refresh to try again.': 'ಪುಸ್ತಕಗಳ ಪಟ್ಟಿ ಲಭ್ಯವಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಲು ಪುಟವನ್ನು ರಿಫ್ರೆಶ್ ಮಾಡಿ.',
  'No books in this category yet.': 'ಈ ವರ್ಗದಲ್ಲಿ ಇನ್ನೂ ಪುಸ್ತಕಗಳಿಲ್ಲ.',
  'A thoughtful starting point': 'ಒಳ್ಳೆಯ ಆರಂಭ',
  'AI recommended books': 'AI ಶಿಫಾರಸು ಮಾಡಿದ ಪುಸ್ತಕಗಳು',
  'Tell Jnana Nidhi what you love, what you are learning, or what mood you are in. Your Buyer Agent can search the catalog and help you find a book that fits.': 'ನಿಮಗೆ ಇಷ್ಟವಾದ ವಿಷಯ, ನೀವು ಕಲಿಯುತ್ತಿರುವುದು ಅಥವಾ ನಿಮ್ಮ ಮನಸ್ಥಿತಿಯನ್ನು ಜ್ಞಾನ ನಿಧಿಗೆ ತಿಳಿಸಿ. ನಿಮಗೆ ಸೂಕ್ತವಾದ ಪುಸ್ತಕವನ್ನು ಹುಡುಕಲು AI ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
  'Get a recommendation': 'ಶಿಫಾರಸು ಪಡೆಯಿರಿ',
  'Read, return, repeat': 'ಓದಿ, ಹಿಂತಿರುಗಿಸಿ, ಮತ್ತೆ ಓದಿ',
  'Rent a book. Keep your curiosity.': 'ಪುಸ್ತಕ ಬಾಡಿಗೆಗೆ ಪಡೆಯಿರಿ. ನಿಮ್ಮ ಕುತೂಹಲವನ್ನು ಜೀವಂತವಾಗಿಡಿ.',
  'Browse categories': 'ವರ್ಗಗಳನ್ನು ನೋಡಿ',
  'Find your kind of story': 'ನಿಮ್ಮ ಅಭಿರುಚಿಯ ಕಥೆ ಹುಡುಕಿ',
  'Wander by subject, follow a question, and see where a good book takes you.': 'ವಿಷಯಗಳನ್ನು ಅನ್ವೇಷಿಸಿ, ಪ್ರಶ್ನೆಗಳನ್ನು ಹಿಂಬಾಲಿಸಿ; ಒಳ್ಳೆಯ ಪುಸ್ತಕ ನಿಮ್ಮನ್ನು ಎಲ್ಲಿಗೆ ಕರೆದೊಯ್ಯುತ್ತದೆ ನೋಡಿ.',
  'A bookstore for the curious': 'ಕುತೂಹಲಿಗಳಿಗೆ ಪುಸ್ತಕ ಮಳಿಗೆ',
  'A good place to begin': 'ಆರಂಭಿಸಲು ಒಳ್ಳೆಯ ಸ್ಥಳ',
  'Featured Books': 'ವಿಶೇಷ ಪುಸ್ತಕಗಳು',
  'Available to rent': 'ಬಾಡಿಗೆಗೆ ಲಭ್ಯ',
  'Make room for a new perspective.': 'ಹೊಸ ದೃಷ್ಟಿಕೋನಕ್ಕೆ ಜಾಗ ಮಾಡಿಕೊಳ್ಳಿ.',
  'Good books. Better days.': 'ಒಳ್ಳೆಯ ಪುಸ್ತಕಗಳು. ಉತ್ತಮ ದಿನಗಳು.',
  'A gentler way to discover your next favorite.': 'ನಿಮ್ಮ ಮುಂದಿನ ಮೆಚ್ಚಿನ ಪುಸ್ತಕವನ್ನು ಕಂಡುಕೊಳ್ಳುವ ಸುಲಭ ಮಾರ್ಗ.',
  'Rentable': 'ಬಾಡಿಗೆಗೆ ಲಭ್ಯ',
  'Rent now': 'ಈಗ ಬಾಡಿಗೆಗೆ ಪಡೆಯಿರಿ',
  'Add rental to bag': 'ಬಾಡಿಗೆಯನ್ನು ಚೀಲಕ್ಕೆ ಸೇರಿಸಿ',
  'Why Jnana Nidhi': 'ಜ್ಞಾನ ನಿಧಿ ಏಕೆ',
  'A shelf with a point of view': 'ಆಲೋಚನೆಗೆ ಪ್ರೇರೇಪಿಸುವ ಪುಸ್ತಕಗಳು',
  'Explore books chosen for clear ideas, memorable stories, and the questions they leave with you.': 'ಸ್ಪಷ್ಟ ಆಲೋಚನೆಗಳು, ನೆನಪಿನಲ್ಲಿ ಉಳಿಯುವ ಕಥೆಗಳು ಮತ್ತು ಚಿಂತನೆಗೆ ಹಚ್ಚುವ ಪ್ರಶ್ನೆಗಳಿರುವ ಪುಸ್ತಕಗಳನ್ನು ಅನ್ವೇಷಿಸಿ.',
  'Find a better fit': 'ನಿಮಗೆ ಸೂಕ್ತವಾದ ಪುಸ್ತಕ ಹುಡುಕಿ',
  'Ask the AI Buyer for help by subject, author, budget, or the kind of reading you are in the mood for.': 'ವಿಷಯ, ಲೇಖಕ, ಬಜೆಟ್ ಅಥವಾ ನಿಮ್ಮ ಓದುವ ಆಸಕ್ತಿಗೆ ತಕ್ಕಂತೆ AI Buyer ಸಹಾಯ ಪಡೆಯಿರಿ.',
  'Read at your own pace': 'ನಿಮ್ಮ ವೇಗದಲ್ಲಿ ಓದಿ',
  'Buy a book for your shelves or rent an eligible title and decide what to do after reading.': 'ನಿಮ್ಮ ಸಂಗ್ರಹಕ್ಕೆ ಪುಸ್ತಕ ಖರೀದಿಸಿ ಅಥವಾ ಲಭ್ಯವಿರುವ ಪುಸ್ತಕವನ್ನು ಬಾಡಿಗೆಗೆ ಪಡೆದು ಓದಿದ ನಂತರ ನಿರ್ಧರಿಸಿ.',
  'Our story': 'ನಮ್ಮ ಕಥೆ',
  'About Us': 'ನಮ್ಮ ಬಗ್ಗೆ',
  'Welcome to Jnana Nidhi Hubballi, an online bookstore founded by Krishna. Our core vision is rooted in a powerful belief:': 'ಕೃಷ್ಣ ಅವರು ಸ್ಥಾಪಿಸಿದ ಆನ್‌ಲೈನ್ ಪುಸ್ತಕ ಮಳಿಗೆ ಜ್ಞಾನ ನಿಧಿ ಹುಬ್ಬಳ್ಳಿಗೆ ಸ್ವಾಗತ. ನಮ್ಮ ದೃಢವಾದ ನಂಬಿಕೆ ಇದು:',
  'We understand that buying every book you wish to read can be expensive. That is why we are here to bridge the gap—making reading affordable and accessible to all without heavy costs. We bring original, high-quality, branded books straight to your hands at a minimal cost, ensuring that financial constraints never stand between you and a great story.': 'ನೀವು ಓದಲು ಬಯಸುವ ಪ್ರತಿಯೊಂದು ಪುಸ್ತಕವನ್ನೂ ಖರೀದಿಸುವುದು ದುಬಾರಿಯಾಗಬಹುದು ಎಂಬುದು ನಮಗೆ ತಿಳಿದಿದೆ. ಅದಕ್ಕಾಗಿ ಓದನ್ನು ಎಲ್ಲರಿಗೂ ಕೈಗೆಟುಕುವಂತೆ ಮಾಡಲು ನಾವು ಪ್ರಯತ್ನಿಸುತ್ತೇವೆ. ಮೂಲ, ಉತ್ತಮ ಗುಣಮಟ್ಟದ ಬ್ರಾಂಡೆಡ್ ಪುಸ್ತಕಗಳನ್ನು ಕಡಿಮೆ ಬೆಲೆಗೆ ನಿಮ್ಮ ಕೈಗೆ ತಲುಪಿಸುತ್ತೇವೆ; ಹಣದ ಕೊರತೆ ಒಳ್ಳೆಯ ಕಥೆ ಓದಲು ಅಡ್ಡಿಯಾಗಬಾರದು.',
  'Special Quotes': 'ವಿಶೇಷ ಉಕ್ತಿಗಳು',
  '“No need to buy expensive books anymore! At a lesser cost, we bring books right to your doorstep for reading.”': '“ಇನ್ನು ದುಬಾರಿ ಪುಸ್ತಕಗಳನ್ನು ಖರೀದಿಸುವ ಅಗತ್ಯವಿಲ್ಲ! ಕಡಿಮೆ ವೆಚ್ಚದಲ್ಲಿ ಓದಲು ಪುಸ್ತಕಗಳನ್ನು ನಿಮ್ಮ ಮನೆಬಾಗಿಲಿಗೆ ತಲುಪಿಸುತ್ತೇವೆ.”',
  '“Worry less about money and keep reading... because what you read matters to us!”': '“ಹಣದ ಬಗ್ಗೆ ಕಡಿಮೆ ಚಿಂತಿಸಿ, ಓದು ಮುಂದುವರಿಸಿ... ನೀವು ಓದುವುದು ನಮಗೆ ಮುಖ್ಯ!”',
  'Find us in Hubli': 'ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿ ನಮ್ಮನ್ನು ಹುಡುಕಿ',
  'Come by the shelves.': 'ಪುಸ್ತಕಗಳಿಗಾಗಿ ನಮ್ಮಲ್ಲಿಗೆ ಬನ್ನಿ.',
  'Visit a Jnana Nidhi location and find your next read in person.': 'ಜ್ಞಾನ ನಿಧಿ ಸ್ಥಳಕ್ಕೆ ಭೇಟಿ ನೀಡಿ, ನಿಮ್ಮ ಮುಂದಿನ ಓದನ್ನು ನೇರವಾಗಿ ಆಯ್ಕೆಮಾಡಿ.',
  'Scan to WhatsApp Jnana Nidhi about books and locations': 'ಪುಸ್ತಕಗಳು ಮತ್ತು ಸ್ಥಳಗಳ ಬಗ್ಗೆ ತಿಳಿಯಲು ಜ್ಞಾನ ನಿಧಿಗೆ WhatsApp ಮಾಡಿ',
  'AI Buyer': 'AI ಪುಸ್ತಕ ಸಹಾಯಕ',
  'Orders': 'ಆರ್ಡರ್‌ಗಳು',
  'Reading bag': 'ಓದುವ ಚೀಲ',
  'Book collection at your preferred location: 9071111074': 'ನಿಮ್ಮ ಆಯ್ಕೆಯ ಸ್ಥಳದಲ್ಲಿ ಪುಸ್ತಕ ಪಡೆಯಲು 9071111074 ಗೆ ಕರೆ ಮಾಡಿ',
  'Visit Our YouTube Channel': 'ನಮ್ಮ YouTube ಚಾನೆಲ್ ನೋಡಿ',
  'Follow Us on Instagram': 'Instagram ನಲ್ಲಿ ನಮ್ಮನ್ನು ಅನುಸರಿಸಿ',
  'Language': 'ಭಾಷೆ',
  'Workspace': 'ಕಾರ್ಯಕ್ಷೇತ್ರ',
  'Jnana Nidhi assistant ready': 'ಜ್ಞಾನ ನಿಧಿ ಸಹಾಯಕ ಸಿದ್ಧವಾಗಿದೆ',
  'Search by title, author, subject, or mood.': 'ಶೀರ್ಷಿಕೆ, ಲೇಖಕ, ವಿಷಯ ಅಥವಾ ಮನಸ್ಥಿತಿಯಿಂದ ಹುಡುಕಿ.',
  'All systems operational': 'ಎಲ್ಲಾ ವ್ಯವಸ್ಥೆಗಳು ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿವೆ',
  'Biography': 'ಜೀವನಚರಿತ್ರೆ',
  'Business': 'ವ್ಯವಹಾರ',
  'Communication': 'ಸಂವಹನ',
  'Development': 'ಅಭಿವೃದ್ಧಿ',
  'Essays': 'ಪ್ರಬಂಧಗಳು',
  'Finance': 'ಹಣಕಾಸು',
  'History': 'ಇತಿಹಾಸ',
  'Kannada Literature': 'ಕನ್ನಡ ಸಾಹಿತ್ಯ',
  'Leadership': 'ನಾಯಕತ್ವ',
  'Lifestyle': 'ಜೀವನಶೈಲಿ',
  'Motivation': 'ಪ್ರೇರಣೆ',
  'Music & Thought': 'ಸಂಗೀತ ಮತ್ತು ಚಿಂತನೆ',
  'Personal Growth': 'ವೈಯಕ್ತಿಕ ಬೆಳವಣಿಗೆ',
  'Philosophy': 'ತತ್ವಶಾಸ್ತ್ರ',
  'Productivity': 'ಉತ್ಪಾದಕತೆ',
  'Psychology': 'ಮನೋವಿಜ್ಞಾನ',
  'Self-Help': 'ಸ್ವ-ಸಹಾಯ',
  'Social Thought': 'ಸಾಮಾಜಿಕ ಚಿಂತನೆ',
  'Software Development': 'ಸಾಫ್ಟ್‌ವೇರ್ ಅಭಿವೃದ್ಧಿ',
  'Spiritual Growth': 'ಆಧ್ಯಾತ್ಮಿಕ ಬೆಳವಣಿಗೆ',
  'Wisdom': 'ಜ್ಞಾನ',
  'Website services': 'ವೆಬ್‌ಸೈಟ್ ಸೇವೆಗಳು',
  'Need a website like this?': 'ನಿಮಗೂ ಇಂತಹ ವೆಬ್‌ಸೈಟ್ ಬೇಕೇ?',
  'Books on their way and reads already found': 'ನಿಮ್ಮ ಬಳಿಗೆ ಬರುತ್ತಿರುವ ಪುಸ್ತಕಗಳು ಮತ್ತು ನಿಮ್ಮ ಓದುಗಳು',
  'Your reading bag': 'ನಿಮ್ಮ ಓದುವ ಚೀಲ',
  'Books saved to your reading list': 'ನಿಮ್ಮ ಓದುಪಟ್ಟಿಯಲ್ಲಿ ಉಳಿಸಿದ ಪುಸ್ತಕಗಳು',
  'Book categories': 'ಪುಸ್ತಕದ ವರ್ಗಗಳು',
  'Curated reading sets': 'ಆಯ್ದ ಓದು ಸಂಗ್ರಹಗಳು',
  'Book Combos': 'ಪುಸ್ತಕಗಳ ಕಾಂಬೊಗಳು',
  'Thoughtful groupings from the approved Jnana Nidhi collection.': 'ಜ್ಞಾನ ನಿಧಿಯ ಆಯ್ದ ಸಂಗ್ರಹದಿಂದ ಅರ್ಥಪೂರ್ಣ ಪುಸ್ತಕ ಗುಂಪುಗಳು.',
  'books': 'ಪುಸ್ತಕಗಳು',
  'Individual total': 'ಪ್ರತ್ಯೇಕ ಪುಸ್ತಕಗಳ ಮೊತ್ತ',
  'Combo price': 'ಕಾಂಬೊ ಬೆಲೆ',
  'Save': 'ಉಳಿತಾಯ',
  'Add Combo to Cart': 'ಕಾಂಬೊವನ್ನು ಚೀಲಕ್ಕೆ ಸೇರಿಸಿ',
  'A book in this combo is unavailable.': 'ಈ ಕಾಂಬೊದಲ್ಲಿನ ಒಂದು ಪುಸ್ತಕ ಲಭ್ಯವಿಲ್ಲ.',
  'Self Growth Combo': 'ಸ್ವ-ಬೆಳವಣಿಗೆ ಕಾಂಬೊ',
  'Purpose, habits, and the courage to grow.': 'ಗುರಿ, ಅಭ್ಯಾಸಗಳು ಮತ್ತು ಬೆಳೆಯುವ ಧೈರ್ಯ.',
  'Money & Finance Combo': 'ಹಣ ಮತ್ತು ಹಣಕಾಸು ಕಾಂಬೊ',
  'Build perspective around money and long-term choices.': 'ಹಣ ಮತ್ತು ದೀರ್ಘಕಾಲದ ನಿರ್ಧಾರಗಳ ಬಗ್ಗೆ ದೃಷ್ಟಿಕೋನ ಬೆಳೆಸಿಕೊಳ್ಳಿ.',
  'Mind & Psychology Combo': 'ಮನಸ್ಸು ಮತ್ತು ಮನೋವಿಜ್ಞಾನ ಕಾಂಬೊ',
  'Explore mindset, self-image, and inner thinking.': 'ಮನೋಭಾವ, ಸ್ವ-ಚಿತ್ರಣ ಮತ್ತು ಆಂತರಿಕ ಚಿಂತನೆಯನ್ನು ಅನ್ವೇಷಿಸಿ.',
  'Productivity Combo': 'ಉತ್ಪಾದಕತೆ ಕಾಂಬೊ',
  'Attention, persistence, and focused work.': 'ಗಮನ, ಪರಿಶ್ರಮ ಮತ್ತು ಏಕಾಗ್ರ ಕೆಲಸ.',
  'Leadership / Business Combo': 'ನಾಯಕತ್ವ / ವ್ಯವಹಾರ ಕಾಂಬೊ',
  'Influence, leadership, and business perspectives.': 'ಪ್ರಭಾವ, ನಾಯಕತ್ವ ಮತ್ತು ವ್ಯವಹಾರದ ದೃಷ್ಟಿಕೋನಗಳು.',
  'Kannada Books Combo': 'ಕನ್ನಡ ಪುಸ್ತಕಗಳ ಕಾಂಬೊ',
  'A selection of Kannada titles from the Jnana Nidhi shelf.': 'ಜ್ಞಾನ ನಿಧಿ ಸಂಗ್ರಹದಿಂದ ಆಯ್ದ ಕನ್ನಡ ಪುಸ್ತಕಗಳು.',
  'Indian History & Knowledge Combo': 'ಭಾರತೀಯ ಇತಿಹಾಸ ಮತ್ತು ಜ್ಞಾನ ಕಾಂಬೊ',
  'History, ideas, and knowledge rooted in India.': 'ಭಾರತದ ಇತಿಹಾಸ, ವಿಚಾರಗಳು ಮತ್ತು ಜ್ಞಾನ.',
  'Rental guidelines': 'ಬಾಡಿಗೆ ಮಾರ್ಗಸೂಚಿಗಳು',
  'How Jnana Nidhi Rentals Work': 'ಜ್ಞಾನ ನಿಧಿ ಪುಸ್ತಕ ಬಾಡಿಗೆ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
  'Everything you need to know before you rent — from deposit to return, delivery to drop-off.': 'ಬಾಡಿಗೆಗೆ ಮುನ್ನ ತಿಳಿಯಬೇಕಾದದ್ದು — ಠೇವಣಿ ಮತ್ತು ಹಿಂತಿರುಗಿಸುವುದರಿಂದ ವಿತರಣೆ ಮತ್ತು ಹಸ್ತಾಂತರದವರೆಗೆ.',
  'Reader Membership': 'ಓದುಗರ ಸದಸ್ಯತ್ವ',
  'Choose either Regular Reader or Specific Book Reader at checkout. Both plans pay the ₹500 membership fee plus the actual rental fee for the selected title.': 'ಪಾವತಿ ವೇಳೆ Regular Reader ಅಥವಾ Specific Book Reader ಆಯ್ಕೆಮಾಡಿ. ಎರಡೂ ಯೋಜನೆಗಳಲ್ಲಿ ₹500 ಸದಸ್ಯತ್ವ ಶುಲ್ಕ ಮತ್ತು ಆಯ್ದ ಪುಸ್ತಕದ ಬಾಡಿಗೆ ಶುಲ್ಕ ಪಾವತಿಸಬೇಕು.',
  'Keep Books Clean & Safe': 'ಪುಸ್ತಕಗಳನ್ನು ಸ್ವಚ್ಛವಾಗಿ ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿ ಇರಿಸಿ',
  'Please keep rented books dry and clean. Avoid folding pages, writing in the margins, tearing pages, or exposing the book to water, heat, or heavy wear.': 'ಬಾಡಿಗೆ ಪುಸ್ತಕಗಳನ್ನು ಒಣಗಿಸಿ ಸ್ವಚ್ಛವಾಗಿ ಇರಿಸಿ. ಪುಟಗಳನ್ನು ಮಡಚುವುದು, ಅಂಚಿನಲ್ಲಿ ಬರೆಯುವುದು, ಹರಿಯುವುದು ಅಥವಾ ನೀರು, ಬಿಸಿಲು ಮತ್ತು ಹೆಚ್ಚಿನ ಸವೆತಕ್ಕೆ ಒಳಪಡಿಸುವುದನ್ನು ತಪ್ಪಿಸಿ.',
  'Delivery & Pickup': 'ವಿತರಣೆ ಮತ್ತು ಪಡೆದುಕೊಳ್ಳುವುದು',
  'Jnana Nidhi arranges delivery to your address and pickup on return, subject to our service areas and schedule. You will be notified as your book moves through each step.': 'ಸೇವಾ ಪ್ರದೇಶ ಮತ್ತು ವೇಳಾಪಟ್ಟಿಗೆ ಅನುಗುಣವಾಗಿ ಜ್ಞಾನ ನಿಧಿ ನಿಮ್ಮ ವಿಳಾಸಕ್ಕೆ ಪುಸ್ತಕ ತಲುಪಿಸಿ, ಹಿಂತಿರುಗಿಸುವಾಗ ಪಡೆದುಕೊಳ್ಳುತ್ತದೆ. ಪ್ರತಿ ಹಂತದ ಮಾಹಿತಿ ನಿಮಗೆ ತಿಳಿಸಲಾಗುತ್ತದೆ.',
  'Return & Refund': 'ಹಿಂತಿರುಗಿಸುವಿಕೆ ಮತ್ತು ಮರುಪಾವತಿ',
  'Regular Reader plans do not receive an early refund. Specific Book Reader plans can receive a ₹300 refund after the book is returned and the return is confirmed by Jnana Nidhi.': 'Regular Reader ಯೋಜನೆಗೆ ಮುಂಚಿತ ಮರುಪಾವತಿ ಇಲ್ಲ. Specific Book Reader ಯೋಜನೆಯಲ್ಲಿ ಪುಸ್ತಕ ಹಿಂತಿರುಗಿಸಿ ಜ್ಞಾನ ನಿಧಿ ದೃಢೀಕರಿಸಿದ ನಂತರ ₹300 ಮರುಪಾವತಿ ಸಿಗಬಹುದು.',
  'Damage or Lost Book': 'ಹಾನಿಗೊಂಡ ಅಥವಾ ಕಳೆದುಹೋದ ಪುಸ್ತಕ',
  'Excessive damage, water damage, or loss of the rented book may result in a deduction from your security deposit. Normal handling wear is expected and will not incur any charge.': 'ಹೆಚ್ಚಿನ ಹಾನಿ, ನೀರಿನಿಂದ ಹಾನಿ ಅಥವಾ ಬಾಡಿಗೆ ಪುಸ್ತಕ ಕಳೆದುಹೋದರೆ ಭದ್ರತಾ ಠೇವಣಿಯಿಂದ ಮೊತ್ತ ಕಡಿತವಾಗಬಹುದು. ಸಾಮಾನ್ಯ ಬಳಕೆಯ ಸವೆತಕ್ಕೆ ಶುಲ್ಕವಿಲ್ಲ.',
  'Pickup & Drop-off Points': 'ಪಡೆದುಕೊಳ್ಳುವ ಮತ್ತು ಹಸ್ತಾಂತರಿಸುವ ಸ್ಥಳಗಳು',
  'Jnana Nidhi supports designated pickup and drop-off points within our service zones. Select a convenient location at checkout or request a home pickup when arranging your return.': 'ನಮ್ಮ ಸೇವಾ ಪ್ರದೇಶಗಳಲ್ಲಿ ನಿಗದಿತ ಪಡೆದುಕೊಳ್ಳುವ ಮತ್ತು ಹಸ್ತಾಂತರಿಸುವ ಸ್ಥಳಗಳಿವೆ. ಪಾವತಿ ವೇಳೆ ಅನುಕೂಲಕರ ಸ್ಥಳ ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಹಿಂತಿರುಗಿಸುವಾಗ ಮನೆಗೆ ಬಂದು ಪಡೆದುಕೊಳ್ಳಲು ತಿಳಿಸಿ.',
  'Questions about your rental? Use the': 'ಬಾಡಿಗೆ ಕುರಿತು ಪ್ರಶ್ನೆಗಳಿವೆಯೇ? ಬಳಸಿ',
  'AI to get answers instantly.': 'ತಕ್ಷಣ ಉತ್ತರ ಪಡೆಯಲು AI ಸಹಾಯಕವನ್ನು ಬಳಸಿ.',
  'Need a website for your business? Email us to discuss your project.': 'ನಿಮ್ಮ ವ್ಯವಹಾರಕ್ಕೆ ವೆಬ್‌ಸೈಟ್ ಬೇಕೇ? ನಿಮ್ಮ ಯೋಜನೆ ಕುರಿತು ಮಾತನಾಡಲು ನಮಗೆ ಇಮೇಲ್ ಮಾಡಿ.',
};

interface LanguageContextValue {
  language: SiteLanguage;
  setLanguage: (language: SiteLanguage) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = 'jnana-nidhi-language';

function getInitialLanguage(): SiteLanguage {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'kn' ? 'kn' : 'en';
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SiteLanguage>(getInitialLanguage);
  useEffect(() => {
    document.documentElement.lang = language === 'kn' ? 'kn' : 'en';
  }, [language]);
  const setLanguage = useCallback((next: SiteLanguage) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next === 'kn' ? 'kn' : 'en';
    } catch {
      // Language still updates for this session if storage is unavailable.
    }
  }, []);
  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (text) => language === 'kn' ? (KANNADA[text] ?? text) : text,
  }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
