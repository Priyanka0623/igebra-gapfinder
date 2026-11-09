// Compact chapter map table expanding to plain subtopic lists and optional past-paper question drawer
import React, { useState } from "react";
import { ChevronDown, ChevronRight, FileQuestion } from "lucide-react";
import { ChapterGapDiagnostic } from "../lib/gap";
import { ChapterTopic } from "../lib/storage";
import { StatusDot } from "../components/Cards";
import { EmptyState } from "../components/EmptyState";

interface TopicMapProps {
  chapters: ChapterTopic[];
  diagnostics: ChapterGapDiagnostic[];
  onUploadClick: () => void;
}

export const TopicMap: React.FC<TopicMapProps> = ({
  chapters,
  diagnostics,
  onUploadClick,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drawerChapterId, setDrawerChapterId] = useState<string | null>(null);

  if (chapters.length === 0) {
    return (
      <EmptyState
        title="No chapters extracted yet"
        description="Upload your syllabus or structured chapter notes so GapFinder can build your chapter map."
        actionLabel="Go to Materials"
        onAction={onUploadClick}
      />
    );
  }

  const diagMap = new Map(diagnostics.map((d) => [d.chapterId, d]));
  const drawerChapter = chapters.find((c) => c.id === drawerChapterId);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
          Curriculum Structure
        </div>
        <h1 className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
          Chapter Map
        </h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Top-level chapters with nested subtopics, past-paper frequency, and current diagnostic mastery.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-xs font-bold uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Chapter</th>
              <th className="px-4 py-3">Subtopics</th>
              <th className="px-4 py-3">Times Asked in Past Papers</th>
              <th className="px-4 py-3">Mastery</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {chapters.map((ch) => {
              const isExpanded = expandedId === ch.id;
              const diag = diagMap.get(ch.id);
              const band = diag?.band || "Untested";

              return (
                <React.Fragment key={ch.id}>
                  <tr className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40">
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : ch.id)}
                        className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-100 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-stone-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
                        )}
                        <span>{ch.title}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-stone-600 dark:text-stone-400">
                      {ch.subtopics.length} {ch.subtopics.length === 1 ? "subtopic" : "subtopics"}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {ch.pastPaperCount}
                        </span>
                        {ch.pastPaperCount > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDrawerChapterId(drawerChapterId === ch.id ? null : ch.id)
                            }
                            className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-400 underline"
                          >
                            <FileQuestion className="h-3.5 w-3.5" />
                            View past-paper questions ({ch.pastPaperCount})
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <StatusDot band={band} showLabel />
                        {diag?.scorePercent !== null && diag?.scorePercent !== undefined && (
                          <span className="text-xs text-stone-500">({diag.scorePercent}%)</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-stone-50/50 dark:bg-stone-900/50">
                      <td colSpan={4} className="px-10 py-3">
                        {ch.subtopics.length === 0 ? (
                          <p className="text-xs text-stone-500">No numbered subtopics listed.</p>
                        ) : (
                          <ul className="list-disc space-y-1 pl-4 text-xs text-stone-700 dark:text-stone-300">
                            {ch.subtopics.map((sub) => (
                              <li key={sub.id}>
                                <span className="font-mono text-stone-500">{sub.code}</span>{" "}
                                {sub.title}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {drawerChapter && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Past-Paper Questions Linked to {drawerChapter.title}
            </h3>
            <button
              type="button"
              onClick={() => setDrawerChapterId(null)}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800"
            >
              Close
            </button>
          </div>
          <ul className="mt-3 list-decimal space-y-1.5 pl-5 text-xs text-stone-700 dark:text-stone-300">
            {drawerChapter.pastPaperQuestions.map((q) => (
              <li key={q.id}>
                {q.text}{" "}
                {q.marks ? <span className="font-semibold text-stone-500">[{q.marks} marks]</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
