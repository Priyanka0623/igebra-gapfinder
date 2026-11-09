// Single source of truth storage layer with IndexedDB + localStorage + in-memory cascade, user+subject keying, and password hashing
export const DATA_VERSION = 3;

export type MaterialType = "syllabus" | "notes" | "past_paper";

export interface StudyChunk {
  id: string;
  docId: string;
  docTitle: string;
  subjectId: string;
  materialType: MaterialType;
  chapterId: string;
  chapterTitle: string;
  subtopicTitle?: string;
  headingPath: string[];
  text: string;
}

export interface PastPaperQuestion {
  id: string;
  docId: string;
  docTitle: string;
  subjectId: string;
  chapterId: string;
  text: string;
  marks?: number;
}

export interface StudyDocument {
  id: string;
  subjectId: string;
  title: string;
  fileName: string;
  contentHash: string;
  rawText: string;
  detectedType: MaterialType;
  selectedType: MaterialType;
  uploadedAt: string;
  isScannedWarning?: boolean;
}

export interface SubtopicItem {
  id: string;
  code: string;
  title: string;
}

export interface ChapterTopic {
  id: string;
  subjectId: string;
  numberLabel: string;
  title: string;
  subtopics: SubtopicItem[];
  pastPaperCount: number;
  pastPaperQuestions: PastPaperQuestion[];
}

export interface Subject {
  id: string;
  name: string;
  isSample?: boolean;
  createdAt: string;
}

export type QuestionType = "mcq" | "fill_blank" | "true_false" | "short_answer";
export type DifficultyLevel = "Easy" | "Medium" | "Hard" | "Mixed";
export type QuizMode = "Practice" | "Exam";

export interface Citation {
  docId: string;
  docTitle: string;
  chapterId: string;
  chapterTitle: string;
  section: string;
  snippet: string;
}

export interface QuizQuestion {
  id: string;
  subjectId: string;
  chapterId: string;
  chapterTitle: string;
  type: QuestionType;
  difficulty: "Easy" | "Medium" | "Hard";
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswerText: string;
  acceptableAnswers?: string[];
  explanation: string;
  citation: Citation;
  factHash: string;
}

export interface QuestionAnswer {
  questionId: string;
  chapterId: string;
  selectedOptionIndex?: number;
  textAnswer?: string;
  isCorrect: boolean;
  flagged?: boolean;
}

export interface QuizAttempt {
  id: string;
  subjectId: string;
  createdAt: string;
  durationSeconds: number;
  mode: QuizMode;
  difficulty: DifficultyLevel;
  chapterIds: string[];
  questions: QuizQuestion[];
  answers: Record<string, QuestionAnswer>;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
}

export interface ActiveQuizDraft {
  subjectId: string;
  mode: QuizMode;
  difficulty: DifficultyLevel;
  timerMinutes: number;
  elapsedSeconds: number;
  chapterIds: string[];
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Record<
    string,
    { selectedOptionIndex?: number; textAnswer?: string; checked?: boolean; flagged?: boolean }
  >;
  startedAt: string;
}

export interface PlanTask {
  id: string;
  day: number;
  chapterId: string;
  chapterTitle: string;
  title: string;
  detail: string;
  minutes: number;
  priorityScore: number;
  done: boolean;
}

export interface RevisionPlanState {
  subjectId: string;
  days: number;
  hoursPerDay: number;
  updatedAt: string;
  changeSummary?: string;
  tasks: PlanTask[];
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  dailyGoalMinutes: number;
}

export interface SubjectDataBundle {
  userId: string;
  subjectId: string;
  documents: StudyDocument[];
  chunks: StudyChunk[];
  chapters: ChapterTopic[];
  attempts: QuizAttempt[];
  plan?: RevisionPlanState;
}

export interface UserWorkspaceData {
  version: number;
  profile: UserProfile;
  subjects: Subject[];
  selectedSubjectId: string;
  documents: StudyDocument[];
  chunks: StudyChunk[];
  chapters: ChapterTopic[];
  attempts: QuizAttempt[];
  activeQuiz: ActiveQuizDraft | null;
  plans: Record<string, RevisionPlanState>;
  knownFlashcards: Record<string, "known" | "review">;
  usedFactHashes: string[];
  activityDates: string[];
}

export interface StoredAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

