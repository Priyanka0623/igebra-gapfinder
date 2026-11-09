// Diagnostic quiz generator with 80/20 MCQ-to-blank ratio from Notes passages >= 150 chars
import { DifficultyLevel, QuizQuestion, StudyChunk } from "./storage";

export interface QuizMixCounts {
  total: number;
  mcqCount: number;
  blankCount: number;
  trueFalseCount: number;
  shortAnswerCount: number;
}

export function computeQuizMix(
  requestedTotal: number,
  includeTrueFalse = false,
  includeShortAnswer = false
): QuizMixCounts {
  const total = Math.max(5, requestedTotal);
  const blankTarget = Math.max(1, Math.round(0.2 * total));
  let extraCount = 0;
  let trueFalseCount = 0;
  let shortAnswerCount = 0;

  if (includeTrueFalse && total >= 10) {
    trueFalseCount = 1;
    extraCount += 1;
  }
  if (includeShortAnswer && total >= 10 && extraCount + blankTarget <= Math.floor(0.2 * total)) {
    shortAnswerCount = 1;
    extraCount += 1;
  }

  const adjustedBlank = Math.max(1, blankTarget - extraCount);
  const mcqCount = total - adjustedBlank - trueFalseCount - shortAnswerCount;

  return {
    total,
    mcqCount,
    blankCount: adjustedBlank,
    trueFalseCount,
    shortAnswerCount,
  };
}

export interface ExtractedFact {
  chunk: StudyChunk;
  term: string;
  definition: string;
  sentence: string;
  factHash: string;
}

