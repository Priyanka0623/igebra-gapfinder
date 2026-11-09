# GapFinder AI — Diagnose What You Don't Know

GapFinder AI is a diagnostic study platform built for the igebra.ai AI Intern assignment (Hackathon PS 2026: *"find what the student doesn't know"*). Students upload their own syllabus, chapter notes, and past papers to generate a chapter map, take citation-backed diagnostic quizzes, receive a deterministic chapter-level gap report, follow an adaptive revision plan, and query a grounded Explain-this-topic assistant.

---

## Features

1. **Account Registration & Per-User Subject Storage**
   - Reviewers and students create an account on the **Register** tab (`Full Name`, `Email`, `Password` with SHA-256 salted password hashing and persistent session state).
   - Storage cascades cleanly across `IndexedDB` -> `localStorage` -> in-memory singleton (`src/lib/storage.ts`), keyed identically by `userId` and `subjectId` for all reads and writes.
   - Includes automatic data-version migration, blocked-storage detection for sandboxed iframes, a subject switcher showing exact file counts (e.g. `Class 8 Science (3 files)`), and a **Reset local data** button.

2. **Course Materials & Auto-Detection (`src/lib/ingest.ts`)**
   - Supports `.pdf` (via bundled `pdfjs-dist` worker), `.txt`, and `.md` uploads as well as direct text paste.
   - Automatically classifies each document as **Syllabus**, **Notes**, or **Past Paper** with an editable dropdown to override and re-index on the fly.
   - Blocks duplicate uploads using SHA-256 content hashes.
   - Includes a one-click **Load sample data** option when the library is empty (with **Remove sample** and **Clear all materials** confirmation).

3. **Chapter Map & Past-Paper Linking (`src/lib/topics.ts`)**
   - Extracts top-level Chapters/Units and nested numbered subtopics (`1.1`, `1.2`, etc.) while ignoring title/metadata lines, past-paper section headers (`Section A`), and question lines.
   - Links past-paper questions to chapters to compute exam frequency (`Times Asked in Past Papers`).

4. **MCQ-First Diagnostic Quiz (`src/lib/quiz.ts`)**
   - Enforces a fixed **80% Multiple Choice + 20% Fill-in-the-Blank** ratio (`10 = 8 + 2`, `20 = 16 + 4`, `50 = 40 + 10`), with optional True/False and Short Answer toggles inside a collapsed **Advanced** panel.
   - Generates questions strictly from **Notes** passages of at least 150 characters, with 4 plausible shuffled options and source citations (`Document`, `Chapter`, `Section`) revealed **after** answering.
   - Includes one-question-per-page navigation, keyboard shortcuts (`1`–`4`, `Enter`), question flagging, Practice (instant feedback) vs. Exam (end feedback) modes, optional timer, auto-saved drafts, and empty-submission protection.

5. **Results, Deterministic Gap Report & Progress Charts (`src/lib/gap.ts`, `src/components/Charts.tsx`)**
   - **Deterministic Classification**:
     - **Weak (Red)**: `< 50%`
     - **Medium (Yellow)**: `50% – 79%`
     - **Strong (Green)**: `80%+`
     - **Low confidence**: `< 2` answered questions in a chapter
   - **Gap Report**: Ranks tested chapters weakest-first with written diagnostic reasons, expandable mistake reviews, print stylesheet support, and **Practice this chapter** / **Explain this chapter** actions.
   - **Recharts Visualizations**: Overall score trend area chart (with 50% and 80% dashed reference lines) and a per-chapter bar comparison chart (latest 3 attempts, max 5 series), plus a longitudinal Chapter × Attempt matrix with point-change indicators.

6. **Dynamic Revision Plan, Flashcards & Grounded Explain Assistant (`src/lib/plan.ts`, `src/lib/assistant.ts`)**
   - **Revision Plan**: Prioritizes chapters by `Weakness × Exam Importance`, breaks study sessions into a day-by-day checklist, and automatically updates after each quiz attempt.
   - **Flashcards**: Interactive flip cards prioritized from weak chapters with Known / Mark for Review tracking.
   - **Explain This Topic**: Answers strictly from retrieved material chunks with citations, replying `"I couldn't find this in your material."` when a concept is absent from the notes.

---

## Tech Stack

- **Frontend**: React 19, TypeScript 5.7, Vite 6, Tailwind CSS 4, Recharts, Lucide Icons, `pdfjs-dist`
- **Retrieval & Core Logic**: Local BM25 retrieval (`src/lib/retrieval.ts`) + deterministic scoring (`src/lib/evaluate.ts`, `src/lib/gap.ts`)
- **Optional AI Layer**: Vercel Serverless Functions (`/api/health.ts`, `/api/quiz.ts`, `/api/assist.ts`) using `ai` + `@ai-sdk/groq` + `zod` (`openai/gpt-oss-120b` for quiz generation and `openai/gpt-oss-20b` for grounded explanations)

