// Server-side Groq assistant for grounded explanations, gap reasons, and flashcards using openai/gpt-oss-20b
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import type { ApiRequest, ApiResponse } from "./health";

interface AssistChunk {
  id: string;
  docTitle: string;
  chapterTitle: string;
  subtopicTitle?: string;
  text: string;
}

const assistCache = new Map<string, string>();

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 350 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ fallback: true });
    return;
  }

  const apiKey = process.env?.GROQ_API_KEY?.trim();
  if (!apiKey) {
    res.status(200).json({ fallback: true });
    return;
  }

  try {
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as {
      query?: string;
      chunks?: AssistChunk[];
    };

    const query = (body?.query || "").trim();
    const chunks = (body?.chunks || []).slice(0, 5);

    if (!query || chunks.length === 0) {
      res.status(200).json({
        fallback: false,
        answer: "I couldn't find this in your material.",
      });
      return;
    }

    const cacheKey = `${query.toLowerCase()}::${chunks.map((c) => c.id).join(",")}`;
    if (assistCache.has(cacheKey)) {
      res.status(200).json({ fallback: false, answer: assistCache.get(cacheKey) });
      return;
    }

    const modelId = process.env?.GROQ_MODEL_FAST?.trim() || "openai/gpt-oss-20b";
    const groq = createGroq({ apiKey });

    const contextText = chunks
      .map(
        (c, idx) =>
          `[Source ${idx + 1}: ${c.docTitle} — ${c.chapterTitle}${
            c.subtopicTitle ? ` (${c.subtopicTitle})` : ""
          }]\n${c.text.slice(0, 700)}`
      )
      .join("\n\n");

    const { text } = await withRetry(() =>
      generateText({
        model: groq(modelId),
        providerOptions: {
          groq: { reasoningEffort: "low" },
        },
        prompt: `Answer the student's question ONLY using the provided study material chunks below.
If the answer is not contained in the chunks, reply with the exact sentence: "I couldn't find this in your material."
Cite the chapter and document title in your explanation.

Student Question: ${query}

Retrieved Material Chunks:
${contextText}`,
      })
    );

    const cleaned = text.trim() || "I couldn't find this in your material.";
    assistCache.set(cacheKey, cleaned);
    res.status(200).json({ fallback: false, answer: cleaned });
  } catch {
    res.status(200).json({ fallback: true });
  }
}
