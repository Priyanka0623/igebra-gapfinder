// Server-side Groq question generator using openai/gpt-oss-120b with schema validation, caching, retry, and fallback
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import type { ApiRequest, ApiResponse } from "./health";

const QuestionSchema = z.object({
  questions: z.array(
    z.object({
      type: z.enum(["mcq", "fill_blank"]),
      difficulty: z.enum(["Easy", "Medium", "Hard"]),
      prompt: z.string().min(10),
      options: z.array(z.string()).optional(),
      correctOptionIndex: z.number().int().min(0).max(3).optional(),
      correctAnswerText: z.string().min(1),
      explanation: z.string().min(5),
      chunkId: z.string().min(1),
    })
  ),
});

interface IncomingChunk {
  id: string;
  docId: string;
  docTitle: string;
  chapterId: string;
  chapterTitle: string;
  subtopicTitle?: string;
  text: string;
}

const quizCache = new Map<string, unknown>();

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ fallback: true, reason: "Method not allowed" });
    return;
  }

  const apiKey = process.env?.GROQ_API_KEY?.trim();
  if (!apiKey) {
    res.status(200).json({ fallback: true, reason: "Missing GROQ_API_KEY" });
    return;
  }

  try {
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as {
      chunks?: IncomingChunk[];
      mcqCount?: number;
      blankCount?: number;
      difficulty?: string;
    };

    const chunks = (body?.chunks || []).slice(0, 12);
    const mcqCount = Math.max(1, Number(body?.mcqCount || 8));
    const blankCount = Math.max(1, Number(body?.blankCount || 2));
    const difficulty = body?.difficulty || "Mixed";

    if (chunks.length === 0) {
      res.status(200).json({ fallback: true, reason: "No chunks provided" });
      return;
    }

    const cacheKey = `${chunks.map((c) => c.id).join(",")}:${mcqCount}:${blankCount}:${difficulty}`;
    if (quizCache.has(cacheKey)) {
      res.status(200).json({ fallback: false, questions: quizCache.get(cacheKey) });
      return;
    }

    const modelId = process.env?.GROQ_MODEL_QUIZ?.trim() || "openai/gpt-oss-120b";
    const groq = createGroq({ apiKey });

    const compactContext = chunks
      .map(
        (c) =>
          `[ChunkID: ${c.id} | Chapter: ${c.chapterTitle} | Subtopic: ${c.subtopicTitle || c.chapterTitle}]\n${c.text.slice(0, 650)}`
      )
      .join("\n\n");

    const result = await withRetry(() =>
      generateObject({
        model: groq(modelId),
        schema: QuestionSchema,
        providerOptions: {
          groq: { reasoningEffort: "low" },
        },
        prompt: `You are a strict diagnostic quiz generator. Generate ${mcqCount} multiple-choice questions ("mcq") and ${blankCount} fill-in-the-blank questions ("fill_blank") at ${difficulty} difficulty strictly from the provided study chunks.
Rules:
1. Answer and facts MUST appear in the referenced chunkId.
2. Every "mcq" question MUST have exactly 4 distinct options and a valid correctOptionIndex (0..3). Never use "all of the above".
3. Every "fill_blank" question must blank out a key term inside a complete sentence.

Study Chunks:
${compactContext}`,
      })
    );

    const chunkMap = new Map(chunks.map((c) => [c.id, c]));
    const validated = result.object.questions.filter((q) => {
      const source = chunkMap.get(q.chunkId) || chunks[0];
      if (!source) return false;
      if (q.type === "mcq") {
        if (!q.options || q.options.length !== 4) return false;
        const uniqueOpts = new Set(q.options.map((o) => o.trim().toLowerCase()));
        if (uniqueOpts.size !== 4) return false;
        if (typeof q.correctOptionIndex !== "number" || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
          return false;
        }
      }
      return true;
    });

    if (validated.length === 0) {
      res.status(200).json({ fallback: true, reason: "Validation failed" });
      return;
    }

    quizCache.set(cacheKey, validated);
    res.status(200).json({ fallback: false, questions: validated });
  } catch {
    res.status(200).json({ fallback: true, reason: "AI generation error, using local fallback" });
  }
}
