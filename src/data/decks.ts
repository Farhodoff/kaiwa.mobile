import minna1 from './decks/minna_shokyu1.json';
import minna2 from './decks/minna_shokyu2.json';
import n5Master from './decks/jlpt_n5.json';
import n3Vocab from './decks/n3_thematic_vocab.json';

export interface MobileCard {
  id: string;
  front: string;
  frontJa?: string;
  back: string;
  reading?: string;
  example?: string;
  category?: string;
  level: string;
}

export interface MobileDeck {
  id: string;
  title: string;
  description: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  icon: string;
  badgeColor: string;
  cardCount: number;
  cards: MobileCard[];
}

function mapRawCards(rawList: any[], level: string, prefix: string): MobileCard[] {
  const seen = new Set<string>();
  const list: MobileCard[] = [];

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    const front = (item.front || '').trim();
    if (!front || seen.has(front.toLowerCase())) continue;
    seen.add(front.toLowerCase());

    list.push({
      id: `${prefix}_${i + 1}`,
      front,
      frontJa: item.phonetic ? item.phonetic.split(' - ')[0] : front,
      back: item.back || '',
      reading: item.phonetic || item.reading || '',
      example: item.example || '',
      category: item.category || level,
      level,
    });
  }

  return list;
}

export const REAL_DECKS: MobileDeck[] = [
  {
    id: 'deck_minna1',
    title: 'Minna no Nihongo Shokyu 1',
    description: '1–25 darslar toʻliq lugʻati (1,078 ta soʻz va ibora)',
    level: 'N5',
    icon: 'book',
    badgeColor: '#10B981',
    cardCount: minna1.length,
    cards: mapRawCards(minna1, 'N5', 'm1'),
  },
  {
    id: 'deck_n5_master',
    title: 'JLPT N5 Master Deck',
    description: '218 ta tayanch kanji va soʻzlar',
    level: 'N5',
    icon: 'ribbon',
    badgeColor: '#6C5CE7',
    cardCount: n5Master.length,
    cards: mapRawCards(n5Master, 'N5', 'n5m'),
  },
  {
    id: 'deck_minna2',
    title: 'Minna no Nihongo Shokyu 2',
    description: '26–50 darslar toʻliq lugʻati (427 ta soʻz va ibora)',
    level: 'N4',
    icon: 'book',
    badgeColor: '#0EA5E9',
    cardCount: minna2.length,
    cards: mapRawCards(minna2, 'N4', 'm2'),
  },
  {
    id: 'deck_n3_thematic',
    title: 'JLPT N3 Tematik Leksika',
    description: '672 ta N3 soʻzlar master toʻplami',
    level: 'N3',
    icon: 'albums',
    badgeColor: '#F59E0B',
    cardCount: n3Vocab.length,
    cards: mapRawCards(n3Vocab, 'N3', 'n3t'),
  },
];
