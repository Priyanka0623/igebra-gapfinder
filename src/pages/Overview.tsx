// Student overview page with mastery ring, weak/medium/strong counters, recent-attempts mini-chart, streak calendar, and goals
import React from "react";
import { ArrowRight, Award, Flame, PlayCircle, CheckCircle2 } from "lucide-react";
import { ChapterGapDiagnostic } from "../lib/gap";
import {
  ActiveQuizDraft,
  ChapterTopic,
  PlanTask,
  QuizAttempt,
  StudyDocument,
  UserProfile,
} from "../lib/storage";
import { EmptyState } from "../components/EmptyState";
import { MasteryRing, StatusDot } from "../components/Cards";
import { RoutePage } from "../components/Sidebar";

interface OverviewProps {
  profile: UserProfile;
  subjectName: string;
  documents: StudyDocument[];
  chapters: ChapterTopic[];
  diagnostics: ChapterGapDiagnostic[];
  attempts: QuizAttempt[];
  activeQuiz: ActiveQuizDraft | null;
  todayTasks: PlanTask[];
  activityDates: string[];
  onNavigate: (page: RoutePage) => void;
  onPracticeChapter: (chapterId: string) => void;
  onToggleTask: (taskId: string) => void;
  onLoadSampleData: () => void;
  isLibraryEmpty: boolean;
}

