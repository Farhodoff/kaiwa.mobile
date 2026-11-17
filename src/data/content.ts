/** Mock content mirroring the kaiwa.live web app (JLPT N5–N1, Minna no Nihongo). */

export type Lesson = {
  id: string;
  title: string;
  titleJa: string;
  level: string;
  minutes: number;
  xp: number;
  status: 'done' | 'current' | 'locked';
  progress: number; // 0..1
};

export type Flashcard = {
  id: string;
  front: string;
  frontJa?: string;
  back: string;
  reading?: string;
  example?: string;
};

export type QuizQuestion = {
  id: string;
  question: string;
  questionJa?: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export type JlptSection = {
  id: string;
  title: string;
  titleJa: string;
  count: number;
  done: number;
  color: string;
};

export const LEVELS = [
  { id: 'N5', label: 'N5', desc: 'Boshlang\'ich', words: 800 },
  { id: 'N4', label: 'N4', desc: 'Elementar', words: 1500 },
  { id: 'N3', label: 'N3', desc: 'O\'rta', words: 3700 },
  { id: 'N2', label: 'N2', desc: 'Yuqori o\'rta', words: 6000 },
  { id: 'N1', label: 'N1', desc: 'Ilg\'or', words: 10000 },
] as const;

export const LESSONS: Lesson[] = [
  {
    id: 'l12',
    title: 'At the café',
    titleJa: 'カフェで',
    level: 'N3',
    minutes: 12,
    xp: 40,
    status: 'current',
    progress: 0.68,
  },
  {
    id: 'l11',
    title: 'Daily routine',
    titleJa: '毎日の生活',
    level: 'N3',
    minutes: 10,
    xp: 35,
    status: 'done',
    progress: 1,
  },
  {
    id: 'l10',
    title: 'Making plans',
    titleJa: '予定を立てる',
    level: 'N3',
    minutes: 14,
    xp: 45,
    status: 'done',
    progress: 1,
  },
  {
    id: 'l9',
    title: 'At the station',
    titleJa: '駅で',
    level: 'N4',
    minutes: 9,
    xp: 30,
    status: 'locked',
    progress: 0,
  },
  {
    id: 'l8',
    title: 'Shopping for gifts',
    titleJa: 'プレゼントを買う',
    level: 'N4',
    minutes: 11,
    xp: 35,
    status: 'locked',
    progress: 0,
  },
];

export const FLASHCARDS: Flashcard[] = [
  {
    id: 'f1',
    front: '待つ',
    frontJa: 'まつ',
    back: 'to wait',
    reading: 'まつ (matsu)',
    example: 'バスを待ちます。 — I wait for the bus.',
  },
  {
    id: 'f2',
    front: '経験',
    frontJa: 'けいけん',
    back: 'experience',
    reading: 'けいけん (keiken)',
    example: '良い経験でした。 — It was a good experience.',
  },
  {
    id: 'f3',
    front: '続ける',
    frontJa: 'つづける',
    back: 'to continue',
    reading: 'つづける (tsuzukeru)',
    example: '日本語を勉強し続けます。 — I keep studying Japanese.',
  },
  {
    id: 'f4',
    front: '気持ち',
    frontJa: 'きもち',
    back: 'feeling / mood',
    reading: 'きもち (kimochi)',
    example: '気持ちは分かります。— I understand your feelings.',
  },
  {
    id: 'f5',
    front: '間に合う',
    frontJa: 'まにあう',
    back: 'to be in time',
    reading: 'まにあう (maniau)',
    example: '電車に間に合いました。— I made it to the train on time.',
  },
  {
    id: 'f6',
    front: '予約',
    frontJa: 'よやく',
    back: 'reservation',
    reading: 'よやく (yoyaku)',
    example: 'テーブルを予約しました。— I reserved a table.',
  },
];

export const LESSON_QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    question: '「コーヒーを___。」 — Fill in the blank: "I drank coffee."',
    options: ['飲みます', '飲みました', '食べました', '行きました'],
    correctIndex: 1,
    explanation: '飲みます = drink (polite). Past polite = 飲みました.',
  },
  {
    id: 'q2',
    question: 'What does 「もう少し」 mean?',
    options: ['a little more', 'very much', 'not at all', 'right away'],
    correctIndex: 0,
    explanation: 'もう少し = "a little more / a bit longer".',
  },
  {
    id: 'q3',
    question: 'Choose the polite request: "Please wait a moment."',
    options: ['待ってください', '待ちました', '待っています', '待たないで'],
    correctIndex: 0,
    explanation: '〜てください = please do ~.',
  },
  {
    id: 'q4',
    question: '「この料理は___です。」 — "This dish is delicious."',
    options: ['忙しい', 'おいしい', '安い', '近い'],
    correctIndex: 1,
    explanation: 'おいしい = delicious/tasty.',
  },
  {
    id: 'q5',
    question: 'What is the kanji for "station"?',
    options: ['駅', '店', ' school', '町'],
    correctIndex: 0,
    explanation: '駅 (えき / eki) = station.',
  },
];

