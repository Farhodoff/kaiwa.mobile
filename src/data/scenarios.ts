import rawScenarios from './all_scenarios.json';

export interface MobileScenario {
  id: string;
  language?: string;
  title_ja: string;
  title_uz: string;
  emoji: string;
  difficulty: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  category: 'daily' | 'business' | 'travel' | 'social' | 'academic';
  description_uz: string;
  opening_line_ja: string;
  opening_line_uz: string;
  context_prompt: string;
  key_phrases: string[];
}

export const REAL_SCENARIOS: MobileScenario[] = rawScenarios as MobileScenario[];
