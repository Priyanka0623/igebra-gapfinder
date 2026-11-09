// Diagnostic quiz setup screen with exact missing-Notes empty state and question-by-question runner
import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Clock, AlertCircle } from "lucide-react";
import {
  ActiveQuizDraft,
  ChapterTopic,
  DifficultyLevel,
  QuizMode,
  StudyChunk,
  StudyDocument,
} from "../lib/storage";
import { computeQuizMix, extractFactsFromNotesChunks } from "../lib/quiz";
import { QuizRunner } from "../components/QuizRunner";
import { EmptyState } from "../components/EmptyState";

interface QuizProps {
  documents: StudyDocument[];
  chapters: ChapterTopic[];
  chunks: StudyChunk[];
  activeQuiz: ActiveQuizDraft | null;
  preselectedChapterIds?: string[];
  isGenerating?: boolean;
  onStartQuiz: (config: {
    chapterIds: string[];
    size: number;
    difficulty: DifficultyLevel;
    mode: QuizMode;
    timerMinutes: number;
    includeTrueFalse: boolean;
    includeShortAnswer: boolean;
  }) => void;
  onUpdateDraft: (draft: ActiveQuizDraft | null) => void;
  onSubmitQuiz: (draft: ActiveQuizDraft) => void;
  onUploadClick: () => void;
}

const PRESET_SIZES = [10, 20, 30, 50, 60, 100];