const VERSION_KEY = "gf_data_version";
const SESSION_KEY = "gf_v3_session_email";
const ACCOUNTS_KEY = "gf_v3_accounts";
const USER_META_PREFIX = "gf_v3_user_";
const SUBJECT_KEY_PREFIX = "gf_v3_subj_";
const IDB_NAME = "gapfinder_idb_v3";
const IDB_STORE = "kv";

// In-memory singleton that survives hot module reloads and works in Node test scripts
const globalScope = globalThis as unknown as {
  __GAPFINDER_MEM_STORE__?: Map<string, string>;
  __GAPFINDER_LISTENERS__?: Set<() => void>;
};
if (!globalScope.__GAPFINDER_MEM_STORE__) {
  globalScope.__GAPFINDER_MEM_STORE__ = new Map<string, string>();
}
if (!globalScope.__GAPFINDER_LISTENERS__) {
  globalScope.__GAPFINDER_LISTENERS__ = new Set<() => void>();
}
const memoryStore = globalScope.__GAPFINDER_MEM_STORE__;
const listeners = globalScope.__GAPFINDER_LISTENERS__;

let storageBlockedFlag = false;

function checkLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__gf_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    storageBlockedFlag = true;
    return false;
  }
}

export function isBrowserStorageBlocked(): boolean {
  if (typeof window === "undefined") return false;
  checkLocalStorageAvailable();
  return storageBlockedFlag;
}

function writeIdbAsync(key: string, value: string): void {
  if (typeof indexedDB === "undefined") return;
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => {
      try {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(value, key);
      } catch {
        // Ignore IDB write error, localStorage/memoryStore already updated
      }
    };
  } catch {
    // IndexedDB unavailable in this environment
  }
}

function deleteIdbAsync(key: string): void {
  if (typeof indexedDB === "undefined") return;
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onsuccess = () => {
      try {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).delete(key);
      } catch {
        // Ignore
      }
    };
  } catch {
    // Ignore
  }
}

function rawGet(key: string): string | null {
  if (checkLocalStorageAvailable()) {
    try {
      const fromLs = window.localStorage.getItem(key);
      if (fromLs !== null) {
        memoryStore.set(key, fromLs);
        return fromLs;
      }
    } catch {
      storageBlockedFlag = true;
    }
  }
  return memoryStore.get(key) ?? null;
}

function rawSet(key: string, value: string): void {
  memoryStore.set(key, value);
  if (checkLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      storageBlockedFlag = true;
    }
  }
  writeIdbAsync(key, value);
}

function rawRemove(key: string): void {
  memoryStore.delete(key);
  if (checkLocalStorageAvailable()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      storageBlockedFlag = true;
    }
  }
  deleteIdbAsync(key);
}

export function ensureStorageVersion(): void {
  try {
    const currentVer = rawGet(VERSION_KEY);
    if (currentVer !== String(DATA_VERSION)) {
      if (checkLocalStorageAvailable()) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && (k.startsWith("gapfinder") || (k.startsWith("gf_") && !k.startsWith("gf_v3_")))) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          window.localStorage.removeItem(k);
        }
      }
      rawSet(VERSION_KEY, String(DATA_VERSION));
    }
  } catch {
    // Never crash on version check
  }
}

export function subscribeWorkspace(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // Ignore listener error
    }
  }
}

export function normalizeUserId(email: string): string {
  return `usr_${email.toLowerCase().trim().replace(/[^a-z0-9@._-]/g, "_")}`;
}

export function makeSubjectStorageKey(userId: string, subjectId: string): string {
  return `${SUBJECT_KEY_PREFIX}${userId}__${subjectId}`;
}

