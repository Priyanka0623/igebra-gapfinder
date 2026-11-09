// Recharts visualizations for overall score trend and per-chapter bar comparisons
import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from "recharts";
import { ChapterTopic, QuizAttempt } from "../lib/storage";

interface OverallTrendChartProps {
  attempts: QuizAttempt[];
}

export const OverallTrendChart: React.FC<OverallTrendChartProps> = ({ attempts }) => {
  if (attempts.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 p-6 text-sm text-stone-500">
        No quiz attempts yet. Complete your first diagnostic quiz to see your score chart.
      </div>
    );
  }

  if (attempts.length === 1) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 p-6 text-center">
        <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
          Attempt 1: {attempts[0].scorePercent}%
        </div>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Take another quiz to see your trend
        </p>
      </div>
    );
  }

  const data = attempts.map((att, index) => ({
    name: `Attempt ${index + 1}`,
    score: att.scorePercent,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => [`${value}%`, "Overall Score"]} />
          <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 4" />
          <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#1d4d38"
            fill="#bbf7d0"
            fillOpacity={0.45}
            strokeWidth={2.5}
            dot={{ r: 5, fill: "#1d4d38" }}
          >
            <LabelList dataKey="score" position="top" formatter={(v: number) => `${v}%`} fontSize={11} />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface ChapterComparisonChartProps {
  chapters: ChapterTopic[];
  attempts: QuizAttempt[];
}

export const ChapterComparisonChart: React.FC<ChapterComparisonChartProps> = ({
  chapters,
  attempts,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>("all");

  if (attempts.length === 0 || chapters.length === 0) {
    return null;
  }

  const recentAttempts = attempts.slice(-3);
  const filteredChapters =
    selectedChapterId === "all"
      ? chapters.slice(0, 5)
      : chapters.filter((c) => c.id === selectedChapterId);

  const data = filteredChapters.map((ch) => {
    let answered = 0;
    let correct = 0;
    for (const att of recentAttempts) {
      for (const q of att.questions) {
        if (q.chapterId !== ch.id) continue;
        const ans = att.answers[q.id];
        if (!ans) continue;
        answered += 1;
        if (ans.isCorrect) correct += 1;
      }
    }
    const score = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const shortName = ch.title.length > 22 ? `${ch.title.slice(0, 20)}…` : ch.title;
    return {
      shortName,
      fullTitle: ch.title,
      score,
      answered,
    };
  });

  const barColor = (score: number, answered: number) => {
    if (answered === 0) return "#9ca3af";
    if (score < 50) return "#ef4444";
    if (score < 80) return "#f59e0b";
    return "#10b981";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
          Latest {recentAttempts.length} {recentAttempts.length === 1 ? "attempt" : "attempts"} (max 5 chapters shown)
        </span>
        <select
          aria-label="Filter chapter chart"
          value={selectedChapterId}
          onChange={(e) => setSelectedChapterId(e.target.value)}
          className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-2.5 py-1.5 text-xs font-medium text-stone-800 dark:text-stone-200"
        >
          <option value="all">Top {Math.min(5, chapters.length)} chapters</option>
          {chapters.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.title}
            </option>
          ))}
        </select>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="shortName" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, _name, props) => [
                `${value}% (${props.payload.answered} questions)`,
                props.payload.fullTitle,
              ]}
            />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={barColor(entry.score, entry.answered)} />
              ))}
              <LabelList dataKey="score" position="top" formatter={(v: number) => `${v}%`} fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
