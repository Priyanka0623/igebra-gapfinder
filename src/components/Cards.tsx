// Shared metric, status dot, and mastery ring cards
import React from "react";
import { MasteryBand } from "../lib/gap";

export const StatusDot: React.FC<{ band: MasteryBand; showLabel?: boolean }> = ({
  band,
  showLabel = false,
}) => {
  const colorMap: Record<MasteryBand, string> = {
    Weak: "bg-red-500",
    Medium: "bg-amber-500",
    Strong: "bg-emerald-500",
    "Low confidence": "bg-stone-400",
    Untested: "bg-stone-300 dark:bg-stone-600",
  };

  const textMap: Record<MasteryBand, string> = {
    Weak: "text-red-700 dark:text-red-400",
    Medium: "text-amber-700 dark:text-amber-400",
    Strong: "text-emerald-700 dark:text-emerald-400",
    "Low confidence": "text-stone-600 dark:text-stone-400",
    Untested: "text-stone-500 dark:text-stone-400",
  };

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${colorMap[band]}`} />
      {showLabel && <span className={`text-xs font-semibold ${textMap[band]}`}>{band}</span>}
    </span>
  );
};

export const MasteryRing: React.FC<{ percent: number | null; size?: number; label?: string }> = ({
  percent,
  size = 116,
  label = "Mastery",
}) => {
  const safePercent = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safePercent / 100) * circumference;

  const strokeColor =
    percent === null
      ? "#a8a29e"
      : safePercent < 50
      ? "#ef4444"
      : safePercent < 80
      ? "#f59e0b"
      : "#10b981";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-stone-200 dark:text-stone-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold text-stone-900 dark:text-stone-100">
          {percent === null ? "—" : `${safePercent}%`}
        </span>
        <span className="text-[11px] text-stone-500 dark:text-stone-400">{label}</span>
      </div>
    </div>
  );
};