export const Overview: React.FC<OverviewProps> = ({
  profile,
  subjectName,
  documents,
  chapters,
  diagnostics,
  attempts,
  activeQuiz,
  todayTasks,
  activityDates,
  onNavigate,
  onPracticeChapter,
  onToggleTask,
  onLoadSampleData,
  isLibraryEmpty,
}) => {
  if (documents.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <div className="gf-eyebrow">{subjectName || "Getting Started"}</div>
          <h1 className="font-display mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
            Welcome, {profile.name}
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Upload your syllabus, study notes, and past papers to diagnose what you don&apos;t know yet.
          </p>
        </div>
        <EmptyState
          title="Upload your syllabus to get started"
          description="Your overview, chapter map, diagnostic quizzes, and gap reports are computed strictly from your own uploaded materials."
          actionLabel="Upload Materials"
          onAction={() => onNavigate("materials")}
          secondaryLabel={isLibraryEmpty ? "Load sample data" : undefined}
          onSecondaryAction={isLibraryEmpty ? onLoadSampleData : undefined}
        />
      </div>
    );
  }

  const testedDiags = diagnostics.filter((d) => d.scorePercent !== null);
  const overallMastery =
    testedDiags.length > 0
      ? Math.round(
          testedDiags.reduce((sum, d) => sum + (d.scorePercent || 0), 0) / testedDiags.length
        )
      : null;

  const weakChapters = diagnostics.filter((d) => d.band === "Weak");
  const mediumChapters = diagnostics.filter((d) => d.band === "Medium");
  const strongChapters = diagnostics.filter((d) => d.band === "Strong");

  const coverageRatio = chapters.length > 0 ? testedDiags.length / chapters.length : 0;
  const examReadiness =
    overallMastery !== null ? Math.round(overallMastery * 0.7 + coverageRatio * 100 * 0.3) : 0;

  const xpPoints = attempts.length * 50 + strongChapters.length * 100 + activityDates.length * 20;
  const recentScores = attempts.slice(-6).map((a) => a.scorePercent);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="gf-eyebrow">{subjectName} · Diagnostic Snapshot</div>
          <h1 className="font-display mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
            Hello, {profile.name}
          </h1>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
            {chapters.length} chapters extracted from {documents.length} uploaded{" "}
            {documents.length === 1 ? "file" : "files"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("quiz")}
          className="inline-flex items-center gap-2 rounded-lg bg-[#244b37] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#193b2a]"
        >
          <span>Start Diagnostic Quiz</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="gf-panel flex items-center gap-5 p-5">
          <MasteryRing percent={overallMastery} label="Mastery" />
          <div className="space-y-1.5 text-xs">
            <div className="font-semibold text-stone-900 dark:text-stone-100">
              Chapter Classification
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span>
                Weak (&lt;50%): <strong>{weakChapters.length}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>
                Medium (50–79%): <strong>{mediumChapters.length}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>
                Strong (80%+): <strong>{strongChapters.length}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="gf-hero-card flex flex-col justify-between p-5 text-white">
          <div className="relative z-10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#b9ea83]">
              Continue Where You Left Off
            </div>
            {activeQuiz ? (
              <>
                <h3 className="font-display mt-2 text-base font-bold">
                  Unfinished Quiz ({Object.keys(activeQuiz.answers).length}/
                  {activeQuiz.questions.length} answered)
                </h3>
                <p className="mt-1 text-xs text-emerald-100/80">
                  Resume your saved diagnostic session right where you paused.
                </p>
              </>
            ) : weakChapters[0] ? (
              <>
                <h3 className="font-display mt-2 text-base font-bold">
                  Focus Next: {weakChapters[0].chapterTitle}
                </h3>
                <p className="mt-1 text-xs text-emerald-100/80">{weakChapters[0].reason}</p>
              </>
            ) : (
              <>
                <h3 className="font-display mt-2 text-base font-bold">Take a Diagnostic Quiz</h3>
                <p className="mt-1 text-xs text-emerald-100/80">
                  Test your understanding across {chapters.length} chapters to uncover gaps.
                </p>
              </>
            )}
          </div>
          <div className="relative z-10 mt-4">
            <button
              type="button"
              onClick={() =>
                activeQuiz
                  ? onNavigate("quiz")
                  : weakChapters[0]
                  ? onPracticeChapter(weakChapters[0].chapterId)
                  : onNavigate("quiz")
              }
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-[#204a35] hover:bg-lime-100"
            >
              <PlayCircle className="h-4 w-4" />
              <span>{activeQuiz ? "Resume Quiz" : "Practice Now"}</span>
            </button>
          </div>
        </div>

        <div className="gf-panel flex flex-col justify-between p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-500">Exam Readiness</div>
              <div className="font-display mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
                {examReadiness}%
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Award className="h-3.5 w-3.5" />
                {xpPoints} XP
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-2 border-t border-stone-100 dark:border-stone-800 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
                <Flame className="h-4 w-4 text-amber-500" />
                Active days: <strong>{activityDates.length}</strong>
              </span>
              {recentScores.length > 0 && (
                <div className="flex items-end gap-1 h-6" title="Recent attempt scores">
                  {recentScores.map((sc, i) => (
                    <span
                      key={i}
                      style={{ height: `${Math.max(20, sc)}%` }}
                      className="w-2 rounded-t bg-emerald-600"
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                  attempts.length >= 1
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-stone-100 text-stone-400 dark:bg-stone-800"
                }`}
              >
                First Quiz
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                  activityDates.length >= 3
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-stone-100 text-stone-400 dark:bg-stone-800"
                }`}
              >
                3-Day Streak
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                  strongChapters.length >= 1
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-stone-100 text-stone-400 dark:bg-stone-800"
                }`}
              >
                80%+ Chapter
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="gf-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Weakest Chapters Requiring Attention
            </h2>
            <button
              type="button"
              onClick={() => onNavigate("report")}
              className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
            >
              Open Gap Report
            </button>
          </div>
          {testedDiags.length === 0 ? (
            <p className="mt-4 text-xs text-stone-500">
              No chapters tested yet. Complete a diagnostic quiz to rank your weakest chapters.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
              {[...testedDiags]
                .sort((a, b) => (a.scorePercent ?? 100) - (b.scorePercent ?? 100))
                .slice(0, 4)
                .map((d) => (
                  <div key={d.chapterId} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusDot band={d.band} />
                        <span className="truncate text-xs font-semibold text-stone-900 dark:text-stone-100">
                          {d.chapterTitle}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-stone-500">
                        {d.scorePercent}% ({d.correctCount}/{d.answeredCount} correct)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPracticeChapter(d.chapterId)}
                      className="shrink-0 rounded-lg border border-stone-200 dark:border-stone-700 px-2.5 py-1 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                    >
                      Practice
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="gf-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Today&apos;s Revision Goals
            </h2>
            <button
              type="button"
              onClick={() => onNavigate("plan")}
              className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
            >
              Full Revision Plan
            </button>
          </div>
          {todayTasks.length === 0 ? (
            <p className="mt-4 text-xs text-stone-500">
              Open the Study Plan tab to view or customize your daily study checklist.
            </p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {todayTasks.slice(0, 4).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  className="flex w-full items-start gap-3 rounded-lg border border-stone-100 dark:border-stone-800 p-2.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50"
                >
                  <CheckCircle2
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      task.done ? "text-emerald-600" : "text-stone-300 dark:text-stone-600"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-xs font-semibold ${
                        task.done
                          ? "line-through text-stone-400"
                          : "text-stone-800 dark:text-stone-200"
                      }`}
                    >
                      {task.title}
                    </div>
                    <div className="text-[11px] text-stone-500">{task.detail}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
