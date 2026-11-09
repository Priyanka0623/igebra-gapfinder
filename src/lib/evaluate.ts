// Deterministic answer evaluation with fuzzy matching for fill-in-the-blank answers
import { QuestionAnswer, QuizQuestion } from "./storage";

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function isFillBlankCorrect(userInput: string, question: QuizQuestion): boolean {
  const cleanUser = userInput.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "");
  if (!cleanUser) return false;

  const candidates = [
    question.correctAnswerText.toLowerCase().trim(),
    ...(question.acceptableAnswers || []).map((a) => a.toLowerCase().trim()),
  ];

  for (const cand of candidates) {
    const cleanCand = cand.replace(/[^a-z0-9\s-]/g, "");
    if (cleanUser === cleanCand) return true;
    if (cleanUser === `${cleanCand}s` || `${cleanUser}s` === cleanCand) return true;
    if (cleanCand.length >= 5 && levenshteinDistance(cleanUser, cleanCand) <= 1) return true;
    if (cleanCand.length >= 8 && levenshteinDistance(cleanUser, cleanCand) <= 2) return true;
  }

  return false;
}

export function evaluateSingleQuestion(
  question: QuizQuestion,
  draftAnswer?: { selectedOptionIndex?: number; textAnswer?: string; flagged?: boolean }
): QuestionAnswer {
  if (!draftAnswer) {
    return {
      questionId: question.id,
      chapterId: question.chapterId,
      isCorrect: false,
    };
  }

  if (question.type === "mcq") {
    const isCorrect =
      typeof draftAnswer.selectedOptionIndex === "number" &&
      draftAnswer.selectedOptionIndex === question.correctOptionIndex;
    return {
      questionId: question.id,
      chapterId: question.chapterId,
      selectedOptionIndex: draftAnswer.selectedOptionIndex,
      isCorrect,
      flagged: draftAnswer.flagged,
    };
  }

  const text = draftAnswer.textAnswer || "";
  const isCorrect = isFillBlankCorrect(text, question);
  return {
    questionId: question.id,
    chapterId: question.chapterId,
    textAnswer: text,
    isCorrect,
    flagged: draftAnswer.flagged,
  };
}
