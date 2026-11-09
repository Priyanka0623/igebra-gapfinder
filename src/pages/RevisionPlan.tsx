// Day-by-day revision plan prioritized by weakness x exam importance
import React, { useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { RevisionPlanState } from "../lib/storage";
import { EmptyState } from "../components/EmptyState";

interface RevisionPlanProps {
  plan: RevisionPlanState | undefined;
  hasChapters: boolean;
  onUpdatePlanConfig: (days: number, hoursPerDay: number) => void;
  onToggleTask: (taskId: string) => void;
  onPracticeChapter: (chapterId: string) => void;
  onUploadClick: () => void;
}

export const RevisionPlan: React.FC<RevisionPlanProps> = ({
  plan,
  hasChapters,
  onUpdatePlanConfig,
  onToggleTask,
  onPracticeChapter,
  onUploadClick,
}) => {
  const [days, setDays] = useState<number>(plan?.days || 5);
  const [hours, setHours] = useState<number>(plan?.hoursPerDay || 1.5);

  if (!hasChapters || !plan) {
    return (
      <EmptyState
        title="Upload materials to build your revision plan"
        description="Your study plan ranks chapters by diagnostic weakness multiplied by past-paper frequency."
        actionLabel="Upload Materials"
        onAction={onUploadClick}
      />
    );
  }

  const completedCount = plan.tasks.filter((t) => t.done).length;
  const totalCount = plan.tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const dayNumbers = Array.from(new Set(plan.tasks.map((t) => t.day))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Adaptive Schedule · Priority = Weakness &times; Exam Importance
          </div>
          <h1 className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
            Revision Plan
          </h1>
          {plan.changeSummary && (
            <p className="mt-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              {plan.changeSummary}
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUpdatePlanConfig(days, hours);
          }}
          className="flex flex-wrap items-center gap-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 text-xs"
        >
          <label className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
            Days:
            <input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
              className="w-14 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
            Hours/day:
            <input
              type="number"
              step="0.5"
              min={0.5}
              max={8}
              value={hours}
              onChange={(e) => setHours(Math.max(0.5, Number(e.target.value)))}
              className="w-16 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-2 py-1"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-3 py-1.5 font-semibold text-white hover:bg-emerald-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Update Plan
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span>
            Checklist Progress: {completedCount} of {totalCount} sessions completed
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div
            className="h-full bg-emerald-700 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {dayNumbers.map((dayNum) => {
          const dayTasks = plan.tasks.filter((t) => t.day === dayNum);
          return (
            <div
              key={dayNum}
              className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5"
            >
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Day {dayNum}
              </h3>
              <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      className="flex items-start gap-3 text-left"
                    >
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          task.done ? "text-emerald-600" : "text-stone-300 dark:text-stone-600"
                        }`}
                      />
                      <div>
                        <div
                          className={`text-xs font-semibold ${
                            task.done
                              ? "line-through text-stone-400"
                              : "text-stone-900 dark:text-stone-100"
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="text-[11px] text-stone-500">{task.detail}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPracticeChapter(task.chapterId)}
                      className="rounded-lg border border-stone-200 dark:border-stone-700 px-2.5 py-1 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50"
                    >
                      Practice Chapter
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
