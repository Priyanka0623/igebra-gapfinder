// Chapter and subtopic extraction and past-paper question linking from student documents
import { ChapterTopic, PastPaperQuestion, StudyChunk, StudyDocument, SubtopicItem } from "./storage";

const CHAPTER_REGEX =
  /^(?:#+\s*)?(?:(chapter|unit|module|topic|lesson)\s+(\d+|[ivx]+)\s*[:.\-–—]?\s*(.+)|(\d+)[.)]\s+([A-Z][A-Za-z0-9\s,&()\-–—]{3,75})|(#{1,2})\s+([A-Z][A-Za-z0-9\s,&()\-–—:]{3,75}))$/i;

const SUBTOPIC_REGEX =
  /^(?:#+\s*)?(?:(\d+\.\d+)\s*[:.\-–—]?\s*(.+)|[-•*]\s*(\d+\.\d+)\s+(.+)|#{3,4}\s+(.+))$/i;

const FORBIDDEN_HEADER_PATTERNS = [
  /^subjects?\s*:/i,
  /^syllabus\s*$/i,
  /^past\s+paper/i,
  /^section\s+[a-z0-9]\b/i,
  /^part\s+[a-z0-9]\b/i,
  /^time\s*:/i,
  /^max(?:imum)?\s+marks/i,
  /^instructions?\s*:/i,
  /^q(?:uestion)?\s*\d+/i,
  /^\d+\s*marks?\b/i,
  /\(\s*\d+\s*marks?\s*\)$/i,
  /\[\s*\d+\s*marks?\s*\]$/i,
  /\?$/,
];

export function isValidChapterHeading(line: string): boolean {
  const trimmed = line.replace(/^#+\s*/, "").trim();
  if (trimmed.length < 3 || trimmed.length > 95) return false;
  for (const pattern of FORBIDDEN_HEADER_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }
  return CHAPTER_REGEX.test(line.trim());
}

export function parseChapterHeading(
  line: string,
  fallbackIndex = 1
): { numberLabel: string; title: string } | null {
  const raw = line.trim();
  const cleaned = raw.replace(/^#+\s*/, "").trim();
  if (cleaned.length < 3 || cleaned.length > 95) return null;
  for (const pattern of FORBIDDEN_HEADER_PATTERNS) {
    if (pattern.test(cleaned)) return null;
  }

  const match = raw.match(CHAPTER_REGEX);
  if (!match) return null;

  if (match[1] && match[2] && match[3]) {
    const kind = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    const num = match[2];
    const rawTitle = match[3].trim();
    return {
      numberLabel: `${kind} ${num}`,
      title: `${kind} ${num}: ${rawTitle}`,
    };
  }
  if (match[4] && match[5]) {
    const num = match[4];
    const rawTitle = match[5].trim();
    return {
      numberLabel: `Chapter ${num}`,
      title: `Chapter ${num}: ${rawTitle}`,
    };
  }
  if (match[6] && match[7]) {
    const rawTitle = match[7].replace(/^(?:chapter|unit)\s*\d*\s*[:.-]?\s*/i, "").trim();
    return {
      numberLabel: `Chapter ${fallbackIndex}`,
      title: `Chapter ${fallbackIndex}: ${rawTitle}`,
    };
  }
  return null;
}

export function parseSubtopicLine(
  line: string,
  chapterNum = "1",
  nextIndex = 1
): { code: string; title: string } | null {
  const raw = line.trim();
  const cleaned = raw.replace(/^#+\s*/, "").trim();
  if (cleaned.length < 3 || cleaned.length > 105) return null;
  for (const pattern of FORBIDDEN_HEADER_PATTERNS) {
    if (pattern.test(cleaned)) return null;
  }
  const match = raw.match(SUBTOPIC_REGEX);
  if (!match) return null;
  if (match[5]) {
    const title = match[5].trim();
    if (!title || title.endsWith("?")) return null;
    return { code: `${chapterNum}.${nextIndex}`, title };
  }
  const code = (match[1] || match[3] || "").trim();
  const title = (match[2] || match[4] || "").trim();
  if (!code || !title || title.endsWith("?")) return null;
  return { code, title };
}

export function buildSubjectKnowledgeGraph(
  subjectId: string,
  documents: StudyDocument[]
): { chapters: ChapterTopic[]; chunks: StudyChunk[] } {
  const subjectDocs = documents.filter(
    (d) => d.subjectId === subjectId && d.rawText.trim().length > 0
  );
  const chapterMap = new Map<string, ChapterTopic>();
  const chunks: StudyChunk[] = [];
  const rawPaperQuestions: {
    doc: StudyDocument;
    text: string;
    marks?: number;
    explicitChapterHint?: string;
  }[] = [];

  const getOrCreateChapter = (numberLabel: string, fullTitle: string): ChapterTopic => {
    const coreName = fullTitle.includes(":")
      ? fullTitle.split(":").slice(1).join(":").trim().toLowerCase()
      : fullTitle.trim().toLowerCase();

    for (const ch of chapterMap.values()) {
      const existingCore = ch.title.includes(":")
        ? ch.title.split(":").slice(1).join(":").trim().toLowerCase()
        : ch.title.trim().toLowerCase();
      if (existingCore && coreName && existingCore === coreName) {
        return ch;
      }
    }

    const normKey = `${numberLabel}-${coreName.slice(0, 24)}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const existing = chapterMap.get(normKey);
    if (existing) return existing;

    const created: ChapterTopic = {
      id: `ch-${subjectId}-${normKey}`,
      subjectId,
      numberLabel,
      title: fullTitle,
      subtopics: [],
      pastPaperCount: 0,
      pastPaperQuestions: [],
    };
    chapterMap.set(normKey, created);
    return created;
  };

  for (const doc of subjectDocs) {
    if (doc.selectedType === "past_paper") continue;

    const lines = doc.rawText.split(/\r?\n/);
    let currentChapter: ChapterTopic | null = null;
    let currentSubtopic: SubtopicItem | null = null;
    let paragraphBuffer: string[] = [];

    const ensureDefaultChapterForDoc = (): ChapterTopic => {
      if (currentChapter) return currentChapter;
      const idx = chapterMap.size + 1;
      const cleanDocTitle =
        doc.title
          .replace(/\b(?:syllabus|notes|study|material|lecture|summary|pdf|txt|md)\b/gi, "")
          .replace(/[-_]+/g, " ")
          .replace(/\s+/g, " ")
          .trim() || doc.title;
      currentChapter = getOrCreateChapter(`Chapter ${idx}`, `Chapter ${idx}: ${cleanDocTitle}`);
      return currentChapter;
    };

    const flushChunk = (forceFlush = false) => {
      if (doc.selectedType !== "notes") {
        paragraphBuffer = [];
        return;
      }
      const text = paragraphBuffer.join(" ").replace(/\s+/g, " ").trim();
      if (!text) return;
      if (!forceFlush && text.length < 150) return;

      paragraphBuffer = [];
      const targetChapter = ensureDefaultChapterForDoc();
      const finalPassage =
        text.length >= 150
          ? text
          : `${text} (${targetChapter.title}${
              currentSubtopic ? ` — ${currentSubtopic.title}` : ""
            } reference notes from ${doc.title}, covering core definitions and principles for this chapter.)`;

      chunks.push({
        id: `chk-${doc.id}-${chunks.length + 1}`,
        docId: doc.id,
        docTitle: doc.title,
        subjectId,
        materialType: "notes",
        chapterId: targetChapter.id,
        chapterTitle: targetChapter.title,
        subtopicTitle: currentSubtopic?.title,
        headingPath: currentSubtopic
          ? [targetChapter.title, `${currentSubtopic.code} ${currentSubtopic.title}`]
          : [targetChapter.title],
        text: finalPassage,
      });
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        flushChunk(false);
        continue;
      }

      const parsedCh = parseChapterHeading(line, chapterMap.size + 1);
      if (parsedCh) {
        flushChunk(true);
        currentChapter = getOrCreateChapter(parsedCh.numberLabel, parsedCh.title);
        currentSubtopic = null;
        continue;
      }

      const chNum = currentChapter?.numberLabel.replace(/\D+/g, "") || String(chapterMap.size || 1);
      const parsedSub = parseSubtopicLine(
        line,
        chNum,
        (currentChapter?.subtopics.length || 0) + 1
      );
      if (parsedSub) {
        flushChunk(true);
        const targetChapter = ensureDefaultChapterForDoc();
        const exists = targetChapter.subtopics.find(
          (s) => s.code === parsedSub.code || s.title.toLowerCase() === parsedSub.title.toLowerCase()
        );
        if (!exists) {
          const sub: SubtopicItem = {
            id: `sub-${targetChapter.id}-${parsedSub.code}`,
            code: parsedSub.code,
            title: parsedSub.title,
          };
          targetChapter.subtopics.push(sub);
          currentSubtopic = sub;
        } else {
          currentSubtopic = exists;
        }
        continue;
      }

      if (doc.selectedType === "syllabus") {
        const bulletClean = line.replace(/^[-•*]\s*/, "").trim();
        if (
          bulletClean.length >= 3 &&
          bulletClean.length <= 85 &&
          !FORBIDDEN_HEADER_PATTERNS.some((p) => p.test(bulletClean))
        ) {
          const targetChapter = ensureDefaultChapterForDoc();
          const subIndex = targetChapter.subtopics.length + 1;
          const num = targetChapter.numberLabel.replace(/\D+/g, "") || "1";
          const code = `${num}.${subIndex}`;
          const exists = targetChapter.subtopics.some(
            (s) => s.title.toLowerCase() === bulletClean.toLowerCase()
          );
          if (!exists) {
            targetChapter.subtopics.push({
              id: `sub-${targetChapter.id}-${code}`,
              code,
              title: bulletClean,
            });
          }
        }
      } else if (doc.selectedType === "notes") {
        paragraphBuffer.push(line);
        if (paragraphBuffer.join(" ").length >= 380) {
          flushChunk(true);
        }
      }
    }
    flushChunk(true);
  }

  for (const doc of subjectDocs.filter((d) => d.selectedType === "past_paper")) {
    const lines = doc.rawText.split(/\r?\n/);
    let currentHint: string | undefined;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (/^section\s+[a-z0-9]/i.test(line)) continue;

      const chHint = parseChapterHeading(line, chapterMap.size + 1);
      if (chHint) {
        currentHint = chHint.title;
        continue;
      }

      const qMatch = line.match(/^(?:Q(?:uestion)?\s*\d+[\s.):-]+|\d+[.)]\s+|[-•*]\s+)(.+)/i);
      const candidateText = qMatch ? qMatch[1].trim() : line.endsWith("?") ? line : "";
      if (candidateText.length >= 10) {
        const marksMatch = candidateText.match(/\[(\d+)\s*marks?\]|\((\d+)\s*marks?\)/i);
        const marks = marksMatch ? Number(marksMatch[1] || marksMatch[2]) : undefined;
        const cleanBody = candidateText
          .replace(/\s*(?:\[\d+\s*marks?\]|\(\d+\s*marks?\))\s*$/i, "")
          .trim();
        if (cleanBody.length >= 10) {
          rawPaperQuestions.push({
            doc,
            text: cleanBody,
            marks,
            explicitChapterHint: currentHint,
          });
        }
      }
    }
  }

  const chapters = Array.from(chapterMap.values());
  if (chapters.length > 0) {
    for (const item of rawPaperQuestions) {
      let bestChapter = chapters[0];
      let bestScore = -1;

      for (const ch of chapters) {
        let score = 0;
        if (
          item.explicitChapterHint &&
          ch.title.toLowerCase().includes(item.explicitChapterHint.toLowerCase())
        ) {
          score += 20;
        }
        const chapterWords = [
          ch.title,
          ...ch.subtopics.map((s) => s.title),
          ...chunks.filter((c) => c.chapterId === ch.id).map((c) => c.text),
        ]
          .join(" ")
          .toLowerCase();

        const qTokens = item.text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 3);

        for (const qt of qTokens) {
          if (ch.title.toLowerCase().includes(qt)) score += 5;
          if (ch.subtopics.some((s) => s.title.toLowerCase().includes(qt))) score += 4;
          if (chapterWords.includes(qt)) score += 1;
        }

        if (score > bestScore) {
          bestScore = score;
          bestChapter = ch;
        }
      }

      const ppq: PastPaperQuestion = {
        id: `ppq-${item.doc.id}-${bestChapter.pastPaperQuestions.length + 1}`,
        docId: item.doc.id,
        docTitle: item.doc.title,
        subjectId,
        chapterId: bestChapter.id,
        text: item.text,
        marks: item.marks,
      };
      bestChapter.pastPaperQuestions.push(ppq);
      bestChapter.pastPaperCount = bestChapter.pastPaperQuestions.length;
    }
  }

  return { chapters, chunks };
}
