// Root application layout, subject switcher with file counts, storage subscription, and route coordinator
import React, { useState, useEffect, useCallback } from "react";
import { Moon, Sun, Cpu, RotateCcw, AlertTriangle, FolderSync } from "lucide-react";
import {
  ActiveQuizDraft,
  getLoggedInEmail,
  isBrowserStorageBlocked,
  loadWorkspace,
  MaterialType,
  QuizAttempt,
  recordActivityToday,
  resetAllLocalData,
  resolveBestSelectedSubjectId,
  saveWorkspace,
  StudyDocument,
  Subject,
  subscribeWorkspace,
  setLoggedInEmail,
  UserWorkspaceData,
} from "./lib/storage";
import { buildSubjectKnowledgeGraph } from "./lib/topics";
import { computeContentHash, detectMaterialType, extractTextFromFile } from "./lib/ingest";
import { computeQuizMix, generateLocalQuiz } from "./lib/quiz";
import { evaluateSingleQuestion } from "./lib/evaluate";
import { computeSubjectGapDiagnostics } from "./lib/gap";
import { generateRevisionPlan } from "./lib/plan";
import { checkApiHealth, requestAiQuizQuestions } from "./lib/ai";
import { RoutePage, Sidebar } from "./components/Sidebar";
import { PageSkeleton } from "./components/ErrorBoundary";
import { Toast, ToastMessage } from "./components/Toast";
import { Login } from "./pages/Login";
import { Overview } from "./pages/Overview";
import { Materials } from "./pages/Materials";
import { TopicMap } from "./pages/TopicMap";
import { Quiz } from "./pages/Quiz";
import { Results } from "./pages/Results";
import { GapReport } from "./pages/GapReport";
import { RevisionPlan } from "./pages/RevisionPlan";
import { Explain } from "./pages/Explain";
import { Flashcards } from "./pages/Flashcards";
import { Dashboard } from "./pages/Dashboard";

export const SAMPLE_DOCUMENTS: {
  title: string;
  fileName: string;
  type: MaterialType;
  text: string;
}[] = [
  {
    title: "Class 8 Science Syllabus",
    fileName: "science-syllabus.txt",
    type: "syllabus",
    text: `Chapter 1: Cell Structure and Functions
1.1 Discovery of the Cell
1.2 Cell Membrane and Cytoplasm
1.3 Nucleus and Organelles

Chapter 2: Force and Pressure
2.1 Contact and Non-Contact Forces
2.2 Pressure Exerted by Liquids and Gases
2.3 Atmospheric Pressure

Chapter 3: Sound
3.1 Sound Produced by Vibrating Bodies
3.2 Amplitude, Time Period and Frequency
3.3 Audible and Inaudible Sounds`,
  },
  {
    title: "Class 8 Science Detailed Study Notes",
    fileName: "science-notes.md",
    type: "notes",
    text: `Chapter 1: Cell Structure and Functions
1.1 Discovery of the Cell
The cell is the basic structural and functional unit of all living organisms. Robert Hooke first observed cork cells under a primitive microscope in 1665 and coined the term cell because they resembled small rooms.

1.2 Cell Membrane and Cytoplasm
Cell membrane is the selectively permeable outer boundary that encloses the cytoplasm and regulates the movement of substances in and out of the cell. Plant cells have an additional rigid outer layer called the cell wall made of cellulose that provides structural support. Cytoplasm is the jelly-like fluid present between the cell membrane and the nucleus where organelles are suspended.

1.3 Nucleus and Organelles
Nucleus is the spherical control center of the cell that contains thread-like chromosomes carrying genes for inheritance. Mitochondria are known as the powerhouses of the cell because they generate cellular energy through respiration. Chloroplasts are green plastids containing chlorophyll that capture sunlight to perform photosynthesis in plant cells. Vacuoles are storage sacs that maintain turgor pressure in plant cells.

Chapter 2: Force and Pressure
2.1 Contact and Non-Contact Forces
Force is a push or pull acting upon an object resulting from its interaction with another object, capable of changing its speed, direction, or shape. Friction is a contact force that opposes the relative motion between two surfaces in contact. Electrostatic force is the non-contact force exerted by a charged body on another charged or uncharged body. Gravitational force is the attractive non-contact force with which the Earth pulls all objects toward its center.

2.2 Pressure Exerted by Liquids and Gases
Pressure is defined as the perpendicular force acting per unit area of a surface, calculated as Force divided by Area and measured in Pascals. Decreasing the contact area increases the pressure for a given force, which is why sharp knives cut more effectively than blunt ones. Liquids exert equal pressure at the same depth in all directions, and liquid pressure increases with depth.

2.3 Atmospheric Pressure
Atmospheric pressure is the weight of the air column above a unit area of the Earth's surface. A barometer is a scientific instrument used to measure atmospheric pressure.

Chapter 3: Sound
3.1 Sound Produced by Vibrating Bodies
Sound is a mechanical wave produced by rapid to-and-fro motion or vibration of an object through a medium such as solid, liquid, or gas. Sound cannot travel through a vacuum because there are no particles to propagate the vibrations. In humans, sound is produced by the voice box or larynx located at the upper end of the windpipe.

3.2 Amplitude, Time Period and Frequency
Frequency is the number of complete oscillations or vibrations occurring per second and is expressed in Hertz (Hz). Frequency determines the shrillness or pitch of a sound, where higher frequency produces a higher pitch. Amplitude is the maximum displacement of a vibrating body from its central mean position and determines the loudness of sound. Loudness is proportional to the square of the amplitude of vibration and is measured in decibels (dB).

3.3 Audible and Inaudible Sounds
Audible sound refers to frequencies between 20 Hz and 20,000 Hz that can be detected by the human ear. Ultrasound is sound with frequencies higher than 20,000 Hz, used in medical imaging and echolocation by bats.`,
  },
  {
    title: "Class 8 Science Past Paper 2025",
    fileName: "science-past-paper.txt",
    type: "past_paper",
    text: `Section A
Chapter 1: Cell Structure and Functions
1. Explain why chloroplasts are found only in plant cells and state the role of chlorophyll in photosynthesis. [3 marks]
2. Differentiate between the cell membrane and the cell wall in terms of permeability. [2 marks]

Section B
Chapter 2: Force and Pressure
3. Calculate the pressure exerted when a force of 120 N acts perpendicular to an area of 3 square meters. [3 marks]
4. Why do shoulder bags have broad straps instead of thin straps? Explain using the relation between pressure and area. [2 marks]

Chapter 3: Sound
5. Define frequency and explain how the pitch of a sound changes when vibration frequency increases. [3 marks]
6. Why can sound waves not travel through a vacuum on the Moon? [2 marks]`,
  },
];

