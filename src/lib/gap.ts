// Gap classification (Weak <50%, Medium 50-79%, Strong >=80%, Low confidence <2 answered)
import { ChapterTopic, QuizAttempt, QuizQuestion } from "./storage";

export type MasteryBand = "Weak" | "Medium" | "Strong" | "Low confidence" | "Untested";

export interface MistakeRecord {
  question: QuizQuestion;
  yourAnswer: string;
  correctAnswer: string;
  attemptDate: string;
}

export interface ChapterGapDiagnostic {
  chapterId: string;
  chapterTitle: string;
  numberLabel: string;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  scorePercent: number | null;
  band: MasteryBand;
  reason: string;
  mistakes: MistakeRecord[];
  pastPaperCount: number;
}

export function classifyScoreBand(scorePercent: number | null, answeredCount: number): MasteryBand {
  if (answeredCount === 0 || scorePercent === null) return "Untested";
  if (answeredCount < 2) return "Low confidence";
  if (scorePercent < 50) return "Weak";
  if (scorePercent < 80) return "Medium";
  return "Strong";
}

export function computeSubjectGapDiagnostics(
  chapters: ChapterTopic[],
  attempts: QuizAttempt[]
): ChapterGapDiagnostic[] {
  return chapters.map((ch) => {
    let answeredCount = 0;
    let correctCount = 0;
    const mistakes: MistakeRecord[] = [];
    const missedSubtopics = new Set<string>();

    for (const attempt of attempts) {
      for (const q of attempt.questions) {
        if (q.chapterId !== ch.id) continue;
        const ans = attempt.answers[q.id];
        if (!ans) continue;
        const wasAnswered =
          typeof ans.selectedOptionIndex === "number" ||
          Boolean(ans.textAnswer && ans.textAnswer.trim().length > 0);
        if (!wasAnswered) continue;

        answeredCount += 1;
        if (ans.isCorrect) {
          correctCount += 1;
        } else {
          if (q.citation?.section) missedSubtopics.add(q.citation.section);
          const yourAnswer =
            q.type === "mcq" && typeof ans.selectedOptionIndex === "number" && q.options
              ? q.options[ans.selectedOptionIndex] || "No selection"
              : ans.textAnswer || "Blank";
          mistakes.push({
            question: q,
            yourAnswer,
            correctAnswer: q.correctAnswerText,
            attemptDate: attempt.createdAt,
          });
        }
      }
    }

    const wrongCount = answeredCount - correctCount;
    const scorePercent = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : null;
    const band = classifyScoreBand(scorePercent, answeredCount);

    let reason = "Not tested yet. Take a diagnostic quiz covering this chapter.";
    if (answeredCount === 1) {
      reason = `Only 1 question answered on ${ch.title} (${correctCount}/1 correct). Answer at least 2 questions for a confident classification.`;
    } else if (answeredCount >= 2) {
      const topicsList = Array.from(missedSubtopics).slice(0, 2).join(" and ") || ch.title;
      if (wrongCount > 0) {
        reason = `You got ${wrongCount} of ${answeredCount} questions on ${ch.title} wrong, mostly about ${topicsList}.`;
      } else {
        reason = `You answered all ${answeredCount} questions on ${ch.title} correctly across your diagnostics.`;
      }
    }

    return {
      chapterId: ch.id,
      chapterTitle: ch.title,
      numberLabel: ch.numberLabel,
      answeredCount,
      correctCount,
      wrongCount,
      scorePercent,
      band,
      reason,
      mistakes,
      pastPaperCount: ch.pastPaperCount,
    };
  });
}