---

## Folder Structure

```text
├── api/
│   ├── health.ts        # Returns boolean { aiMode } status only
│   ├── quiz.ts          # Server-side Groq quiz generation (openai/gpt-oss-120b + Zod validation)
│   └── assist.ts        # Server-side Groq grounded explanation (openai/gpt-oss-20b)
├── scripts/
│   └── verify-storage.ts # CLI verification for storage round-trip & 80/20 quiz counts
├── src/
│   ├── main.tsx         # React root mounted inside ErrorBoundary
│   ├── App.tsx          # Layout shell, subject switcher, storage sync, route coordinator
│   ├── style.css        # Theme tokens, typography, print rules
│   ├── components/      # Sidebar, Cards, Charts, QuizRunner, EmptyState, Toast, ErrorBoundary
│   ├── pages/           # Login, Overview, Materials, TopicMap, Quiz, Results, GapReport, RevisionPlan, Explain, Flashcards, Dashboard
│   └── lib/             # storage, ingest, topics, retrieval, quiz, evaluate, gap, plan, assistant, ai
├── .env.example         # Blank environment variable placeholders
├── vercel.json          # SPA rewrite rules excluding /api/*
└── vite.config.js       # Vite config + local /api/* dev middleware adapter
```

---

## How to Run Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start the development server** (serves both the Vite React app and `/api/*` endpoints on port `3000`):
   ```bash
   npm run dev
   ```
3. **Create an account**:
   - Open `http://localhost:3000` and use the **Register** tab to create an account with your name, email, and password.
4. **Verify build and lint**:
   ```bash
   npm run build
   npm run lint
   ```

---

## Groq AI Mode Setup (Optional)

The application works **100% offline/locally in Local Mode** with no API key required. To enable **AI Mode** via Groq:

1. Create an API key at [https://console.groq.com](https://console.groq.com).
2. Copy `.env.example` to `.env` (which is git-ignored) and set:
   ```env
   GROQ_API_KEY=your_groq_key_here
   GROQ_MODEL_QUIZ=openai/gpt-oss-120b
   GROQ_MODEL_FAST=openai/gpt-oss-20b
   ```
3. In Vercel production, add the exact same variable names (`GROQ_API_KEY`, `GROQ_MODEL_QUIZ`, `GROQ_MODEL_FAST`) under **Vercel Project -> Settings -> Environment Variables**.

---

## Deploy to Vercel

1. Push this repository to GitHub.
2. Go to [https://vercel.com/new](https://vercel.com/new) and **Import** your GitHub repository.
3. Verify the **Framework Preset** is set to **Vite** (`Build Command`: `npm run build`, `Output Directory`: `dist`).
4. (Optional) Under **Environment Variables**, add `GROQ_API_KEY`, `GROQ_MODEL_QUIZ`, and `GROQ_MODEL_FAST`.
5. Click **Deploy**. `vercel.json` is pre-configured so `/api/*` routes run as serverless functions while client routes rewrite to `/index.html`.

---

## RAG vs. Generation & Fallback Architecture

- **Retrieval is 100% Local BM25 (`src/lib/retrieval.ts`)**: When a student generates a quiz or asks to explain a topic, GapFinder tokenizes and ranks the student's own uploaded chunks locally using BM25 (`k1 = 1.5, b = 0.75`).
- **Grounded Generation with Citations**: Only the top retrieved chunks are passed to the generator. Every question and explanation must cite the source document, chapter, and section.
- **Automatic Local Fallback**: Every `/api/*` call is wrapped with schema validation, chunk-hash caching, exponential backoff retry, and a client timeout. On any rate limit (`429`), server error (`5xx`), schema mismatch, or missing `GROQ_API_KEY`, the app automatically falls back to the deterministic local engine (`src/lib/quiz.ts`, `src/lib/assistant.ts`) without interrupting the student.

---

## Honest Limitations & Future Scope

- **Current Limitations**:
  - Data is persisted per browser (`IndexedDB` + `localStorage`); switching devices requires re-uploading materials unless a cloud database is attached.
  - Scanned image-only PDFs without an embedded text layer require external OCR before upload.
  - Free-tier Groq API keys have rate limits (~30 requests/minute), handled via automatic fallback to Local mode.
- **Future Scope**:
  - Multi-device cloud sync via Postgres/Neon, OCR pipeline for handwritten notes, and spaced-repetition scheduling (SM-2) for flashcards.

---

## Interview Notes

- **Why deterministic scoring & BM25 instead of pure LLM grading?**
  - Diagnostic scores (`Weak < 50%`, `Medium 50–79%`, `Strong 80%+`) must be reproducible, auditable, and hallucination-free. Using BM25 over heading-scoped chunks ensures a question about *Sound* never drifts into *Cell Structure*, and fuzzy Levenshtein matching grades fill-in-the-blank responses deterministically in `< 1 ms`.