export function rebuildSubjectIndex(
  targetSubjectId: string,
  allDocs: StudyDocument[],
  base: UserWorkspaceData
): UserWorkspaceData {
  const { chapters, chunks } = buildSubjectKnowledgeGraph(targetSubjectId, allDocs);
  const otherChapters = base.chapters.filter((c) => c.subjectId !== targetSubjectId);
  const otherChunks = base.chunks.filter((c) => c.subjectId !== targetSubjectId);
  const nextChapters = [...otherChapters, ...chapters];
  const nextChunks = [...otherChunks, ...chunks];

  const subAttempts = base.attempts.filter((a) => a.subjectId === targetSubjectId);
  const diags = computeSubjectGapDiagnostics(chapters, subAttempts);
  const existingPlan = base.plans[targetSubjectId];
  const nextPlan = generateRevisionPlan({
    subjectId: targetSubjectId,
    chapters,
    diagnostics: diags,
    days: existingPlan?.days || 5,
    hoursPerDay: existingPlan?.hoursPerDay || 1.5,
    previousPlan: existingPlan,
  });

  const bestSubjectId = resolveBestSelectedSubjectId(
    base.subjects,
    allDocs,
    targetSubjectId || base.selectedSubjectId
  );

  return {
    ...base,
    selectedSubjectId: bestSubjectId,
    documents: allDocs,
    chapters: nextChapters,
    chunks: nextChunks,
    plans: { ...base.plans, [targetSubjectId]: nextPlan },
  };
}

