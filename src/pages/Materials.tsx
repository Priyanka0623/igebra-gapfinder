// Material upload, auto-detection, type override dropdown, duplicate hash check, and next-step actions
import React, { useState } from "react";
import { FileText, Upload, Trash2, AlertTriangle, Plus, ArrowRight, CheckCircle2 } from "lucide-react";
import { ChapterTopic, MaterialType, StudyChunk, StudyDocument, Subject } from "../lib/storage";
import { RoutePage } from "../components/Sidebar";

interface MaterialsProps {
  subjects: Subject[];
  selectedSubjectId: string;
  documents: StudyDocument[];
  chapters: ChapterTopic[];
  chunks: StudyChunk[];
  onUploadFiles: (files: FileList) => Promise<void>;
  onPasteMaterial: (title: string, text: string) => Promise<void>;
  onChangeMaterialType: (docId: string, newType: MaterialType) => void;
  onRemoveDocument: (docId: string) => void;
  onCreateSubject: (name: string) => void;
  onLoadSample: () => void;
  onRemoveSample: () => void;
  onClearAllMaterials: () => void;
  onNavigate: (page: RoutePage) => void;
}

export const Materials: React.FC<MaterialsProps> = ({
  subjects,
  selectedSubjectId,
  documents,
  chapters,
  chunks,
  onUploadFiles,
  onPasteMaterial,
  onChangeMaterialType,
  onRemoveDocument,
  onCreateSubject,
  onLoadSample,
  onRemoveSample,
  onClearAllMaterials,
  onNavigate,
}) => {
  const [newSubjectName, setNewSubjectName] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const subjectDocs = documents.filter((d) => d.subjectId === selectedSubjectId);
  const hasSampleSubject = subjects.some((s) => s.isSample);
  const isLibraryCompletelyEmpty = documents.length === 0;

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    onCreateSubject(newSubjectName.trim());
    setNewSubjectName("");
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteTitle.trim() || !pasteText.trim()) return;
    await onPasteMaterial(pasteTitle.trim(), pasteText.trim());
    setPasteTitle("");
    setPasteText("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="gf-eyebrow">Study Library &amp; Ingestion</div>
          <h1 className="font-display mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
            Course Materials
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Upload your syllabus, chapter notes, and past papers (.pdf, .txt, .md). Material type is auto-detected and immediately indexed across all steps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isLibraryCompletelyEmpty && !hasSampleSubject && (
            <button
              type="button"
              onClick={onLoadSample}
              className="rounded-lg border border-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-3.5 py-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100"
            >
              Load sample data
            </button>
          )}
          {hasSampleSubject && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 px-3 py-1.5 text-xs">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                Sample loaded
              </span>
              <button
                type="button"
                onClick={onRemoveSample}
                className="text-red-600 underline hover:text-red-700"
              >
                Remove sample
              </button>
            </div>
          )}
          {documents.length > 0 && (
            confirmClear ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/60 px-3 py-1.5 text-xs">
                <span className="font-semibold text-red-800 dark:text-red-200">Confirm clear all?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearAllMaterials();
                    setConfirmClear(false);
                  }}
                  className="font-bold text-red-700 underline"
                >
                  Yes, delete all
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="text-stone-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all materials
              </button>
            )
          )}
        </div>
      </div>

      {subjectDocs.length > 0 && (
        <div className="gf-hero-card flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="relative z-10 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-[#b9ea83]" />
            <div>
              <div className="text-sm font-bold text-white">
                Materials Indexed &amp; Ready: {chapters.length}{" "}
                {chapters.length === 1 ? "Chapter" : "Chapters"} · {chunks.length} Study{" "}
                {chunks.length === 1 ? "Passage" : "Passages"}
              </div>
              <div className="text-xs text-[#d0ddd1]">
                Your Chapter Map, Quick Quiz, Gap Report, Study Plan, Explain Topic, and Flashcards are ready to use.
              </div>
            </div>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate("map")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/25"
            >
              <span>View Chapter Map</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("quiz")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-[#204a35] hover:bg-[#f0f8e9]"
            >
              <span>Start Quick Quiz</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleAddSubject}
        className="gf-panel flex flex-wrap items-center gap-2 p-4"
      >
        <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
          Add Subject:
        </span>
        <input
          type="text"
          placeholder="e.g. Class 8 Science"
          value={newSubjectName}
          onChange={(e) => setNewSubjectName(e.target.value)}
          className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1.5 text-xs text-stone-900 dark:text-stone-100"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-lg bg-[#244b37] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#193b2a]"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Subject
        </button>
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-8 text-center hover:border-emerald-600">
          <Upload className="h-8 w-8 text-emerald-800 dark:text-emerald-400" />
          <span className="mt-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
            Upload PDF, .txt, or .md files
          </span>
          <span className="mt-1 text-xs text-stone-500">
            Material type is auto-detected (Syllabus, Notes, or Past Paper)
          </span>
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onUploadFiles(e.target.files);
                e.target.value = "";
              }
            }}
            className="hidden"
          />
        </label>

        <form onSubmit={handlePasteSubmit} className="gf-panel space-y-3 p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Or Paste Syllabus / Notes Directly
          </div>
          <input
            type="text"
            placeholder="Document title (e.g. Chapter 3 Notes)"
            value={pasteTitle}
            onChange={(e) => setPasteTitle(e.target.value)}
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-xs"
          />
          <textarea
            rows={4}
            placeholder="Paste syllabus chapters, study notes, or past-paper questions..."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 text-xs"
          />
          <button
            type="submit"
            className="rounded-lg bg-[#244b37] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193b2a]"
          >
            Ingest Text Material
          </button>
        </form>
      </div>

      <div className="gf-panel p-5">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          Uploaded Files in Current Subject ({subjectDocs.length})
        </h2>
        {subjectDocs.length === 0 ? (
          <p className="mt-3 text-xs text-stone-500">
            No files uploaded for this subject yet. Upload a file above or click &ldquo;Load sample data&rdquo;.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
            {subjectDocs.map((doc) => (
              <div key={doc.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                <div className="flex items-start gap-3 min-w-0">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800 dark:text-emerald-400" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {doc.title}
                    </div>
                    <div className="mt-0.5 text-xs text-stone-500">
                      Auto-detected as{" "}
                      <strong className="uppercase">{doc.detectedType.replace("_", " ")}</strong> ·{" "}
                      {doc.rawText.length.toLocaleString()} chars
                    </div>
                    {doc.isScannedWarning && (
                      <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>
                          Note: This PDF had minimal selectable text. A chapter entry was created from its filename; for richer questions, paste or upload text notes.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs text-stone-500">
                    Type:
                    <select
                      value={doc.selectedType}
                      onChange={(e) =>
                        onChangeMaterialType(doc.id, e.target.value as MaterialType)
                      }
                      className="ml-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-2.5 py-1 text-xs font-semibold text-stone-800 dark:text-stone-200"
                    >
                      <option value="syllabus">Syllabus</option>
                      <option value="notes">Notes</option>
                      <option value="past_paper">Past Paper</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => onRemoveDocument(doc.id)}
                    aria-label={`Remove ${doc.title}`}
                    className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
