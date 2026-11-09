// Progress dashboard with chapter-by-attempt matrix, point change arrows, Recharts, and history
import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { ChapterTopic, QuizAttempt } from "../lib/storage";
import { ChapterComparisonChart, OverallTrendChart } from "../components/Charts";

interface DashboardProps {
  chapters: ChapterTopic[];
  attempts: QuizAttempt[];
  embedded?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  chapters,
  attempts,
  embedded = false,
}) => {
  const recentAttempts = attempts.slice(-5);

  const computeAttemptChapterScore = (att: QuizAttempt, chId: string): number | null => {
    const qs = att.questions.filter((q) => q.chapterId === chId);
    if (qs.length === 0) return null;
    const correct = qs.filter((q) => att.answers[q.id]?.isCorrect).length;
    return Math.round((correct / qs.length) * 100);
  };

  const cellColor = (score: number | null) => {
    if (score === null) return "bg-stone-50 dark:bg-stone-900 text-stone-400";
    if (score < 50) return "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 font-semibold";
    if (score < 80) return "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-semibold";
    return "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold";
  };

  const renderChange = (values: (number | null)[]) => {
    const valid = values.filter((v): v is number => v !== null);
    if (valid.length < 2) return <span className="text-stone-400">—</span>;
    const diff = valid[valid.length - 1] - valid[0];
    if (diff > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700 dark:text-emerald-400">
          <ArrowUpRight className="h-3.5 w-3.5" />+{diff} pts
        </span>
      );
    }
    if (diff < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 font-bold text-red-600 dark:text-red-400">
          <ArrowDownRight className="h-3.5 w-3.5" />
          {diff} pts
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-stone-500">
        <Minus className="h-3.5 w-3.5" />0 pts
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        {!embedded && (
          <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Longitudinal Tracking
          </div>
        )}
        <h2 className="mt-1 text-xl font-bold text-stone-900 dark:text-stone-100">
          Progress Dashboard
        </h2>
        <p className="mt-0.5 text-xs text-stone-500">
          Score trajectory across attempts and chapter-by-chapter mastery matrix.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <h3 className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100">
            Overall Score per Attempt
          </h3>
          <OverallTrendChart attempts={attempts} />
        </div>

        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <h3 className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100">
            Chapter Mastery (Latest 3 Attempts)
          </h3>
          <ChapterComparisonChart chapters={chapters} attempts={attempts} />
        </div>
      </div>

      {recentAttempts.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Chapter</th>
                {recentAttempts.map((att, idx) => (
                  <th key={att.id} className="px-4 py-3">
                    Attempt {attempts.length - recentAttempts.length + idx + 1}
                  </th>
                ))}
                <th className="px-4 py-3">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {chapters.map((ch) => {
                const scores = recentAttempts.map((a) => computeAttemptChapterScore(a, ch.id));
                return (
                  <tr key={ch.id}>
                    <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                      {ch.title}
                    </td>
                    {scores.map((sc, i) => (
                      <td key={i} className={`px-4 py-3 ${cellColor(sc)}`}>
                        {sc === null ? "—" : `${sc}%`}
                      </td>
                    ))}
                    <td className="px-4 py-3">{renderChange(scores)}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-stone-300 dark:border-stone-700 font-bold">
                <td className="px-4 py-3 text-stone-900 dark:text-stone-100">Overall</td>
                {recentAttempts.map((att) => (
                  <td key={att.id} className={`px-4 py-3 ${cellColor(att.scorePercent)}`}>
                    {att.scorePercent}%
                  </td>
                ))}
                <td className="px-4 py-3">
                  {renderChange(recentAttempts.map((a) => a.scorePercent))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {attempts.length > 0 && (
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Attempt History ({attempts.length})
          </h3>
          <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800 text-xs">
            {[...attempts].reverse().map((att, idx) => (
              <div key={att.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  Attempt {attempts.length - idx} · {new Date(att.createdAt).toLocaleDateString()}
                </span>
                <span className="text-stone-600 dark:text-stone-400">
                  {att.totalQuestions} questions · {att.mode} mode ·{" "}
                  <strong>{att.scorePercent}%</strong> ({att.correctCount}/{att.totalQuestions}) ·{" "}
                  {Math.max(1, Math.round(att.durationSeconds / 60))} min
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