export async function hashPassword(email: string, password: string): Promise<string> {
  const salted = `gf_salt_v3:${email.toLowerCase().trim()}:${password}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoded = new TextEncoder().encode(salted);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 2166136261;
  for (let i = 0; i < salted.length; i++) {
    h ^= salted.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `hash_${(h >>> 0).toString(16)}`;
}

function getRegisteredAccounts(): StoredAccount[] {
  const raw = rawGet(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function registerUserAccount(
  name: string,
  email: string,
  password: string
): Promise<{ ok: true; account: StoredAccount } | { ok: false; error: string }> {
  const cleanName = name.trim();
  const cleanEmail = email.toLowerCase().trim();
  if (cleanName.length < 2) {
    return { ok: false, error: "Please enter your name (at least 2 characters)." };
  }
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters long." };
  }

  const accounts = getRegisteredAccounts();
  if (accounts.some((a) => a.email === cleanEmail)) {
    return { ok: false, error: "An account with this email already exists. Please sign in instead." };
  }

  const passwordHash = await hashPassword(cleanEmail, password);
  const account: StoredAccount = {
    id: normalizeUserId(cleanEmail),
    email: cleanEmail,
    name: cleanName,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  rawSet(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
  const freshWorkspace = createEmptyWorkspace(cleanEmail, cleanName);
  saveWorkspace(freshWorkspace);
  setLoggedInEmail(cleanEmail);
  return { ok: true, account };
}

export async function authenticateUserAccount(
  email: string,
  password: string
): Promise<{ ok: true; account: StoredAccount } | { ok: false; error: string }> {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail || !password) {
    return { ok: false, error: "Please enter both your email and password." };
  }

  const accounts = getRegisteredAccounts();
  const existing = accounts.find((a) => a.email === cleanEmail);
  if (!existing) {
    return {
      ok: false,
      error: "No account found with this email. Please switch to the Register tab to create an account.",
    };
  }

  const candidateHash = await hashPassword(cleanEmail, password);
  if (existing.passwordHash !== candidateHash) {
    return { ok: false, error: "Incorrect password. Please check your password and try again." };
  }

  setLoggedInEmail(cleanEmail);
  return { ok: true, account: existing };
}

export function getLoggedInEmail(): string | null {
  ensureStorageVersion();
  return rawGet(SESSION_KEY);
}

export function setLoggedInEmail(email: string | null): void {
  if (email) {
    rawSet(SESSION_KEY, email.toLowerCase().trim());
  } else {
    rawRemove(SESSION_KEY);
  }
  notifyListeners();
}

// Never create a subject silently on login — new accounts start with 0 subjects
export function createEmptyWorkspace(email: string, name?: string): UserWorkspaceData {
  const cleanEmail = email.toLowerCase().trim();
  const displayName =
    name?.trim() ||
    cleanEmail
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "Student";

  return {
    version: DATA_VERSION,
    profile: {
      id: normalizeUserId(cleanEmail),
      email: cleanEmail,
      name: displayName,
      dailyGoalMinutes: 30,
    },
    subjects: [],
    selectedSubjectId: "",
    documents: [],
    chunks: [],
    chapters: [],
    attempts: [],
    activeQuiz: null,
    plans: {},
    knownFlashcards: {},
    usedFactHashes: [],
    activityDates: [],
  };
}

// Never default to an empty subject when another subject has uploaded files
export function resolveBestSelectedSubjectId(
  subjects: Subject[],
  documents: StudyDocument[],
  currentSelectedId: string
): string {
  if (subjects.length === 0) return "";

  const currentExists = subjects.some((s) => s.id === currentSelectedId);
  const currentDocCount = currentExists
    ? documents.filter((d) => d.subjectId === currentSelectedId).length
    : 0;

  if (currentExists && currentDocCount > 0) {
    return currentSelectedId;
  }

  const firstWithFiles = subjects.find(
    (s) => documents.filter((d) => d.subjectId === s.id).length > 0
  );
  if (firstWithFiles) {
    return firstWithFiles.id;
  }

  return currentExists ? currentSelectedId : subjects[0].id;
}

export function saveSubjectData(
  userId: string,
  subjectId: string,
  bundle: SubjectDataBundle
): void {
  const key = makeSubjectStorageKey(userId, subjectId);
  rawSet(key, JSON.stringify(bundle));
}

export function loadSubjectData(userId: string, subjectId: string): SubjectDataBundle {
  const key = makeSubjectStorageKey(userId, subjectId);
  const raw = rawGet(key);
  if (!raw) {
    return {
      userId,
      subjectId,
      documents: [],
      chunks: [],
      chapters: [],
      attempts: [],
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SubjectDataBundle>;
    return {
      userId,
      subjectId,
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      chunks: Array.isArray(parsed.chunks) ? parsed.chunks : [],
      chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      plan: parsed.plan,
    };
  } catch {
    return {
      userId,
      subjectId,
      documents: [],
      chunks: [],
      chapters: [],
      attempts: [],
    };
  }
}

export function saveWorkspace(data: UserWorkspaceData): void {
  ensureStorageVersion();
  const userId = normalizeUserId(data.profile.email);
  const bestSubjectId = resolveBestSelectedSubjectId(
    data.subjects,
    data.documents,
    data.selectedSubjectId
  );

  // Persist every subject's records keyed identically by (userId, subjectId)
  for (const subj of data.subjects) {
    const bundle: SubjectDataBundle = {
      userId,
      subjectId: subj.id,
      documents: data.documents.filter((d) => d.subjectId === subj.id),
      chunks: data.chunks.filter((c) => c.subjectId === subj.id),
      chapters: data.chapters.filter((c) => c.subjectId === subj.id),
      attempts: data.attempts.filter((a) => a.subjectId === subj.id),
      plan: data.plans[subj.id],
    };
    saveSubjectData(userId, subj.id, bundle);
  }

  const metaToSave: UserWorkspaceData = {
    ...data,
    version: DATA_VERSION,
    selectedSubjectId: bestSubjectId,
  };

  rawSet(`${USER_META_PREFIX}${userId}`, JSON.stringify(metaToSave));
  notifyListeners();
}

export function loadWorkspace(email: string): UserWorkspaceData {
  ensureStorageVersion();
  const userId = normalizeUserId(email);
  const raw = rawGet(`${USER_META_PREFIX}${userId}`);
  if (!raw) {
    const accounts = getRegisteredAccounts();
    const acct = accounts.find((a) => a.email === email.toLowerCase().trim());
    const fresh = createEmptyWorkspace(email, acct?.name);
    saveWorkspace(fresh);
    return fresh;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserWorkspaceData>;
    if (!parsed || parsed.version !== DATA_VERSION || !parsed.profile) {
      const fresh = createEmptyWorkspace(email);
      saveWorkspace(fresh);
      return fresh;
    }

    const subjects = Array.isArray(parsed.subjects) ? parsed.subjects : [];
    const allDocs: StudyDocument[] = [];
    const allChunks: StudyChunk[] = [];
    const allChapters: ChapterTopic[] = [];
    const allAttempts: QuizAttempt[] = [];
    const allPlans: Record<string, RevisionPlanState> = { ...(parsed.plans || {}) };

    // Read every subject's records back using the identical (userId, subjectId) key
    for (const subj of subjects) {
      const bundle = loadSubjectData(userId, subj.id);
      allDocs.push(...bundle.documents);
      allChunks.push(...bundle.chunks);
      allChapters.push(...bundle.chapters);
      allAttempts.push(...bundle.attempts);
      if (bundle.plan) {
        allPlans[subj.id] = bundle.plan;
      }
    }

    const documents = allDocs.length > 0 ? allDocs : Array.isArray(parsed.documents) ? parsed.documents : [];
    const chunks = allChunks.length > 0 ? allChunks : Array.isArray(parsed.chunks) ? parsed.chunks : [];
    const chapters = allChapters.length > 0 ? allChapters : Array.isArray(parsed.chapters) ? parsed.chapters : [];
    const attempts = allAttempts.length > 0 ? allAttempts : Array.isArray(parsed.attempts) ? parsed.attempts : [];

    const selectedSubjectId = resolveBestSelectedSubjectId(
      subjects,
      documents,
      parsed.selectedSubjectId || ""
    );

    return {
      version: DATA_VERSION,
      profile: parsed.profile,
      subjects,
      selectedSubjectId,
      documents,
      chunks,
      chapters,
      attempts,
      activeQuiz: parsed.activeQuiz || null,
      plans: allPlans,
      knownFlashcards: parsed.knownFlashcards || {},
      usedFactHashes: Array.isArray(parsed.usedFactHashes) ? parsed.usedFactHashes : [],
      activityDates: Array.isArray(parsed.activityDates) ? parsed.activityDates : [],
    };
  } catch {
    const fresh = createEmptyWorkspace(email);
    saveWorkspace(fresh);
    return fresh;
  }
}

export function resetAllLocalData(email?: string): void {
  if (email) {
    const userId = normalizeUserId(email);
    const ws = loadWorkspace(email);
    for (const s of ws.subjects) {
      rawRemove(makeSubjectStorageKey(userId, s.id));
    }
    const fresh = createEmptyWorkspace(email, ws.profile.name);
    saveWorkspace(fresh);
  } else {
    memoryStore.clear();
    if (checkLocalStorageAvailable()) {
      window.localStorage.clear();
    }
  }
  notifyListeners();
}

export function recordActivityToday(data: UserWorkspaceData): UserWorkspaceData {
  const today = new Date().toISOString().slice(0, 10);
  if (data.activityDates.includes(today)) return data;
  return {
    ...data,
    activityDates: [...data.activityDates, today].sort(),
  };
}