export const App: React.FC = () => {
  const [sessionEmail, setSessionEmail] = useState<string | null>(() => getLoggedInEmail());
  const [workspace, setWorkspace] = useState<UserWorkspaceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<RoutePage>("overview");
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null>(null);
  const [preselectedQuizChapters, setPreselectedQuizChapters] = useState<string[] | undefined>(
    undefined
  );
  const [explainChapterId, setExplainChapterId] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);

  const syncFromStorage = useCallback((email: string | null) => {
    if (!email) {
      setWorkspace(null);
      setIsLoading(false);
      return;
    }
    let loaded = loadWorkspace(email);
    for (const subj of loaded.subjects) {
      if (loaded.documents.some((d) => d.subjectId === subj.id)) {
        loaded = rebuildSubjectIndex(subj.id, loaded.documents, loaded);
      }
    }
    setWorkspace(loaded);
    setStorageBlocked(isBrowserStorageBlocked());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    syncFromStorage(sessionEmail);
    const unsub = subscribeWorkspace(() => {
      const currentEmail = getLoggedInEmail();
      if (currentEmail) {
        setWorkspace(loadWorkspace(currentEmail));
      }
    });
    return unsub;
  }, [sessionEmail, syncFromStorage]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    checkApiHealth().then((status) => setAiMode(status.aiMode));
  }, []);

  const notify = useCallback((text: string, tone: "success" | "info" | "error" = "success") => {
    setToast({ id: String(Date.now()), text, tone });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 3400);
  }, []);

  const updateWorkspace = useCallback(
    (updater: (prev: UserWorkspaceData) => UserWorkspaceData) => {
      setWorkspace((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        saveWorkspace(next);
        return next;
      });
    },
    []
  );

  if (!sessionEmail) {
    return (
      <Login
        onLoginSuccess={(email, name) => {
          let loaded = loadWorkspace(email);
          if (name) loaded.profile.name = name;
          for (const subj of loaded.subjects) {
            if (loaded.documents.some((d) => d.subjectId === subj.id)) {
              loaded = rebuildSubjectIndex(subj.id, loaded.documents, loaded);
            }
          }
          saveWorkspace(loaded);
          setSessionEmail(email);
          setWorkspace(loaded);
          setIsLoading(false);
          setActivePage("overview");
        }}
      />
    );
  }

  if (isLoading || !workspace) {
    return (
      <div className="min-h-screen bg-[#f6f7f5] p-8">
        <PageSkeleton />
      </div>
    );
  }

  // Ensure a target subject exists when uploading a file if the user has not created one yet
  const ensureTargetSubject = (
    base: UserWorkspaceData,
    fallbackName = "General Study"
  ): { updatedBase: UserWorkspaceData; targetSubject: Subject } => {
    const existing = base.subjects.find((s) => s.id === base.selectedSubjectId) || base.subjects[0];
    if (existing) {
      return { updatedBase: base, targetSubject: existing };
    }
    const created: Subject = {
      id: `subj-${Date.now()}`,
      name: fallbackName,
      createdAt: new Date().toISOString(),
    };
    const updatedBase: UserWorkspaceData = {
      ...base,
      subjects: [created],
      selectedSubjectId: created.id,
    };
    return { updatedBase, targetSubject: created };
  };

  const currentSubject: Subject | undefined =
    workspace.subjects.find((s) => s.id === workspace.selectedSubjectId) || workspace.subjects[0];

  const subjectDocs = currentSubject
    ? workspace.documents.filter((d) => d.subjectId === currentSubject.id)
    : [];
  const otherSubjectDocs = currentSubject
    ? workspace.documents.filter((d) => d.subjectId !== currentSubject.id)
    : workspace.documents;
  const subjectChapters = currentSubject
    ? workspace.chapters.filter((c) => c.subjectId === currentSubject.id)
    : [];
  const subjectChunks = currentSubject
    ? workspace.chunks.filter((c) => c.subjectId === currentSubject.id)
    : [];
  const subjectAttempts = currentSubject
    ? workspace.attempts.filter((a) => a.subjectId === currentSubject.id)
    : [];
  const diagnostics = computeSubjectGapDiagnostics(subjectChapters, subjectAttempts);
  const weakCount = diagnostics.filter((d) => d.band === "Weak").length;
  const currentPlan = currentSubject ? workspace.plans[currentSubject.id] : undefined;

  const handleUploadFiles = async (files: FileList) => {
    const { updatedBase, targetSubject } = ensureTargetSubject(workspace);
    const newDocs: StudyDocument[] = [];
    let skippedDuplicates = 0;

    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) {
        notify(`"${file.name}" exceeds the 25 MB limit and was skipped.`, "error");
        continue;
      }
      try {
        const { text, isScannedWarning } = await extractTextFromFile(file);
        const effectiveText =
          text.trim().length > 0
            ? text
            : `Chapter 1: ${file.name.replace(/\.[^.]+$/, "")}\nStudy material from ${file.name}.`;
        const hash = await computeContentHash(`${effectiveText}::${targetSubject.id}`);
        const isDup =
          updatedBase.documents.some(
            (d) => d.subjectId === targetSubject.id && d.contentHash === hash
          ) || newDocs.some((d) => d.contentHash === hash);

        if (isDup) {
          skippedDuplicates += 1;
          continue;
        }

        const detected = detectMaterialType(effectiveText, file.name);
        newDocs.push({
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          subjectId: targetSubject.id,
          title: file.name.replace(/\.[^.]+$/, ""),
          fileName: file.name,
          contentHash: hash,
          rawText: effectiveText,
          detectedType: detected,
          selectedType: detected,
          uploadedAt: new Date().toISOString(),
          isScannedWarning,
        });
      } catch {
        notify(`Could not parse "${file.name}". Please upload a valid PDF, .txt, or .md file.`, "error");
      }
    }

    if (newDocs.length === 0 && skippedDuplicates > 0) {
      notify("Already uploaded: duplicate file content was blocked.", "error");
      return;
    }

    if (newDocs.length > 0) {
      updateWorkspace((prev) => {
        const { updatedBase: latestBase, targetSubject: tgt } = ensureTargetSubject(prev);
        const allDocs = [...latestBase.documents, ...newDocs.map((d) => ({ ...d, subjectId: tgt.id }))];
        const indexed = rebuildSubjectIndex(tgt.id, allDocs, {
          ...latestBase,
          selectedSubjectId: tgt.id,
        });
        return recordActivityToday({ ...indexed, selectedSubjectId: tgt.id });
      });
      notify(
        `Uploaded ${newDocs.length} ${newDocs.length === 1 ? "file" : "files"} into "${
          targetSubject.name
        }".`
      );
    }
  };

  const handlePasteMaterial = async (title: string, rawText: string) => {
    const { updatedBase, targetSubject } = ensureTargetSubject(workspace);
    const hash = await computeContentHash(`${rawText}::${targetSubject.id}`);
    if (
      updatedBase.documents.some(
        (d) => d.subjectId === targetSubject.id && d.contentHash === hash
      )
    ) {
      notify(`"${title}" is already uploaded in this subject.`, "error");
      return;
    }
    const detected = detectMaterialType(rawText, `${title}.txt`);
    const newDoc: StudyDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subjectId: targetSubject.id,
      title,
      fileName: `${title}.txt`,
      contentHash: hash,
      rawText,
      detectedType: detected,
      selectedType: detected,
      uploadedAt: new Date().toISOString(),
    };
    updateWorkspace((prev) => {
      const { updatedBase: latestBase, targetSubject: tgt } = ensureTargetSubject(prev);
      const nextDocs = [...latestBase.documents, { ...newDoc, subjectId: tgt.id }];
      const indexed = rebuildSubjectIndex(tgt.id, nextDocs, {
        ...latestBase,
        selectedSubjectId: tgt.id,
      });
      return recordActivityToday({ ...indexed, selectedSubjectId: tgt.id });
    });
    notify(`Indexed "${title}" (${detected.replace("_", " ")}).`);
  };

  const handleMoveFilesToCurrentSubject = () => {
    if (!currentSubject || otherSubjectDocs.length === 0) return;
    updateWorkspace((prev) => {
      const movedDocs = prev.documents.map((d) => ({
        ...d,
        subjectId: currentSubject.id,
      }));
      return rebuildSubjectIndex(currentSubject.id, movedDocs, {
        ...prev,
        selectedSubjectId: currentSubject.id,
      });
    });
    notify(`Moved ${otherSubjectDocs.length} files to "${currentSubject.name}".`);
  };

  const handleLoadSample = async () => {
    const sampleSubject: Subject = {
      id: "subj-sample",
      name: "Class 8 Science (Sample)",
      isSample: true,
      createdAt: new Date().toISOString(),
    };

    const builtDocs: StudyDocument[] = [];
    for (const item of SAMPLE_DOCUMENTS) {
      const hash = await computeContentHash(item.text);
      builtDocs.push({
        id: `doc-sample-${item.fileName}`,
        subjectId: sampleSubject.id,
        title: item.title,
        fileName: item.fileName,
        contentHash: hash,
        rawText: item.text,
        detectedType: item.type,
        selectedType: item.type,
        uploadedAt: new Date().toISOString(),
      });
    }

    updateWorkspace((prev) => {
      const filteredSubjects = prev.subjects.filter((s) => !s.isSample);
      const nextBase: UserWorkspaceData = {
        ...prev,
        subjects: [...filteredSubjects, sampleSubject],
        selectedSubjectId: sampleSubject.id,
      };
      return rebuildSubjectIndex(
        sampleSubject.id,
        [...prev.documents.filter((d) => d.subjectId !== sampleSubject.id), ...builtDocs],
        nextBase
      );
    });
    notify("Sample subject loaded with syllabus, study notes, and past paper.");
  };

  const handleRemoveSample = () => {
    updateWorkspace((prev) => {
      const sampleIds = new Set(prev.subjects.filter((s) => s.isSample).map((s) => s.id));
      const remainingSubjects = prev.subjects.filter((s) => !s.isSample);
      const remainingDocs = prev.documents.filter((d) => !sampleIds.has(d.subjectId));
      const nextSelected = resolveBestSelectedSubjectId(
        remainingSubjects,
        remainingDocs,
        remainingSubjects[0]?.id || ""
      );
      return {
        ...prev,
        subjects: remainingSubjects,
        selectedSubjectId: nextSelected,
        documents: remainingDocs,
        chapters: prev.chapters.filter((c) => !sampleIds.has(c.subjectId)),
        chunks: prev.chunks.filter((c) => !sampleIds.has(c.subjectId)),
        attempts: prev.attempts.filter((a) => !sampleIds.has(a.subjectId)),
      };
    });
    notify("Removed sample subject and materials.");
  };

  return (
    <div className="min-h-screen bg-[#f6f7f5] dark:bg-stone-950 text-[#202a25] dark:text-stone-100">
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => {
          setPreselectedQuizChapters(undefined);
          setActivePage(page);
        }}
        profile={workspace.profile}
        weakCount={weakCount}
        streakDays={workspace.activityDates.length}
        onLogout={() => {
          setLoggedInEmail(null);
          setSessionEmail(null);
          setWorkspace(null);
        }}
      />

      <div className="pl-[246px] max-md:pl-16">
        {storageBlocked && (
          <div className="bg-amber-100 dark:bg-amber-950 border-b border-amber-300 px-6 py-2 text-xs font-medium text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Browser storage is unavailable in this preview, so data will be lost on reload. Open the app in a normal browser tab.
            </span>
          </div>
        )}

        <header className="no-print sticky top-0 z-20 flex flex-wrap min-h-16 items-center justify-between gap-3 border-b border-[#eaede9] dark:border-stone-800 bg-white/85 dark:bg-stone-900/90 px-8 py-2 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold text-[#78817b]">
              Subject:
              {workspace.subjects.length === 0 ? (
                <span className="ml-2 rounded-lg border border-[#e5e9e4] dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-500">
                  No subjects yet (0 files)
                </span>
              ) : (
                <select
                  value={currentSubject?.id || ""}
                  onChange={(e) =>
                    updateWorkspace((prev) => ({
                      ...prev,
                      selectedSubjectId: e.target.value,
                      activeQuiz: null,
                    }))
                  }
                  className="ml-2 rounded-lg border border-[#e5e9e4] dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1.5 text-xs font-bold text-[#202a25] dark:text-stone-100"
                >
                  {workspace.subjects.map((s) => {
                    const count = workspace.documents.filter((d) => d.subjectId === s.id).length;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({count} {count === 1 ? "file" : "files"})
                      </option>
                    );
                  })}
                </select>
              )}
            </label>

            {currentSubject && subjectDocs.length === 0 && otherSubjectDocs.length > 0 && (
              <button
                type="button"
                onClick={handleMoveFilesToCurrentSubject}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100"
              >
                <FolderSync className="h-3.5 w-3.5" />
                Move these files to the selected subject ({otherSubjectDocs.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e9e4] dark:border-stone-700 bg-[#f6f7f5] dark:bg-stone-800 px-2.5 py-1 text-[11px] font-semibold text-[#4f5952] dark:text-stone-300">
              <Cpu className="h-3.5 w-3.5 text-[#214f3a] dark:text-emerald-400" />
              {aiMode ? "AI mode" : "Local mode"}
            </span>

            {confirmReset ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-xs">
                <span className="font-semibold text-red-800">Reset local data?</span>
                <button
                  type="button"
                  onClick={() => {
                    resetAllLocalData(sessionEmail);
                    setWorkspace(loadWorkspace(sessionEmail));
                    setConfirmReset(false);
                    notify("Local data has been reset.");
                  }}
                  className="font-bold text-red-700 underline"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="text-stone-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                title="Reset local data"
                className="inline-flex items-center gap-1 rounded-lg border border-[#e5e9e4] dark:border-stone-700 px-2.5 py-1.5 text-[11px] font-semibold text-[#758078] dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset local data</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle color theme"
              className="rounded-lg border border-[#e5e9e4] dark:border-stone-700 p-2 text-[#758078] dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl p-6 sm:p-8">
          {activePage === "overview" && (
            <Overview
              profile={workspace.profile}
              subjectName={currentSubject?.name || "No Subject Selected"}
              documents={subjectDocs}
              chapters={subjectChapters}
              diagnostics={diagnostics}
              attempts={subjectAttempts}
              activeQuiz={
                currentSubject && workspace.activeQuiz?.subjectId === currentSubject.id
                  ? workspace.activeQuiz
                  : null
              }
              todayTasks={currentPlan?.tasks.filter((t) => t.day === 1) || []}
              activityDates={workspace.activityDates}
              onNavigate={setActivePage}
              onPracticeChapter={(chId) => {
                setPreselectedQuizChapters([chId]);
                setActivePage("quiz");
              }}
              onToggleTask={(taskId) => {
                if (!currentPlan || !currentSubject) return;
                updateWorkspace((prev) => ({
                  ...prev,
                  plans: {
                    ...prev.plans,
                    [currentSubject.id]: {
                      ...currentPlan,
                      tasks: currentPlan.tasks.map((t) =>
                        t.id === taskId ? { ...t, done: !t.done } : t
                      ),
                    },
                  },
                }));
              }}
              onLoadSampleData={handleLoadSample}
              isLibraryEmpty={workspace.documents.length === 0}
            />
          )}

          {activePage === "materials" && (
            <Materials
              subjects={workspace.subjects}
              selectedSubjectId={currentSubject?.id || ""}
              documents={workspace.documents}
              chapters={subjectChapters}
              chunks={subjectChunks}
              onUploadFiles={handleUploadFiles}
              onPasteMaterial={handlePasteMaterial}
              onChangeMaterialType={(docId, newType) => {
                if (!currentSubject) return;
                updateWorkspace((prev) => {
                  const updatedDocs = prev.documents.map((d) =>
                    d.id === docId ? { ...d, selectedType: newType } : d
                  );
                  return rebuildSubjectIndex(currentSubject.id, updatedDocs, prev);
                });
                notify(
                  `Updated material type to ${newType.replace("_", " ")} and re-indexed chapters.`
                );
              }}
              onRemoveDocument={(docId) => {
                if (!currentSubject) return;
                updateWorkspace((prev) => {
                  const updatedDocs = prev.documents.filter((d) => d.id !== docId);
                  return rebuildSubjectIndex(currentSubject.id, updatedDocs, prev);
                });
                notify("Removed document.");
              }}
              onCreateSubject={(name) => {
                const created: Subject = {
                  id: `subj-${Date.now()}`,
                  name,
                  createdAt: new Date().toISOString(),
                };
                updateWorkspace((prev) => ({
                  ...prev,
                  subjects: [...prev.subjects, created],
                  selectedSubjectId: created.id,
                }));
                notify(`Created subject "${name}".`);
              }}
              onLoadSample={handleLoadSample}
              onRemoveSample={handleRemoveSample}
              onClearAllMaterials={() => {
                updateWorkspace((prev) => ({
                  ...prev,
                  documents: [],
                  chapters: [],
                  chunks: [],
                  activeQuiz: null,
                  plans: {},
                }));
                notify("Cleared all materials.");
              }}
              onNavigate={setActivePage}
            />
          )}

          {activePage === "map" && (
            <TopicMap
              chapters={subjectChapters}
              diagnostics={diagnostics}
              onUploadClick={() => setActivePage("materials")}
            />
          )}

          {activePage === "quiz" && (
            <Quiz
              documents={subjectDocs}
              chapters={subjectChapters}
              chunks={subjectChunks}
              activeQuiz={
                currentSubject && workspace.activeQuiz?.subjectId === currentSubject.id
                  ? workspace.activeQuiz
                  : null
              }
              preselectedChapterIds={preselectedQuizChapters}
              isGenerating={isGeneratingQuiz}
              onStartQuiz={async (cfg) => {
                if (!currentSubject || isGeneratingQuiz) return;
                setIsGeneratingQuiz(true);
                try {
                  const localResult = generateLocalQuiz({
                    subjectId: currentSubject.id,
                    chapterIds: cfg.chapterIds,
                    requestedSize: cfg.size,
                    difficulty: cfg.difficulty,
                    includeTrueFalse: cfg.includeTrueFalse,
                    includeShortAnswer: cfg.includeShortAnswer,
                    allSubjectChunks: subjectChunks,
                    usedFactHashes: workspace.usedFactHashes,
                  });

                  let finalQuestions = localResult.questions;
                  if (aiMode && finalQuestions.length > 0) {
                    const mix = computeQuizMix(
                      cfg.size,
                      cfg.includeTrueFalse,
                      cfg.includeShortAnswer
                    );
                    const relevantChunks = subjectChunks.filter(
                      (c) => cfg.chapterIds.includes(c.chapterId) && c.materialType === "notes"
                    );
                    const aiQs = await requestAiQuizQuestions({
                      subjectId: currentSubject.id,
                      chunks: relevantChunks,
                      mcqCount: mix.mcqCount,
                      blankCount: mix.blankCount,
                      difficulty: cfg.difficulty,
                    });
                    if (aiQs && aiQs.length >= 5) {
                      finalQuestions = aiQs;
                    }
                  }

                  if (finalQuestions.length === 0) {
                    notify(
                      localResult.reducedNotice ||
                        "No Notes passages of at least 150 characters were found.",
                      "error"
                    );
                    return;
                  }
                  if (localResult.reducedNotice) {
                    notify(localResult.reducedNotice, "info");
                  }

                  const draft: ActiveQuizDraft = {
                    subjectId: currentSubject.id,
                    mode: cfg.mode,
                    difficulty: cfg.difficulty,
                    timerMinutes: cfg.timerMinutes,
                    elapsedSeconds: 0,
                    chapterIds: cfg.chapterIds,
                    questions: finalQuestions,
                    currentIndex: 0,
                    answers: {},
                    startedAt: new Date().toISOString(),
                  };
                  updateWorkspace((prev) => ({ ...prev, activeQuiz: draft }));
                } finally {
                  setIsGeneratingQuiz(false);
                }
              }}
              onUpdateDraft={(draft) =>
                updateWorkspace((prev) => ({ ...prev, activeQuiz: draft }))
              }
              onSubmitQuiz={(draft) => {
                if (!currentSubject) return;
                const evaluatedAnswers: QuizAttempt["answers"] = {};
                let correctCount = 0;
                for (const q of draft.questions) {
                  const ans = evaluateSingleQuestion(q, draft.answers[q.id]);
                  evaluatedAnswers[q.id] = ans;
                  if (ans.isCorrect) correctCount += 1;
                }
                const scorePercent = Math.round((correctCount / draft.questions.length) * 100);
                const durationSeconds = Math.max(
                  10,
                  Math.round((Date.now() - new Date(draft.startedAt).getTime()) / 1000)
                );
                const attempt: QuizAttempt = {
                  id: `att-${Date.now()}`,
                  subjectId: currentSubject.id,
                  createdAt: new Date().toISOString(),
                  durationSeconds,
                  mode: draft.mode,
                  difficulty: draft.difficulty,
                  chapterIds: draft.chapterIds,
                  questions: draft.questions,
                  answers: evaluatedAnswers,
                  scorePercent,
                  correctCount,
                  totalQuestions: draft.questions.length,
                };

                updateWorkspace((prev) => {
                  const nextAttempts = [...prev.attempts, attempt];
                  const subAttempts = nextAttempts.filter((a) => a.subjectId === currentSubject.id);
                  const nextDiags = computeSubjectGapDiagnostics(subjectChapters, subAttempts);
                  const existingPlan = prev.plans[currentSubject.id];
                  const updatedPlan = generateRevisionPlan({
                    subjectId: currentSubject.id,
                    chapters: subjectChapters,
                    diagnostics: nextDiags,
                    days: existingPlan?.days || 5,
                    hoursPerDay: existingPlan?.hoursPerDay || 1.5,
                    previousPlan: existingPlan,
                  });
                  const newHashes = draft.questions.map((q) => q.factHash);
                  return recordActivityToday({
                    ...prev,
                    attempts: nextAttempts,
                    activeQuiz: null,
                    plans: { ...prev.plans, [currentSubject.id]: updatedPlan },
                    usedFactHashes: Array.from(new Set([...prev.usedFactHashes, ...newHashes])),
                  });
                });

                setLatestAttempt(attempt);
                setActivePage("results");
                notify(`Quiz submitted! You scored ${scorePercent}%. Study plan updated.`);
              }}
              onUploadClick={() => setActivePage("materials")}
            />
          )}

          {activePage === "results" && (
            <Results
              attempt={latestAttempt || subjectAttempts.at(-1) || null}
              chapters={subjectChapters}
              onStartAnotherQuiz={() => {
                setPreselectedQuizChapters(undefined);
                setActivePage("quiz");
              }}
              onRetryWrongQuestions={(att) => {
                if (!currentSubject) return;
                const wrongQs = att.questions.filter((q) => !att.answers[q.id]?.isCorrect);
                if (wrongQs.length === 0) return;
                const retryDraft: ActiveQuizDraft = {
                  subjectId: currentSubject.id,
                  mode: "Practice",
                  difficulty: att.difficulty,
                  timerMinutes: 0,
                  elapsedSeconds: 0,
                  chapterIds: att.chapterIds,
                  questions: wrongQs,
                  currentIndex: 0,
                  answers: {},
                  startedAt: new Date().toISOString(),
                };
                updateWorkspace((prev) => ({ ...prev, activeQuiz: retryDraft }));
                setActivePage("quiz");
              }}
              onOpenGapReport={() => setActivePage("report")}
            />
          )}

          {activePage === "report" && (
            <GapReport
              subjectName={currentSubject?.name || "Subject"}
              chapters={subjectChapters}
              diagnostics={diagnostics}
              attempts={subjectAttempts}
              onPracticeChapter={(chId) => {
                setPreselectedQuizChapters([chId]);
                setActivePage("quiz");
              }}
              onExplainChapter={(chId) => {
                setExplainChapterId(chId);
                setActivePage("explain");
              }}
              onStartQuiz={() => setActivePage("quiz")}
              onUploadClick={() => setActivePage("materials")}
            />
          )}

          {activePage === "plan" && (
            <RevisionPlan
              plan={currentPlan}
              hasChapters={subjectChapters.length > 0}
              onUpdatePlanConfig={(days, hoursPerDay) => {
                if (!currentSubject) return;
                const updated = generateRevisionPlan({
                  subjectId: currentSubject.id,
                  chapters: subjectChapters,
                  diagnostics,
                  days,
                  hoursPerDay,
                  previousPlan: currentPlan,
                });
                updateWorkspace((prev) => ({
                  ...prev,
                  plans: { ...prev.plans, [currentSubject.id]: updated },
                }));
                notify("Revision plan regenerated.");
              }}
              onToggleTask={(taskId) => {
                if (!currentPlan || !currentSubject) return;
                updateWorkspace((prev) => ({
                  ...prev,
                  plans: {
                    ...prev.plans,
                    [currentSubject.id]: {
                      ...currentPlan,
                      tasks: currentPlan.tasks.map((t) =>
                        t.id === taskId ? { ...t, done: !t.done } : t
                      ),
                    },
                  },
                }));
              }}
              onPracticeChapter={(chId) => {
                setPreselectedQuizChapters([chId]);
                setActivePage("quiz");
              }}
              onUploadClick={() => setActivePage("materials")}
            />
          )}

          {activePage === "explain" && (
            <Explain
              chapters={subjectChapters}
              chunks={subjectChunks}
              initialChapterId={explainChapterId}
              aiMode={aiMode}
              onUploadClick={() => setActivePage("materials")}
            />
          )}

          {activePage === "flashcards" && (
            <Flashcards
              chunks={subjectChunks}
              diagnostics={diagnostics}
              knownStatus={workspace.knownFlashcards}
              onMarkCard={(factHash, status) => {
                updateWorkspace((prev) => ({
                  ...prev,
                  knownFlashcards: { ...prev.knownFlashcards, [factHash]: status },
                }));
              }}
              onUploadClick={() => setActivePage("materials")}
            />
          )}

          {activePage === "dashboard" && (
            <Dashboard chapters={subjectChapters} attempts={subjectAttempts} />
          )}
        </main>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