export const Quiz: React.FC<QuizProps> = ({
  documents,
  chapters,
  chunks,
  activeQuiz,
  preselectedChapterIds,
  isGenerating = false,
  onStartQuiz,
  onUpdateDraft,
  onSubmitQuiz,
  onUploadClick,
}) => {
  const [selectedChapters, setSelectedChapters] = useState<string[]>(
    preselectedChapterIds && preselectedChapterIds.length > 0
      ? preselectedChapterIds
      : chapters.map((c) => c.id)
  );
  const [sizeOption, setSizeOption] = useState<string>("10");
  const [customSize, setCustomSize] = useState<number>(15);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("Mixed");
  const [mode, setMode] = useState<QuizMode>("Practice");
  const [timerMinutes, setTimerMinutes] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [includeTrueFalse, setIncludeTrueFalse] = useState(false);
  const [includeShortAnswer, setIncludeShortAnswer] = useState(false);
  const [confirmWarning, setConfirmWarning] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedChapterIds && preselectedChapterIds.length > 0) {
      setSelectedChapters(preselectedChapterIds);
    } else if (selectedChapters.length === 0 && chapters.length > 0) {
      setSelectedChapters(chapters.map((c) => c.id));
    }
  }, [preselectedChapterIds, chapters]);

  useEffect(() => {
    if (!activeQuiz) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;
      const currentQ = activeQuiz.questions[activeQuiz.currentIndex];
      if (!currentQ) return;

      if (currentQ.type === "mcq" && ["1", "2", "3", "4"].includes(e.key)) {
        const idx = Number(e.key) - 1;
        const ans = activeQuiz.answers[currentQ.id];
        if (activeQuiz.mode === "Practice" && ans?.checked) return;
        const nextAnswers = {
          ...activeQuiz.answers,
          [currentQ.id]: { ...ans, selectedOptionIndex: idx },
        };
        onUpdateDraft({ ...activeQuiz, answers: nextAnswers });
      } else if (e.key === "Enter") {
        if (activeQuiz.currentIndex < activeQuiz.questions.length - 1) {
          onUpdateDraft({ ...activeQuiz, currentIndex: activeQuiz.currentIndex + 1 });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeQuiz, onUpdateDraft]);

  const notesChunks = chunks.filter(
    (c) => c.materialType === "notes" && c.text.trim().length >= 150
  );

  // Only show empty state when there really are no Notes with usable chunks
  if (!activeQuiz && notesChunks.length === 0) {
    const syllabusCount = documents.filter((d) => d.selectedType === "syllabus").length;
    const pastPaperCount = documents.filter((d) => d.selectedType === "past_paper").length;

    const description =
      documents.length > 0
        ? `No Notes in this subject. You have ${syllabusCount} Syllabus and ${pastPaperCount} Past paper. Change a file's type to Notes or upload your chapter notes.`
        : "No Notes in this subject yet. Upload your chapter notes (.pdf, .txt, or .md) to generate a citation-backed diagnostic quiz.";

    return (
      <EmptyState
        title="No Notes in this subject"
        description={description}
        actionLabel="Go to Course Materials"
        onAction={onUploadClick}
      />
    );
  }

  if (!activeQuiz) {
    const relevantChunks = notesChunks.filter((c) => selectedChapters.includes(c.chapterId));
    const factsCount = extractFactsFromNotesChunks(
      relevantChunks.length > 0 ? relevantChunks : notesChunks
    ).length;
    const maxAvailable = Math.max(5, factsCount * 3);
    const requestedSize =
      sizeOption === "custom" ? Math.max(5, customSize) : Number(sizeOption);
    const mix = computeQuizMix(requestedSize, includeTrueFalse, includeShortAnswer);

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <div className="gf-eyebrow">Citation-Backed Assessment</div>
          <h1 className="font-display mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
            Configure Diagnostic Quiz
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Questions are generated strictly from your uploaded notes (&ge;80% Multiple Choice + 20% Fill in the Blank).
          </p>
        </div>

        <div className="gf-panel space-y-5 p-6">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                Chapters ({selectedChapters.length} of {chapters.length} selected)
              </label>
              <div className="space-x-3 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedChapters(chapters.map((c) => c.id))}
                  className="text-emerald-800 dark:text-emerald-400 hover:underline"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChapters([])}
                  className="text-stone-500 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {chapters.map((ch) => {
                const checked = selectedChapters.includes(ch.id);
                return (
                  <label
                    key={ch.id}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      checked
                        ? "border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200"
                        : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedChapters((prev) =>
                          checked ? prev.filter((id) => id !== ch.id) : [...prev, ch.id]
                        )
                      }
                      className="rounded border-stone-300 text-emerald-800 focus:ring-emerald-600"
                    />
                    <span>{ch.title}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Quiz Size (Max available from notes: {maxAvailable})
              </label>
              <select
                value={sizeOption}
                onChange={(e) => setSizeOption(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100"
              >
                {PRESET_SIZES.map((s) => (
                  <option key={s} value={String(s)}>
                    {s} questions (max {maxAvailable} available)
                  </option>
                ))}
                <option value="custom">Custom size (min 5, max {maxAvailable} available)</option>
              </select>
              {sizeOption === "custom" && (
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={customSize}
                  onChange={(e) => setCustomSize(Math.max(5, Number(e.target.value)))}
                  className="mt-2 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1.5 text-sm"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Quiz Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as QuizMode)}
                className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100"
              >
                <option value="Practice">Practice (instant feedback)</option>
                <option value="Exam">Exam (feedback at the end)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Optional Timer (minutes, 0 = untimed)
              </label>
              <input
                type="number"
                min={0}
                max={180}
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/50 px-4 py-2.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
            {mix.total} questions: {mix.mcqCount} MCQ + {mix.blankCount} fill-in
            {mix.trueFalseCount > 0 ? ` + ${mix.trueFalseCount} True/False` : ""}
            {mix.shortAnswerCount > 0 ? ` + ${mix.shortAnswerCount} short answer` : ""}
          </div>

          <div className="border-t border-stone-100 dark:border-stone-800 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800"
            >
              {showAdvanced ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              <span>Advanced question options</span>
            </button>
            {showAdvanced && (
              <div className="mt-2.5 flex flex-wrap gap-4 pl-5 text-xs text-stone-600 dark:text-stone-400">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeTrueFalse}
                    onChange={(e) => setIncludeTrueFalse(e.target.checked)}
                  />
                  <span>Add True/False</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeShortAnswer}
                    onChange={(e) => setIncludeShortAnswer(e.target.checked)}
                  />
                  <span>Add short answer</span>
                </label>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={selectedChapters.length === 0 || isGenerating}
            onClick={() =>
              onStartQuiz({
                chapterIds: selectedChapters,
                size: requestedSize,
                difficulty,
                mode,
                timerMinutes,
                includeTrueFalse,
                includeShortAnswer,
              })
            }
            className="w-full rounded-lg bg-[#244b37] py-2.5 text-sm font-semibold text-white hover:bg-[#193b2a] disabled:opacity-40"
          >
            {isGenerating ? "Generating Questions..." : "Generate Diagnostic Quiz"}
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = activeQuiz.questions[activeQuiz.currentIndex];
  const totalQuestions = activeQuiz.questions.length;
  const answeredCount = activeQuiz.questions.filter((q) => {
    const a = activeQuiz.answers[q.id];
    return (
      typeof a?.selectedOptionIndex === "number" ||
      Boolean(a?.textAnswer && a.textAnswer.trim().length > 0)
    );
  }).length;
  const unansweredCount = totalQuestions - answeredCount;

  const handleAttemptSubmit = () => {
    if (answeredCount === 0) {
      setConfirmWarning(
        "0 questions are answered. Confirming will discard this empty attempt without saving."
      );
      return;
    }
    if (unansweredCount > 0 && !confirmWarning) {
      setConfirmWarning(
        `You have ${unansweredCount} unanswered ${
          unansweredCount === 1 ? "question" : "questions"
        }. Submit anyway?`
      );
      return;
    }
    setConfirmWarning(null);
    onSubmitQuiz(activeQuiz);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Question {activeQuiz.currentIndex + 1} of {totalQuestions} · {activeQuiz.mode} Mode
          </span>
          <div className="mt-1.5 h-2 w-64 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
            <div
              className="h-full bg-emerald-700 transition-all"
              style={{ width: `${((activeQuiz.currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {activeQuiz.timerMinutes > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 px-3 py-1.5 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5" />
            <span>Timer: {activeQuiz.timerMinutes} min</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {activeQuiz.questions.map((q, idx) => {
          const a = activeQuiz.answers[q.id];
          const isAns =
            typeof a?.selectedOptionIndex === "number" ||
            Boolean(a?.textAnswer && a.textAnswer.trim().length > 0);
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onUpdateDraft({ ...activeQuiz, currentIndex: idx })}
              className={`h-7 w-7 rounded text-xs font-bold transition-colors ${
                idx === activeQuiz.currentIndex
                  ? "bg-emerald-900 text-white ring-2 ring-emerald-500"
                  : a?.flagged
                  ? "bg-amber-100 text-amber-900 border border-amber-400"
                  : isAns
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {currentQuestion && (
        <QuizRunner
          question={currentQuestion}
          questionIndex={activeQuiz.currentIndex}
          totalQuestions={totalQuestions}
          mode={activeQuiz.mode}
          answerState={activeQuiz.answers[currentQuestion.id]}
          onSelectOption={(optIdx) => {
            const prev = activeQuiz.answers[currentQuestion.id] || {};
            onUpdateDraft({
              ...activeQuiz,
              answers: {
                ...activeQuiz.answers,
                [currentQuestion.id]: { ...prev, selectedOptionIndex: optIdx },
              },
            });
          }}
          onChangeText={(text) => {
            const prev = activeQuiz.answers[currentQuestion.id] || {};
            onUpdateDraft({
              ...activeQuiz,
              answers: {
                ...activeQuiz.answers,
                [currentQuestion.id]: { ...prev, textAnswer: text },
              },
            });
          }}
          onToggleFlag={() => {
            const prev = activeQuiz.answers[currentQuestion.id] || {};
            onUpdateDraft({
              ...activeQuiz,
              answers: {
                ...activeQuiz.answers,
                [currentQuestion.id]: { ...prev, flagged: !prev.flagged },
              },
            });
          }}
          onCheckPracticeAnswer={() => {
            const prev = activeQuiz.answers[currentQuestion.id] || {};
            onUpdateDraft({
              ...activeQuiz,
              answers: {
                ...activeQuiz.answers,
                [currentQuestion.id]: { ...prev, checked: true },
              },
            });
          }}
        />
      )}

      {confirmWarning && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/60 p-4 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{confirmWarning}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmWarning(null);
                if (answeredCount === 0) {
                  onUpdateDraft(null);
                } else {
                  onSubmitQuiz(activeQuiz);
                }
              }}
              className="rounded-lg bg-amber-900 px-3 py-1.5 font-bold text-white"
            >
              {answeredCount === 0 ? "Discard Empty Quiz" : "Confirm Submit"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmWarning(null)}
              className="rounded-lg border border-amber-400 px-3 py-1.5 font-semibold"
            >
              Continue Quiz
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          disabled={activeQuiz.currentIndex === 0}
          onClick={() =>
            onUpdateDraft({ ...activeQuiz, currentIndex: activeQuiz.currentIndex - 1 })
          }
          className="rounded-lg border border-stone-300 dark:border-stone-700 px-4 py-2 text-xs font-semibold disabled:opacity-40"
        >
          Previous
        </button>

        <div className="flex items-center gap-2.5">
          {activeQuiz.currentIndex < totalQuestions - 1 && (
            <button
              type="button"
              onClick={() =>
                onUpdateDraft({ ...activeQuiz, currentIndex: activeQuiz.currentIndex + 1 })
              }
              className="rounded-lg border border-stone-300 dark:border-stone-700 px-4 py-2 text-xs font-semibold"
            >
              Next
            </button>
          )}
          <button
            type="button"
            onClick={handleAttemptSubmit}
            className="rounded-lg bg-[#244b37] px-5 py-2 text-xs font-semibold text-white hover:bg-[#193b2a]"
          >
            Submit Quiz
          </button>
        </div>
      </div>
    </div>
  );
};
