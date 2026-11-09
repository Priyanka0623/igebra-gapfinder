// Active quiz question card with keyboard navigation, flagging, and post-answer citation display
import React from "react";
import { Flag, CheckCircle2, XCircle, BookOpen } from "lucide-react";
import { QuizMode, QuizQuestion } from "../lib/storage";
import { isFillBlankCorrect } from "../lib/evaluate";

interface QuizRunnerProps {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  mode: QuizMode;
  answerState?: {
    selectedOptionIndex?: number;
    textAnswer?: string;
    checked?: boolean;
    flagged?: boolean;
  };
  onSelectOption: (idx: number) => void;
  onChangeText: (text: string) => void;
  onToggleFlag: () => void;
  onCheckPracticeAnswer: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  question,
  questionIndex,
  totalQuestions,
  mode,
  answerState,
  onSelectOption,
  onChangeText,
  onToggleFlag,
  onCheckPracticeAnswer,
}) => {
  const showFeedback = mode === "Practice" && Boolean(answerState?.checked);
  const isAnswered =
    question.type === "mcq"
      ? typeof answerState?.selectedOptionIndex === "number"
      : Boolean(answerState?.textAnswer && answerState.textAnswer.trim().length > 0);

  const isCorrect =
    question.type === "mcq"
      ? answerState?.selectedOptionIndex === question.correctOptionIndex
      : isFillBlankCorrect(answerState?.textAnswer || "", question);

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            {question.chapterTitle}
          </span>
          <span className="rounded-md bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-xs text-stone-600 dark:text-stone-400">
            {question.type === "mcq" ? "Multiple Choice" : "Fill in the Blank"} · {question.difficulty}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          <button
            type="button"
            onClick={onToggleFlag}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
              answerState?.flagged
                ? "border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50"
            }`}
          >
            <Flag className="h-3.5 w-3.5" />
            {answerState?.flagged ? "Flagged" : "Flag for review"}
          </button>
        </div>
      </div>

      <h2 className="mt-5 text-base font-semibold leading-relaxed text-stone-900 dark:text-stone-100">
        {question.prompt}
      </h2>

      {question.type === "mcq" && question.options ? (
        <div className="mt-5 space-y-2.5">
          {question.options.map((opt, idx) => {
            const isSelected = answerState?.selectedOptionIndex === idx;
            const isRightOption = idx === question.correctOptionIndex;

            let styleClass =
              "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-emerald-500";
            if (showFeedback) {
              if (isRightOption) {
                styleClass = "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50";
              } else if (isSelected && !isRightOption) {
                styleClass = "border-red-400 bg-red-50/70 dark:bg-red-950/50";
              }
            } else if (isSelected) {
              styleClass = "border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/40 ring-1 ring-emerald-700";
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={showFeedback}
                onClick={() => onSelectOption(idx)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3.5 text-left text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600 ${styleClass}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-stone-300 dark:border-stone-600 text-xs font-bold text-stone-700 dark:text-stone-300">
                  {idx + 1}
                </span>
                <span className="flex-1 text-stone-800 dark:text-stone-200">{opt}</span>
                {showFeedback && isRightOption && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                )}
                {showFeedback && isSelected && !isRightOption && (
                  <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-5">
          <input
            type="text"
            disabled={showFeedback}
            value={answerState?.textAnswer || ""}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="Type the missing key term..."
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>
      )}

      {mode === "Practice" && !showFeedback && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={!isAnswered}
            onClick={onCheckPracticeAnswer}
            className="rounded-lg bg-emerald-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            Check Answer
          </button>
        </div>
      )}

      {showFeedback && (
        <div
          className={`mt-5 rounded-lg border p-4 text-sm ${
            isCorrect
              ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/40"
              : "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/40"
          }`}
        >
          <div className="font-semibold text-stone-900 dark:text-stone-100">
            {isCorrect ? "Correct!" : `Not quite — Correct answer: ${question.correctAnswerText}`}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
            {question.explanation}
          </p>
          <div className="mt-2.5 flex items-center gap-2 border-t border-stone-200/70 dark:border-stone-800 pt-2 text-[11px] text-stone-500 dark:text-stone-400">
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span>
              Source: <strong>{question.citation.docTitle}</strong> · {question.citation.chapterTitle} ({question.citation.section})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
