// Vercel serverless endpoint returning boolean AI configuration status only
export interface ApiRequest {
  method?: string;
  body?: unknown;
}

export interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
}

export default async function handler(_req: ApiRequest, res: ApiResponse): Promise<void> {
  const hasGroqKey = Boolean(
    typeof process !== "undefined" &&
      process.env &&
      typeof process.env.GROQ_API_KEY === "string" &&
      process.env.GROQ_API_KEY.trim().length > 0
  );

  res.status(200).json({
    aiMode: hasGroqKey,
  });
}
