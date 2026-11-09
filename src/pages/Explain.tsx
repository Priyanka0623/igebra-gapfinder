// Explain-this-topic study assistant grounded strictly in retrieved BM25 chunks with optional Groq AI mode
import React, { useState, useEffect } from "react";
import { BookOpen, Search } from "lucide-react";
import { ChapterTopic, StudyChunk } from "../lib/storage";
import { answerFromMaterialLocally, GroundedExplanation } from "../lib/assistant";
import { retrieveBM25 } from "../lib/retrieval";
import { requestAiExplanation } from "../lib/ai";
import { EmptyState } from "../components/EmptyState";

interface ExplainProps {
  chapters: ChapterTopic[];
  chunks: StudyChunk[];
  initialChapterId?: string;
  aiMode: boolean;
  onUploadClick: () => void;
}

export const Explain: React.FC<ExplainProps> = ({
  chapters,
  chunks,
  initialChapterId,
  aiMode,
  onUploadClick,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(initialChapterId || "");
  const [query, setQuery] = useState<string>("");
  const [result, setResult] = useState<GroundedExplanation | null>(null);
  const [loading, setLoading] = useState(false);

  const runExplanation = async (searchQuery: string, chapterFilter?: string) => {
    setLoading(true);
    try {
      const localRes = answerFromMaterialLocally(searchQuery, chunks, chapterFilter);
      if (!localRes.foundInMaterial || !aiMode) {
        setResult(localRes);
        return;
      }

      const scopedChunks = chapterFilter
        ? chunks.filter((c) => c.chapterId === chapterFilter)
        : chunks;
      const topChunks = retrieveBM25(searchQuery, scopedChunks, 3).map((h) => h.chunk);
      const aiText = await requestAiExplanation(searchQuery, topChunks);
      if (aiText) {
        setResult({
          answer: aiText,
          citations: localRes.citations,
          foundInMaterial: !aiText.includes("I couldn't find this in your material"),
        });
      } else {
        setResult(localRes);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialChapterId) {
      setSelectedChapterId(initialChapterId);
      const ch = chapters.find((c) => c.id === initialChapterId);
      if (ch) {
        setQuery(ch.title);
        runExplanation(ch.title, ch.id);
      }
    }
  }, [initialChapterId, chapters, chunks]);

  if (chunks.length === 0) {
    return (
      <EmptyState
        title="Upload study notes to use Explain This Topic"
        description="The study assistant answers strictly from your uploaded notes with exact source citations."
        actionLabel="Upload Materials"
        onAction={onUploadClick}
      />
    );
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    runExplanation(query.trim(), selectedChapterId || undefined);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="gf-eyebrow">Citation-Backed Reference · Local BM25 Retrieval</div>
        <h1 className="font-display mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
          Explain This Topic
        </h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Answers are retrieved strictly from your uploaded material. If a topic is not in your notes, it will tell you directly.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="gf-panel flex flex-wrap items-center gap-3 p-4"
      >
        <select
          value={selectedChapterId}
          onChange={(e) => setSelectedChapterId(e.target.value)}
          className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-xs font-semibold text-stone-800 dark:text-stone-200"
        >
          <option value="">All chapters in subject</option>
          {chapters.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.title}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a concept, subtopic, or term from your notes..."
          className="min-w-[240px] flex-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100"
        />

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#244b37] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193b2a] disabled:opacity-50"
        >
          <Search className="h-3.5 w-3.5" />
          {loading ? "Retrieving..." : "Explain from Notes"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {chapters.map((ch) => (
          <button
            key={ch.id}
            type="button"
            disabled={loading}
            onClick={() => {
              setSelectedChapterId(ch.id);
              setQuery(ch.title);
              runExplanation(ch.title, ch.id);
            }}
            className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:border-emerald-600"
          >
            Explain {ch.title}
          </button>
        ))}
      </div>

      {result && (
        <div className="gf-panel space-y-4 p-6">
          <div className="whitespace-pre-line text-sm leading-relaxed text-stone-800 dark:text-stone-200">
            {result.answer}
          </div>

          {result.citations.length > 0 && (
            <div className="border-t border-stone-100 dark:border-stone-800 pt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Retrieved Source Citations ({result.citations.length})
              </div>
              <div className="mt-2 space-y-2">
                {result.citations.map((cit, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg bg-stone-50 dark:bg-stone-800/50 p-3 text-xs text-stone-600 dark:text-stone-400"
                  >
                    <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                    <div>
                      <strong>{cit.docTitle}</strong> · {cit.chapterTitle} ({cit.section})
                      <p className="mt-0.5 text-[11px] italic">&ldquo;{cit.snippet}...&rdquo;</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