export const MOCK_TEST: QuizQuestion[] = [
  {
    id: 'm1',
    question: 'Read: 「来週、京都へ___。」 — "Next week I will go to Kyoto."',
    options: ['行きます', '行きました', '行って', '行く'],
    correctIndex: 0,
    explanation: 'Future polite form: 行きます.',
  },
  {
    id: 'm2',
    question: 'Which word means "because" (casual)?',
    options: ['から', 'けど', 'ので', 'しか'],
    correctIndex: 2,
    explanation: 'ので = because (neutral/polite). から = because (casual).',
  },
  {
    id: 'm3',
    question: '「___本ですか。」 — "Whose book is it?"',
    options: ['何', '誰', 'どの', '誰の'],
    correctIndex: 3,
    explanation: '誰の = whose.',
  },
  {
    id: 'm4',
    question: 'Choose the correct counter for flat things (paper, tickets):',
    options: ['〜つ', '〜枚', '〜本', '〜回'],
    correctIndex: 1,
    explanation: '枚 (まい) counts flat objects.',
  },
  {
    id: 'm5',
    question: 'What is the te-form of 書く (to write)?',
    options: ['書いて', '書きって', '書きて', '書きして'],
    correctIndex: 0,
    explanation: '書く → 書いて (kaku → kaite).',
  },
];

export const JLPT_SECTIONS: JlptSection[] = [
  { id: 'vocab', title: 'Vocabulary', titleJa: '語彙', count: 35, done: 24, color: '#6C5CE7' },
  { id: 'grammar', title: 'Grammar', titleJa: '文法', count: 30, done: 18, color: '#38BDF8' },
  { id: 'reading', title: 'Reading', titleJa: '読解', count: 20, done: 9, color: '#F59E0B' },
  { id: 'listening', title: 'Listening', titleJa: '聴解', count: 25, done: 11, color: '#22C55E' },
];

export const CONVERSATION_TOPICS = [
  { id: 'cafe', title: 'At the café', titleJa: 'カフェで', level: 'N3', icon: 'cafe' },
  { id: 'shopping', title: 'Shopping', titleJa: '買い物', level: 'N4', icon: 'cart' },
  { id: 'travel', title: 'Travel plans', titleJa: '旅行の計画', level: 'N3', icon: 'airplane' },
  { id: 'work', title: 'At work', titleJa: '仕事で', level: 'N2', icon: 'briefcase' },
] as const;

/** Simple scripted AI replies used by the conversation demo. */
export const AI_REPLIES = [
  { ja: 'いらっしゃいませ！今日は何にしますか？', uz: 'Xush kelibsiz! Bugun nima olmoqchisiz?' },
  { ja: 'かしこまりました。少々お待ちください。', uz: 'Tushunarli. Iltimos, biroz kuting.' },
  { ja: '他にご注文はありますか？', uz: "Boshqa buyurtmangiz bormi?" },
  { ja: 'ありがとうございます！またどうぞ。', uz: 'Rahmat! Yana keling.' },
];

export const USER = {
  name: 'Aziz',
  greeting: 'Xayrli tong',
  xp: 120,
  xpGoal: 200,
  streak: 12,
  level: 'N3',
  levelProgress: 0.68,
  words: 428,
};
