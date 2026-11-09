// Grounded Explain-this-topic assistant that answers strictly from retrieved chunks
import { retrieveBM25 } from "./retrieval";
import { Citation, StudyChunk } from "./storage";

export interface GroundedExplanation {
  answer: string;
  citations: Citation[];
  foundInMaterial: boolean;
}

export function answerFromMaterialLocally(
  query: string,
  chunks: StudyChunk[],
  chapterFilterId?: string
): GroundedExplanation {
  const scopedChunks = chapterFilterId
    ? chunks.filter((c) => c.chapterId === chapterFilterId)
    : chunks;

  const hits = retrieveBM25(query, scopedChunks, 3);
  if (hits.length === 0) {
    return {
      answer: "I couldn't find this in your material. Try uploading notes covering this topic or selecting another chapter.",
      citations: [],
      foundInMaterial: false,
    };
  }

  const citations: Citation[] = hits.map(({ chunk }) => ({
    docId: chunk.docId,
    docTitle: chunk.docTitle,
    chapterId: chunk.chapterId,
    chapterTitle: chunk.chapterTitle,
    section: chunk.subtopicTitle || chunk.chapterTitle,
    snippet: chunk.text.slice(0, 220),
  }));

  const synthesized = hits
    .map(({ chunk }, idx) => `(${idx + 1}) From ${chunk.chapterTitle}${chunk.subtopicTitle ? ` — ${chunk.subtopicTitle}` : ""}:\n${chunk.text}`)
    .join("\n\n");

  return {
    answer: synthesized,
    citations,
    foundInMaterial: true,
  };
}
