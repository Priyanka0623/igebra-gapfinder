// Quiz results page with sticky top bar, chapter score rows, and collapsible per-question review
import React, { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw, AlertTriangle, Play, BookOpen } from "lucide-react";
import { ChapterTopic, QuizAttempt } from "../lib/storage";
import { classifyScoreBand } from "../lib/gap";
import { StatusDot } from "../components/Cards";

interface ResultsProps {
  attempt: QuizAttempt | null;
  chapters: ChapterTopic[];
  onStartAnotherQuiz: () => void;
  onRetryWrongQuestions: (attempt: QuizAttempt) => void;
  onOpenGapReport: () => void;
}

export const Results: React.FC<ResultsProps> = ({
  attempt,
  chapters,
  onStartAnotherQuiz,
  onRetryWrongQuestions,
  onOpenGapReport,
}) => {
  const [showReview, setShowReview] = useState(true);

  if (!attempt) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 text-center">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          No recent quiz attempt selected.
        </p>
        <button
          type="button"
          onClick={onStartAnotherQuiz}
          className="mt-4 rounded-lg bg-emerald-900 px-4 py-2 text-xs font-semibold text-white"
        >
          Start a Diagnostic Quiz
        </button>
      </div>
    );
  }

  const chapterMap = new Map(chapters.map((c) => [c.id, c]));
  const includedChapterIds = Array.from(new Set(attempt.questions.map((q) => q.chapterId)));

  const chapterBreakdown = includedChapterIds.map((chId) => {
    const qs = attempt.questions.filter((q) => q.chapterId === chId);
    const correct = qs.filter((q) => attempt.answers[q.id]?.isCorrect).length;
    const score = qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0;
    const band = classifyScoreBand(score, qs.length);
    return {
      chapterId: chId,
      title: chapterMap.get(chId)?.title || qs[0]?.chapterTitle || "Chapter",
      questionCount: qs.length,
      correct,
      score,
      band,
    };
  });

  const hasWrong = attempt.correctCount < attempt.totalQuestions;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-900 text-lg font-extrabold text-lime-300">
            {attempt.scorePercent}%
          </div>
          <div>
            <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Diagnostic Results: {attempt.correctCount} / {attempt.totalQuestions} Correct
            </h1>
            <p className="text-xs text-stone-500">
              {includedChapterIds.length} {includedChapterIds.length === 1 ? "chapter" : "chapters"} tested
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onStartAnotherQuiz}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-stone-700 px-3.5 py-2 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-50"
          >
            <Play className="h-3.5 w-3.5" />
            Start another quiz
          </button>
          {hasWrong && (
            <button
              type="button"
              onClick={() => onRetryWrongQuestions(attempt)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/60 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry wrong questions
            </button>
          )}
          <button
            type="button"
            onClick={onOpenGapReport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Open gap report
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          Chapters Included in This Quiz
        </h2>
        <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
          {chapterBreakdown.map((row) => (
            <div key={row.chapterId} className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-2.5">
                <StatusDot band={row.band} />
                <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {row.title}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-stone-900 dark:text-stone-100">{row.score}%</span>
                <span className="text-stone-500">based on {row.questionCount} questions</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
        <button
          type="button"
          onClick={() => setShowReview(!showReview)}
          className="flex w-full items-center justify-between text-left text-sm font-bold text-stone-900 dark:text-stone-100"
        >
          <span>Per-Question Diagnostic Review ({attempt.questions.length})</span>
          {showReview ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {showReview && (
          <div className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
            {attempt.questions.map((q, idx) => {
              const ans = attempt.answers[q.id];
              const yourAnswer =
                q.type === "mcq" && typeof ans?.selectedOptionIndex === "number" && q.options
                  ? q.options[ans.selectedOptionIndex]
                  : ans?.textAnswer || "Unanswered";

              return (
                <div key={q.id} className="space-y-1.5 py-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      Q{idx + 1}. {q.prompt}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-bold ${
                        ans?.isCorrect
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {ans?.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <div className="text-stone-600 dark:text-stone-400">
                    Your answer: <strong>{yourAnswer}</strong> · Correct answer:{" "}
                    <strong className="text-emerald-800 dark:text-emerald-300">
                      {q.correctAnswerText}
                    </strong>
                  </div>
                  <div className="text-stone-600 dark:text-stone-400">{q.explanation}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>
                      Citation: {q.citation.docTitle} — {q.citation.chapterTitle} ({q.citation.section})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
