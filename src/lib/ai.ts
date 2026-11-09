// Client helper for optional server-side AI endpoints (/api/*) with timeout and automatic local fallback
import { DifficultyLevel, QuizQuestion, StudyChunk } from "./storage";

export interface HealthStatus {
  aiMode: boolean;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 12000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkApiHealth(): Promise<HealthStatus> {
  try {
    const res = await fetchWithTimeout("/api/health", {}, 4000);
    if (!res.ok) return { aiMode: false };
    const data = (await res.json()) as Partial<HealthStatus>;
    return {
      aiMode: Boolean(data.aiMode),
    };
  } catch {
    return { aiMode: false };
  }
}

export async function requestAiQuizQuestions(params: {
  subjectId: string;
  chunks: StudyChunk[];
  mcqCount: number;
  blankCount: number;
  difficulty: DifficultyLevel;
}): Promise<QuizQuestion[] | null> {
  try {
    const res = await fetchWithTimeout(
      "/api/quiz",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chunks: params.chunks.slice(0, 12),
          mcqCount: params.mcqCount,
          blankCount: params.blankCount,
          difficulty: params.difficulty,
        }),
      },
      15000
    );

    if (!res.ok) return null;
    const data = (await res.json()) as {
      fallback?: boolean;
      questions?: {
        type: "mcq" | "fill_blank";
        difficulty: "Easy" | "Medium" | "Hard";
        prompt: string;
        options?: string[];
        correctOptionIndex?: number;
        correctAnswerText: string;
        explanation: string;
        chunkId: string;
      }[];
    };

    if (data.fallback || !Array.isArray(data.questions) || data.questions.length === 0) {
      return null;
    }

    const chunkMap = new Map(params.chunks.map((c) => [c.id, c]));
    return data.questions.map((q, idx) => {
      const source = chunkMap.get(q.chunkId) || params.chunks[0];
      return {
        id: `ai-q-${Date.now()}-${idx + 1}`,
        subjectId: params.subjectId,
        chapterId: source.chapterId,
        chapterTitle: source.chapterTitle,
        type: q.type,
        difficulty: q.difficulty,
        prompt: q.prompt,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        correctAnswerText: q.correctAnswerText,
        acceptableAnswers: [q.correctAnswerText.toLowerCase()],
        explanation: q.explanation,
        citation: {
          docId: source.docId,
          docTitle: source.docTitle,
          chapterId: source.chapterId,
          chapterTitle: source.chapterTitle,
          section: source.subtopicTitle || source.chapterTitle,
          snippet: source.text.slice(0, 200),
        },
        factHash: `ai:${source.chapterId}:${q.prompt.slice(0, 40).toLowerCase()}`,
      };
    });
  } catch {
    return null;
  }
}

export async function requestAiExplanation(
  query: string,
  chunks: StudyChunk[]
): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      "/api/assist",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          chunks: chunks.slice(0, 5),
        }),
      },
      12000
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { fallback?: boolean; answer?: string };
    if (data.fallback || typeof data.answer !== "string" || !data.answer.trim()) {
      return null;
    }
    return data.answer.trim();
  } catch {
    return null;
  }
}
