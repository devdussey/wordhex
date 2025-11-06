import { supabase } from './supabaseClient';

const WORDS_TABLE = 'word_bank';
const PAGE_SIZE = 1000;

let cachedWordSetPromise: Promise<Set<string>> | null = null;

async function fetchAllWords(): Promise<Set<string>> {
  const allWords = new Set<string>();
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(WORDS_TABLE)
      .select('word')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load words from Supabase: ${error.message}`);
    }

    const rows = (data ?? []) as Array<{ word: string | null }>;
    if (rows.length === 0) {
      break;
    }

    for (const record of rows) {
      if (record?.word) {
        allWords.add(record.word.toLowerCase());
      }
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  if (allWords.size === 0) {
    throw new Error('Word bank table returned no words');
  }

  return allWords;
}

export async function getWordSet(): Promise<Set<string>> {
  if (!cachedWordSetPromise) {
    cachedWordSetPromise = fetchAllWords().catch((error) => {
      cachedWordSetPromise = null;
      throw error;
    });
  }

  return cachedWordSetPromise;
}

export function clearWordCache(): void {
  cachedWordSetPromise = null;
}