export function extractFactsFromNotesChunks(chunks: StudyChunk[]): ExtractedFact[] {
  const validChunks = chunks.filter(
    (c) => c.materialType === "notes" && c.text.trim().length >= 150
  );
  if (validChunks.length === 0) return [];

  const facts: ExtractedFact[] = [];
  const seenHashes = new Set<string>();

  for (const chunk of validChunks) {
    const rawSentences = chunk.text
      .split(/(?<=[.!?])\s+|\r?\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 30 && !s.endsWith("?"));

    const sentences = rawSentences.length > 0 ? rawSentences : [chunk.text.trim()];

    for (const sentence of sentences) {
      const cleanSentence = sentence.endsWith(".") ? sentence : `${sentence}.`;

      const defMatch = cleanSentence.match(
        /^([A-Z][A-Za-z0-9\s()-]{2,45}?)\s+(?:is defined as|is|are|refers to|means|represents|measures|consists of|produces|occurs when|covers|involves|contains|regulates)\s+(.{15,240})\.$/i
      );
      if (defMatch) {
        const term = defMatch[1].replace(/^(?:The|A|An)\s+/i, "").trim();
        const definition = defMatch[2].trim();
        const factHash = `${chunk.chapterId}:${term.toLowerCase()}:${definition.slice(0, 35).toLowerCase()}`;
        if (term.length >= 2 && !seenHashes.has(factHash)) {
          seenHashes.add(factHash);
          facts.push({ chunk, term, definition, sentence: cleanSentence, factHash });
          continue;
        }
      }

      const words = cleanSentence
        .replace(/[^A-Za-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter(
          (w) =>
            w.length >= 4 &&
            !/^(which|their|there|where|while|these|those|about|under|after|before|chapter|section|topic)$/i.test(w)
        );

      if (words.length >= 2) {
        const term = words[Math.floor(words.length / 2)];
        const definition = cleanSentence
          .replace(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), "this concept")
          .replace(/\.$/, "");
        const factHash = `${chunk.chapterId}:${cleanSentence.slice(0, 50).toLowerCase()}`;
        if (!seenHashes.has(factHash)) {
          seenHashes.add(factHash);
          facts.push({ chunk, term, definition, sentence: cleanSentence, factHash });
        }
      }
    }
  }

  return facts;
}

export function generateLocalQuiz(params: {
  subjectId: string;
  chapterIds: string[];
  requestedSize: number;
  difficulty: DifficultyLevel;
  includeTrueFalse?: boolean;
  includeShortAnswer?: boolean;
  allSubjectChunks: StudyChunk[];
  usedFactHashes?: string[];
}): { questions: QuizQuestion[]; reducedNotice?: string } {
  const {
    subjectId,
    chapterIds,
    requestedSize,
    difficulty,
    includeTrueFalse = false,
    includeShortAnswer = false,
    allSubjectChunks,
    usedFactHashes = [],
  } = params;

  const chapterChunks = allSubjectChunks.filter(
    (c) => chapterIds.includes(c.chapterId) && c.materialType === "notes" && c.text.trim().length >= 150
  );
  const allFacts = extractFactsFromNotesChunks(chapterChunks);
  const subjectFacts = extractFactsFromNotesChunks(allSubjectChunks);

  if (allFacts.length === 0) {
    return {
      questions: [],
      reducedNotice: "No Notes passages of at least 150 characters were found in the selected chapters.",
    };
  }

  const usedSet = new Set(usedFactHashes);
  const prioritizedFacts = [
    ...allFacts.filter((f) => !usedSet.has(f.factHash)),
    ...allFacts.filter((f) => usedSet.has(f.factHash)),
  ];

  // Expand unique angle variations per fact when a larger quiz size is requested
  const questionTemplates = [
    (term: string, chTitle: string) =>
      `According to your notes on ${chTitle}, which statement accurately describes ${term}?`,
    (term: string, chTitle: string) =>
      `In ${chTitle}, what is the primary definition or function of ${term}?`,
    (term: string, chTitle: string) =>
      `Which of the following is NOT false regarding ${term} in ${chTitle}?`,
  ];

  const maxPossibleUnique = prioritizedFacts.length * questionTemplates.length;
  let effectiveSize = Math.max(5, requestedSize);
  let reducedNotice: string | undefined;

  if (effectiveSize > maxPossibleUnique && maxPossibleUnique >= 5) {
    effectiveSize = maxPossibleUnique;
    reducedNotice = `Quiz size reduced from ${requestedSize} to ${effectiveSize} based on the number of unique facts available in your notes.`;
  }

  const mix = computeQuizMix(effectiveSize, includeTrueFalse, includeShortAnswer);
  const questions: QuizQuestion[] = [];

  for (let i = 0; i < effectiveSize; i++) {
    const fact = prioritizedFacts[i % prioritizedFacts.length];
    const diff: "Easy" | "Medium" | "Hard" =
      difficulty === "Mixed"
        ? (["Easy", "Medium", "Hard"][i % 3] as "Easy" | "Medium" | "Hard")
        : difficulty;

    const isMcqSlot = i < mix.mcqCount;

    if (isMcqSlot) {
      const sameChapterDistractors = allFacts
        .filter((f) => f.chunk.chapterId === fact.chunk.chapterId && f.definition !== fact.definition)
        .map((f) => f.definition);
      const otherChapterDistractors = subjectFacts
        .filter((f) => f.chunk.chapterId !== fact.chunk.chapterId && f.definition !== fact.definition)
        .map((f) => f.definition);

      const candidatePool = [...sameChapterDistractors, ...otherChapterDistractors];
      const distractors: string[] = [];
      for (const cand of candidatePool) {
        if (
          distractors.length < 3 &&
          cand.toLowerCase() !== fact.definition.toLowerCase() &&
          !distractors.some((d) => d.toLowerCase() === cand.toLowerCase())
        ) {
          distractors.push(cand);
        }
      }

      const fallbackTemplates = [
        `a process unrelated to ${fact.term.toLowerCase()} in ${fact.chunk.chapterTitle}`,
        `an inverse property that decreases ${fact.term.toLowerCase()} under constant conditions`,
        `a secondary structure that does not directly regulate ${fact.term.toLowerCase()}`,
      ];
      for (const fb of fallbackTemplates) {
        if (distractors.length < 3) distractors.push(fb);
      }

      const rawOptions = [fact.definition, ...distractors.slice(0, 3)];
      const correctPos = i % 4;
      const orderedOptions = [...rawOptions];
      const temp = orderedOptions[correctPos];
      orderedOptions[correctPos] = orderedOptions[0];
      orderedOptions[0] = temp;

      const promptFn =
        questionTemplates[Math.floor(i / prioritizedFacts.length) % questionTemplates.length];

      questions.push({
        id: `q-${Date.now()}-${i + 1}`,
        subjectId,
        chapterId: fact.chunk.chapterId,
        chapterTitle: fact.chunk.chapterTitle,
        type: "mcq",
        difficulty: diff,
        prompt: promptFn(fact.term, fact.chunk.chapterTitle),
        options: orderedOptions,
        correctOptionIndex: correctPos,
        correctAnswerText: fact.definition,
        explanation: `From your notes: "${fact.sentence}"`,
        citation: {
          docId: fact.chunk.docId,
          docTitle: fact.chunk.docTitle,
          chapterId: fact.chunk.chapterId,
          chapterTitle: fact.chunk.chapterTitle,
          section: fact.chunk.subtopicTitle || fact.chunk.chapterTitle,
          snippet: fact.sentence,
        },
        factHash: fact.factHash,
      });
    } else {
      const blankedSentence = fact.sentence.replace(
        new RegExp(`\\b${fact.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
        "________"
      );
      const promptText = blankedSentence.includes("________")
        ? `Fill in the blank from your notes: "${blankedSentence}"`
        : `Fill in the key term described in your notes: "________ is ${fact.definition}."`;

      questions.push({
        id: `q-${Date.now()}-${i + 1}`,
        subjectId,
        chapterId: fact.chunk.chapterId,
        chapterTitle: fact.chunk.chapterTitle,
        type: "fill_blank",
        difficulty: diff,
        prompt: promptText,
        correctAnswerText: fact.term,
        acceptableAnswers: [
          fact.term.toLowerCase(),
          `${fact.term.toLowerCase()}s`,
          fact.term.toLowerCase().replace(/s$/, ""),
        ],
        explanation: `The missing key term is "${fact.term}". Full note sentence: "${fact.sentence}"`,
        citation: {
          docId: fact.chunk.docId,
          docTitle: fact.chunk.docTitle,
          chapterId: fact.chunk.chapterId,
          chapterTitle: fact.chunk.chapterTitle,
          section: fact.chunk.subtopicTitle || fact.chunk.chapterTitle,
          snippet: fact.sentence,
        },
        factHash: fact.factHash,
      });
    }
  }

  return { questions, reducedNotice };
}
