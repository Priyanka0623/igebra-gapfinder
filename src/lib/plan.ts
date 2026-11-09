// Dynamic revision plan generator prioritized by weakness x exam importance
import { ChapterGapDiagnostic } from "./gap";
import { ChapterTopic, PlanTask, RevisionPlanState } from "./storage";

export function generateRevisionPlan(params: {
  subjectId: string;
  chapters: ChapterTopic[];
  diagnostics: ChapterGapDiagnostic[];
  days: number;
  hoursPerDay: number;
  previousPlan?: RevisionPlanState;
}): RevisionPlanState {
  const { subjectId, chapters, diagnostics, days, hoursPerDay, previousPlan } = params;
  const safeDays = Math.max(1, Math.min(30, days));
  const safeHours = Math.max(0.5, Math.min(8, hoursPerDay));
  const dailyMinutes = Math.round(safeHours * 60);

  const diagMap = new Map(diagnostics.map((d) => [d.chapterId, d]));

  const ranked = chapters
    .map((ch) => {
      const diag = diagMap.get(ch.id);
      const score = diag?.scorePercent ?? 45;
      const weakness = Math.max(10, 100 - score);
      const examImportance = 1 + ch.pastPaperCount * 0.35;
      const priorityScore = Math.round(weakness * examImportance);
      return { ch, diag, priorityScore };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const tasks: PlanTask[] = [];
  if (ranked.length > 0) {
    for (let day = 1; day <= safeDays; day++) {
      const primary = ranked[(day - 1) % ranked.length];
      const secondary = ranked[day % ranked.length];
      const readMinutes = Math.max(15, Math.round(dailyMinutes * 0.55));
      const practiceMinutes = Math.max(15, dailyMinutes - readMinutes);

      const focusSub =
        primary.ch.subtopics[0]?.title || primary.ch.title;

      tasks.push({
        id: `task-${subjectId}-d${day}-1`,
        day,
        chapterId: primary.ch.id,
        chapterTitle: primary.ch.title,
        title: `Review notes on ${primary.ch.title} (${focusSub})`,
        detail: `${readMinutes} min · Priority ${primary.priorityScore} · ${primary.ch.pastPaperCount} past-paper appearances`,
        minutes: readMinutes,
        priorityScore: primary.priorityScore,
        done: false,
      });

      tasks.push({
        id: `task-${subjectId}-d${day}-2`,
        day,
        chapterId: secondary.ch.id,
        chapterTitle: secondary.ch.title,
        title: `Diagnostic practice & mistake review: ${secondary.ch.title}`,
        detail: `${practiceMinutes} min · Target 80%+ mastery`,
        minutes: practiceMinutes,
        priorityScore: secondary.priorityScore,
        done: false,
      });
    }
  }

  let changeSummary = "Initial revision plan generated from your chapter map and exam weightings.";
  if (previousPlan && previousPlan.tasks.length > 0 && tasks.length > 0) {
    const prevTop = previousPlan.tasks[0]?.chapterTitle;
    const newTop = tasks[0]?.chapterTitle;
    if (prevTop && newTop && prevTop !== newTop) {
      changeSummary = `Updated after latest attempt: moved ${newTop} to Day 1 priority (replacing ${prevTop}).`;
    } else if (newTop) {
      changeSummary = `Refreshed after latest attempt: reinforced focus on ${newTop} based on recent diagnostic scores.`;
    }
  }

  return {
    subjectId,
    days: safeDays,
    hoursPerDay: safeHours,
    updatedAt: new Date().toISOString(),
    changeSummary,
    tasks,
  };
}
