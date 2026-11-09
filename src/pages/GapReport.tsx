// Diagnostic gap report page with weakest-first chapter cards, written reasons, and untested fallback view
import React, { useState } from "react";
import { ChevronDown, ChevronRight, Printer, PlayCircle } from "lucide-react";
import { ChapterGapDiagnostic } from "../lib/gap";
import { ChapterTopic, QuizAttempt } from "../lib/storage";
import { StatusDot } from "../components/Cards";
import { EmptyState } from "../components/EmptyState";
import { Dashboard } from "./Dashboard";

interface GapReportProps {
  subjectName: string;
  chapters: ChapterTopic[];
  diagnostics: ChapterGapDiagnostic[];
  attempts: QuizAttempt[];
  onPracticeChapter: (chapterId: string) => void;
  onExplainChapter: (chapterId: string) => void;
  onStartQuiz: () => void;
  onUploadClick?: () => void;
}

export const GapReport: React.FC<GapReportProps> = ({
  subjectName,
  chapters,
  diagnostics,
  attempts,
  onPracticeChapter,
  onExplainChapter,
  onStartQuiz,
  onUploadClick,
}) => {
  const [showUntested, setShowUntested] = useState(false);
  const [expandedMistakes, setExpandedMistakes] = useState<Record<string, boolean>>({});

  if (chapters.length === 0) {
    return (
      <EmptyState
        title="No materials uploaded for this subject yet"
        description="Upload your syllabus, notes, or past papers in Course Materials to generate your chapter diagnostic report."
        actionLabel="Go to Course Materials"
        onAction={onUploadClick || onStartQuiz}
      />
    );
  }

  const tested = diagnostics
    .filter((d) => d.answeredCount > 0)
    .sort((a, b) => (a.scorePercent ?? 100) - (b.scorePercent ?? 100));
  const untested = diagnostics.filter((d) => d.answeredCount === 0);

  const weakCount = tested.filter((d) => d.band === "Weak").length;
  const mediumCount = tested.filter((d) => d.band === "Medium").length;
  const strongCount = tested.filter((d) => d.band === "Strong").length;
  const lowConfCount = tested.filter((d) => d.band === "Low confidence").length;

  const displayedDiagnostics = tested.length > 0 ? tested : untested;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="gf-eyebrow">{subjectName} · Diagnostic Output</div>
          <h1 className="font-display mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
            Chapter Gap Report
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            {tested.length > 0
              ? "Weakest chapters listed first. Classification requires at least 2 answered questions per chapter."
              : `${chapters.length} chapters indexed from your materials. Take a quick quiz or practice any chapter below to measure your mastery.`}
          </p>
        </div>

        <div className="no-print flex items-center gap-2.5">
          <button
            type="button"
            onClick={onStartQuiz}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#244b37] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#193b2a]"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Take Quick Quiz
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 dark:border-stone-700 px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="gf-panel p-4">
          <div className="text-xs text-stone-500">Weak (&lt;50%)</div>
          <div className="mt-1 text-2xl font-bold text-red-600">{weakCount}</div>
        </div>
        <div className="gf-panel p-4">
          <div className="text-xs text-stone-500">Medium (50–79%)</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{mediumCount}</div>
        </div>
        <div className="gf-panel p-4">
          <div className="text-xs text-stone-500">Strong (80%+)</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{strongCount}</div>
        </div>
        <div className="gf-panel p-4">
          <div className="text-xs text-stone-500">
            {tested.length > 0 ? "Low Confidence (<2 Qs)" : "Ready to Test"}
          </div>
          <div className="mt-1 text-2xl font-bold text-stone-600">
            {tested.length > 0 ? lowConfCount : untested.length}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {displayedDiagnostics.map((diag) => {
          const isOpen = Boolean(expandedMistakes[diag.chapterId]);
          return (
            <div key={diag.chapterId} className="gf-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <StatusDot band={diag.band} showLabel />
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                      {diag.chapterTitle}
                    </h3>
                    {diag.scorePercent !== null && (
                      <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                        {diag.scorePercent}% ({diag.correctCount}/{diag.answeredCount})
                      </span>
                    )}
                    {diag.pastPaperCount > 0 && (
                      <span className="rounded bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                        {diag.pastPaperCount} past-paper Qs
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400">{diag.reason}</p>
                </div>

                <div className="no-print flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPracticeChapter(diag.chapterId)}
                    className="rounded-lg bg-[#244b37] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#193b2a]"
                  >
                    Practice this chapter
                  </button>
                  <button
                    type="button"
                    onClick={() => onExplainChapter(diag.chapterId)}
                    className="rounded-lg border border-stone-300 dark:border-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50"
                  >
                    Explain this chapter
                  </button>
                </div>
              </div>

              {diag.mistakes.length > 0 && (
                <div className="mt-3 border-t border-stone-100 dark:border-stone-800 pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedMistakes((prev) => ({
                        ...prev,
                        [diag.chapterId]: !prev[diag.chapterId],
                      }))
                    }
                    className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    <span>
                      Review {diag.mistakes.length} specific{" "}
                      {diag.mistakes.length === 1 ? "mistake" : "mistakes"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-2.5 space-y-2 pl-5">
                      {diag.mistakes.map((m, idx) => (
                        <div
                          key={`${m.question.id}-${idx}`}
                          className="rounded-lg bg-red-50/50 dark:bg-red-950/30 p-3 text-xs"
                        >
                          <div className="font-semibold text-stone-900 dark:text-stone-100">
                            {m.question.prompt}
                          </div>
                          <div className="mt-1 text-stone-600 dark:text-stone-400">
                            Your answer: <strong className="text-red-700">{m.yourAnswer}</strong> ·
                            Correct: <strong className="text-emerald-700">{m.correctAnswer}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tested.length > 0 && untested.length > 0 && (
        <div className="gf-panel p-4">
          <button
            type="button"
            onClick={() => setShowUntested(!showUntested)}
            className="flex items-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300"
          >
            {showUntested ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>Show untested chapters ({untested.length})</span>
          </button>
          {showUntested && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {untested.map((u) => (
                <div
                  key={u.chapterId}
                  className="flex items-center justify-between rounded-lg border border-stone-100 dark:border-stone-800 p-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <StatusDot band="Untested" />
                    <span className="font-medium text-stone-700 dark:text-stone-300">
                      {u.chapterTitle}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPracticeChapter(u.chapterId)}
                    className="font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
                  >
                    Test now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-stone-200 dark:border-stone-800 pt-6">
        <Dashboard chapters={chapters} attempts={attempts} embedded />
      </div>
    </div>
  );
};
