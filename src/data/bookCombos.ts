export interface BookComboDefinition {
  id: string;
  name: string;
  description: string;
  bookTitles: string[];
  comboPrice: number | null;
}

export const bookCombos: BookComboDefinition[] = [
  {
    id: 'self-growth',
    name: 'Self Growth Combo',
    description: 'Purpose, habits, and the courage to grow.',
    bookTitles: ['ZERO TO HERO', 'DETOX YOUR EGO', 'IKIGAI', 'GRIT'],
    comboPrice: null,
  },
  {
    id: 'money-finance',
    name: 'Money & Finance Combo',
    description: 'Build perspective around money and long-term choices.',
    bookTitles: ['PSYCHOLOGY OF MONEY', 'RICH DAD POOR DAD'],
    comboPrice: null,
  },
  {
    id: 'mind-psychology',
    name: 'Mind & Psychology Combo',
    description: 'Explore mindset, self-image, and inner thinking.',
    bookTitles: [
      'The Power of Your Subconscious Mind',
      'MINDSET',
      'PSYCHO CYBERNETICS',
      'THE COURAGE TO BE DISLIKED',
    ],
    comboPrice: null,
  },
  {
    id: 'productivity',
    name: 'Productivity Combo',
    description: 'Attention, persistence, and focused work.',
    bookTitles: ['DEEP WORK', 'GRIT', 'THINK LIKE CEO'],
    comboPrice: null,
  },
  {
    id: 'leadership-business',
    name: 'Leadership / Business Combo',
    description: 'Influence, leadership, and business perspectives.',
    bookTitles: [
      'THINK LIKE CEO',
      'WINNING PEOPLE WITHOUT LOSING YOURSELF',
      '48 LAWS OF POWER',
      'THE BOOK OF ELON',
    ],
    comboPrice: null,
  },
  {
    id: 'kannada-books',
    name: 'Kannada Books Combo',
    description: 'A selection of Kannada titles from the BookVision shelf.',
    bookTitles: [
      'BADUKUVA DARI',
      'Heli Hogu Kaarana',
      'AVALU',
      'MUKAJJIYA KANASUGALU',
      'VAKALAT',
    ],
    comboPrice: null,
  },
  {
    id: 'indian-history-knowledge',
    name: 'Indian History & Knowledge Combo',
    description: 'History, ideas, and knowledge rooted in India.',
    bookTitles: [
      "India's Struggle for Independence 1857-1947",
      'WINGS OF FIRE',
      'PRACHINA BHARATADA MAHARSHIGALU',
      'KRISHNANA ARASUTTA',
    ],
    comboPrice: null,
  },
];