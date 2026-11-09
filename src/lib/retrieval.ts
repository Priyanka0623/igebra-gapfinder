// Local BM25 retrieval engine over the student's uploaded study chunks
import { StudyChunk } from "./storage";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "when",
  "at", "by", "for", "with", "about", "against", "between", "into",
  "through", "during", "before", "after", "above", "below", "to", "from",
  "up", "down", "in", "out", "on", "off", "over", "under", "again",
  "further", "once", "here", "there", "where", "why", "how", "all", "any",
  "both", "each", "few", "more", "most", "other", "some", "such", "no",
  "nor", "not", "only", "own", "same", "so", "than", "too", "very", "can",
  "will", "just", "should", "now", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "what", "which", "who",
  "explain", "tell", "me", "chapter", "topic", "unit", "section"
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

export interface ScoredChunk {
  chunk: StudyChunk;
  score: number;
}

export function retrieveBM25(
  query: string,
  chunks: StudyChunk[],
  topK = 5,
  k1 = 1.5,
  b = 0.75
): ScoredChunk[] {
  if (chunks.length === 0) return [];
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return chunks.slice(0, topK).map((chunk) => ({ chunk, score: 0.1 }));
  }

  const docTokensList = chunks.map((chunk) =>
    tokenize(`${chunk.chapterTitle} ${chunk.subtopicTitle || ""} ${chunk.text}`)
  );

  const totalDocs = chunks.length;
  const avgDocLen =
    docTokensList.reduce((acc, tokens) => acc + tokens.length, 0) / Math.max(1, totalDocs);

  const docFreq: Record<string, number> = {};
  for (const qToken of new Set(queryTokens)) {
    let df = 0;
    for (const docTokens of docTokensList) {
      if (docTokens.includes(qToken)) df += 1;
    }
    docFreq[qToken] = df;
  }

  const scored: ScoredChunk[] = chunks.map((chunk, idx) => {
    const tokens = docTokensList[idx];
    const docLen = tokens.length || 1;
    const termCounts: Record<string, number> = {};
    for (const t of tokens) {
      termCounts[t] = (termCounts[t] || 0) + 1;
    }

    let score = 0;
    for (const qToken of queryTokens) {
      const tf = termCounts[qToken] || 0;
      if (tf === 0) continue;
      const df = docFreq[qToken] || 0;
      const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLen / avgDocLen));
      score += idf * (numerator / denominator);
    }

    return { chunk, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, bItem) => bItem.score - a.score)
    .slice(0, topK);
}
