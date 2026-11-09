// Interactive study flashcards generated from weak chapters with flip and Known/Review tracking
import React, { useState } from "react";
import { RotateCw, Check, RefreshCw } from "lucide-react";
import { ChapterGapDiagnostic } from "../lib/gap";
import { extractFactsFromNotesChunks } from "../lib/quiz";
import { StudyChunk } from "../lib/storage";
import { EmptyState } from "../components/EmptyState";

interface FlashcardsProps {
  chunks: StudyChunk[];
  diagnostics: ChapterGapDiagnostic[];
  knownStatus: Record<string, "known" | "review">;
  onMarkCard: (factHash: string, status: "known" | "review") => void;
  onUploadClick: () => void;
}

export const Flashcards: React.FC<FlashcardsProps> = ({
  chunks,
  diagnostics,
  knownStatus,
  onMarkCard,
  onUploadClick,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const weakIds = new Set(
    diagnostics.filter((d) => d.band === "Weak" || d.band === "Medium").map((d) => d.chapterId)
  );
  const prioritizedChunks = [
    ...chunks.filter((c) => weakIds.has(c.chapterId)),
    ...chunks.filter((c) => !weakIds.has(c.chapterId)),
  ];

  const cards = extractFactsFromNotesChunks(prioritizedChunks);

  if (cards.length === 0) {
    return (
      <EmptyState
        title="Upload study notes to generate flashcards"
        description="Flashcards are extracted from key definitions and concepts in your weak chapters."
        actionLabel="Upload Materials"
        onAction={onUploadClick}
      />
    );
  }

  const card = cards[currentIndex % cards.length];
  const status = knownStatus[card.factHash];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
          Active Recall · Weak Chapters First
        </div>
        <h1 className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
          Chapter Flashcards
        </h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Card {(currentIndex % cards.length) + 1} of {cards.length} · Click card to flip.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        className="flex min-h-[240px] w-full flex-col justify-between rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 text-left shadow-xs transition-all hover:border-emerald-600"
      >
        <div className="flex w-full items-center justify-between text-xs text-stone-400">
          <span>{card.chunk.chapterTitle}</span>
          <span className="inline-flex items-center gap-1">
            <RotateCw className="h-3.5 w-3.5" />
            {flipped ? "Definition (Back)" : "Key Term (Front)"}
          </span>
        </div>

        <div className="my-6 text-center">
          {flipped ? (
            <p className="text-base font-medium leading-relaxed text-stone-800 dark:text-stone-200">
              {card.sentence}
            </p>
          ) : (
            <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">
              {card.term}
            </h2>
          )}
        </div>

        <div className="flex w-full items-center justify-between text-[11px] text-stone-400">
          <span>Source: {card.chunk.docTitle}</span>
          {status && (
            <span className="rounded bg-stone-100 dark:bg-stone-800 px-2 py-0.5 font-semibold uppercase">
              {status}
            </span>
          )}
        </div>
      </button>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setFlipped(false);
            setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
          }}
          className="rounded-lg border border-stone-300 dark:border-stone-700 px-4 py-2 text-xs font-semibold"
        >
          Previous
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMarkCard(card.factHash, "review")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Mark for Review
          </button>
          <button
            type="button"
            onClick={() => onMarkCard(card.factHash, "known")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-3.5 py-2 text-xs font-semibold text-white"
          >
            <Check className="h-3.5 w-3.5" />
            Known
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setFlipped(false);
            setCurrentIndex((prev) => (prev + 1) % cards.length);
          }}
          className="rounded-lg border border-stone-300 dark:border-stone-700 px-4 py-2 text-xs font-semibold"
        >
          Next
        </button>
      </div>
    </div>
  );
};
