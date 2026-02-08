import type { Difficulty, Importance } from '../../types';

export interface GeneratedCard {
  title: string;
  notes: string;
  difficulty: Difficulty;
  importance: Importance;
  checklist: string[];
  tags: string[];
  subjectName?: string;
  unitName?: string;
}

export function tryParseCards(text: string): GeneratedCard[] | null {
  try {
    // Try to extract JSON from the response (may be wrapped in markdown code blocks)
    let jsonStr = text;

    // Strip markdown code blocks if present
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    jsonStr = jsonStr.trim();

    // Must start with [ for an array
    if (!jsonStr.startsWith('[')) return null;

    const parsed = JSON.parse(jsonStr) as unknown[];

    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    // Validate and normalize each card
    return parsed.map((item) => {
      const raw = item as Record<string, unknown>;
      return {
        title: String(raw.title ?? ''),
        notes: String(raw.notes ?? ''),
        difficulty: (['high', 'medium', 'low'].includes(raw.difficulty as string)
          ? raw.difficulty as Difficulty : 'medium'),
        importance: (['high', 'medium', 'low'].includes(raw.importance as string)
          ? raw.importance as Importance : 'medium'),
        checklist: Array.isArray(raw.checklist)
          ? (raw.checklist as unknown[]).map(String)
          : [],
        tags: Array.isArray(raw.tags)
          ? (raw.tags as unknown[]).map(String)
          : [],
        subjectName: raw.subjectName ? String(raw.subjectName) : undefined,
        unitName: raw.unitName ? String(raw.unitName) : undefined,
      };
    }).filter((card) => card.title.length > 0);
  } catch {
    return null;
  }
}
