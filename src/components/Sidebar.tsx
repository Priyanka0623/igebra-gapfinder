// Application navigation sidebar with signature brand mark, streak card, and user profile controls
import React from "react";
import {
  LayoutDashboard,
  FolderOpen,
  Network,
  ClipboardCheck,
  AlertTriangle,
  CalendarCheck,
  BookOpenCheck,
  Layers,
  BarChart3,
  LogOut,
} from "lucide-react";
import { UserProfile } from "../lib/storage";

export type RoutePage =
  | "overview"
  | "materials"
  | "map"
  | "quiz"
  | "results"
  | "report"
  | "plan"
  | "explain"
  | "flashcards"
  | "dashboard";

interface SidebarProps {
  activePage: RoutePage;
  onNavigate: (page: RoutePage) => void;
  profile: UserProfile;
  weakCount: number;
  streakDays: number;
  onLogout: () => void;
}

const NAV_ITEMS: { id: RoutePage; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "materials", label: "Materials", icon: FolderOpen },
  { id: "map", label: "Chapter map", icon: Network },
  { id: "quiz", label: "Quick quiz", icon: ClipboardCheck },
  { id: "report", label: "Gap report", icon: AlertTriangle },
  { id: "plan", label: "Study plan", icon: CalendarCheck },
  { id: "explain", label: "Explain topic", icon: BookOpenCheck },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "dashboard", label: "Progress", icon: BarChart3 },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  profile,
  weakCount,
  streakDays,
  onLogout,
}) => {
  const initials = profile.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[246px] flex-col border-r border-[#e8ebe7] dark:border-stone-800 bg-white dark:bg-stone-900 px-4 pt-6 pb-4 no-print max-md:w-16 max-md:px-2">
      <button
        type="button"
        onClick={() => onNavigate("overview")}
        className="flex items-center gap-2.5 px-2 text-left focus:outline-none"
      >
        <span className="gf-brand-mark">g</span>
        <span className="font-display text-xl font-extrabold tracking-tight text-[#203c2e] dark:text-stone-100 max-md:hidden">
          gapfinder
          <sup className="ml-0.5 text-[9px] font-bold text-[#9da69f]">AI</sup>
        </span>
      </button>

      <div className="mt-8 mb-2.5 px-2.5 text-[10px] font-bold uppercase tracking-[1.15px] text-[#9aa29c] max-md:hidden">
        MY LEARNING
      </div>

      <nav className="flex-1 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activePage === id || (activePage === "results" && id === "quiz");
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors focus:outline-none ${
                isActive
                  ? "bg-[#eef4ed] dark:bg-emerald-950/70 text-[#214f3a] dark:text-emerald-300 font-bold"
                  : "text-[#737d76] dark:text-stone-400 font-medium hover:bg-[#f5f8f4] hover:text-[#214f3a] dark:hover:bg-stone-800"
              }`}
              title={label}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-[#376c4c] dark:text-emerald-300" : "text-[#8a948d]"
                }`}
              />
              <span className="truncate max-md:hidden">{label}</span>
              {id === "report" && weakCount > 0 && (
                <span className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-[#d78a67] text-[10px] font-bold text-white max-md:hidden">
                  {weakCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-3">
        <div className="rounded-[10px] bg-[#f7f8f4] dark:bg-stone-800/60 p-3 max-md:hidden">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-[#f6e8c9] text-xs text-[#c58f42]">
              ✦
            </span>
            <div>
              <strong className="block text-[11px] text-[#202a25] dark:text-stone-200">
                {streakDays} day streak
              </strong>
              <small className="block text-[10px] text-[#89918c]">
                {streakDays > 0 ? "You're on a roll!" : "Start a quiz today"}
              </small>
            </div>
          </div>
          <div className="mt-3 flex justify-between">
            {dayLabels.map((d, idx) => {
              const isDone = idx < Math.min(7, streakDays);
              return (
                <span
                  key={idx}
                  className={`grid h-[22px] w-[22px] place-items-center rounded-full text-[9px] font-bold ${
                    isDone
                      ? "bg-[#6b9b75] text-white"
                      : "bg-[#edefea] dark:bg-stone-700 text-[#a4aaa5]"
                  }`}
                >
                  {d}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#edf0ec] dark:border-stone-800 pt-3 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e1ebdb] text-[10px] font-bold text-[#4e6749]">
              {initials || "ST"}
            </span>
            <div className="min-w-0 max-md:hidden">
              <strong className="block truncate text-[11px] text-[#202a25] dark:text-stone-100">
                {profile.name}
              </strong>
              <small className="block truncate text-[10px] text-[#8c958e]">
                {profile.email}
              </small>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-lg p-1.5 text-[#78817b] hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-[#202a25]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
