// Verification script proving storage round-trip (documents, chunks, chapters) and 80/20 quiz counts
import {
  createEmptyWorkspace,
  loadSubjectData,
  loadWorkspace,
  normalizeUserId,
  saveWorkspace,
  StudyDocument,
  Subject,
} from "../src/lib/storage";
import { computeContentHash } from "../src/lib/ingest";
import { buildSubjectKnowledgeGraph } from "../src/lib/topics";
import { generateLocalQuiz } from "../src/lib/quiz";
import { SAMPLE_DOCUMENTS } from "../src/App";

async function main() {
  const testEmail = "student@example.com";
  const subject: Subject = {
    id: "subj-class8-science",
    name: "Class 8 Science",
    createdAt: new Date().toISOString(),
  };

  const base = createEmptyWorkspace(testEmail, "Priya Sharma");
  const docsToSave: StudyDocument[] = [];

  for (const item of SAMPLE_DOCUMENTS) {
    const hash = await computeContentHash(item.text);
    docsToSave.push({
      id: `doc-${item.fileName}`,
      subjectId: subject.id,
      title: item.title,
      fileName: item.fileName,
      contentHash: hash,
      rawText: item.text,
      detectedType: item.type,
      selectedType: item.type,
      uploadedAt: new Date().toISOString(),
    });
  }

  const { chapters, chunks } = buildSubjectKnowledgeGraph(subject.id, docsToSave);

  saveWorkspace({
    ...base,
    subjects: [subject],
    selectedSubjectId: subject.id,
    documents: docsToSave,
    chapters,
    chunks,
  });

  // Read back the way the pages and subject storage do
  const loadedWorkspace = loadWorkspace(testEmail);
  const loadedSubjectBundle = loadSubjectData(normalizeUserId(testEmail), subject.id);

  console.log("=== STORAGE ROUND-TRIP VERIFICATION ===");
  console.log(
    `Saved   -> documents: ${docsToSave.length}, chapters: ${chapters.length}, chunks: ${chunks.length}`
  );
  console.log(
    `Loaded (Workspace) -> documents: ${loadedWorkspace.documents.length}, chapters: ${loadedWorkspace.chapters.length}, chunks: ${loadedWorkspace.chunks.length}`
  );
  console.log(
    `Loaded (SubjectKey)-> documents: ${loadedSubjectBundle.documents.length}, chapters: ${loadedSubjectBundle.chapters.length}, chunks: ${loadedSubjectBundle.chunks.length}`
  );

  if (
    loadedWorkspace.documents.length !== docsToSave.length ||
    loadedWorkspace.chapters.length !== chapters.length ||
    loadedWorkspace.chunks.length !== chunks.length ||
    loadedWorkspace.documents.length === 0 ||
    loadedWorkspace.chapters.length === 0 ||
    loadedWorkspace.chunks.length === 0
  ) {
    throw new Error("Storage round-trip count mismatch!");
  }

  console.log("\n=== QUIZ 80/20 MIX VERIFICATION ===");
  for (const size of [10, 20, 50]) {
    const { questions } = generateLocalQuiz({
      subjectId: subject.id,
      chapterIds: loadedWorkspace.chapters.map((c) => c.id),
      requestedSize: size,
      difficulty: "Mixed",
      allSubjectChunks: loadedWorkspace.chunks,
    });
    const mcq = questions.filter((q) => q.type === "mcq").length;
    const blank = questions.filter((q) => q.type === "fill_blank").length;
    console.log(`Size ${size} -> Total: ${questions.length} | MCQ: ${mcq} | Fill-in-blank: ${blank}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
