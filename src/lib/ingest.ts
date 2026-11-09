// Material ingestion, content hashing, auto-detection of material type, and local PDF/text parsing
import { MaterialType } from "./storage";
import { isValidChapterHeading } from "./topics";

export async function computeContentHash(text: string): Promise<string> {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoded = new TextEncoder().encode(normalized);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv-${(hash >>> 0).toString(16)}`;
}

export function detectMaterialType(rawText: string, fileName = ""): MaterialType {
  const lowerName = fileName.toLowerCase();
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let pastPaperSignals = 0;
  let syllabusSignals = 0;
  let notesSignals = 0;

  if (/past[\s_-]*paper|question[\s_-]*paper|exam[\s_-]*paper|pyq|sample[\s_-]*paper/i.test(lowerName)) {
    pastPaperSignals += 6;
  }
  if (/syllabus|curriculum|outline|course[\s_-]*plan/i.test(lowerName)) {
    syllabusSignals += 6;
  }
  if (/notes|textbook|summary|handout|chapter|lecture|study/i.test(lowerName)) {
    notesSignals += 4;
  }

  let longParagraphCount = 0;
  let shortLineCount = 0;
  let questionLineCount = 0;

  for (const line of lines) {
    if (/^section\s+[a-d]\b/i.test(line) || /\b(\d+)\s*marks?\b/i.test(line)) {
      pastPaperSignals += 3;
    }
    if (/^(?:Q(?:uestion)?\s*\d+|\d+[.)])\s+.+\?$/i.test(line) || line.endsWith("?")) {
      questionLineCount += 1;
      pastPaperSignals += 1.5;
    }
    if (isValidChapterHeading(line) || /^\d+\.\d+\s+/.test(line)) {
      syllabusSignals += 1.5;
    }
    if (line.length >= 110) {
      longParagraphCount += 1;
      notesSignals += 3;
    } else if (line.length < 65) {
      shortLineCount += 1;
    }
  }

  if (pastPaperSignals >= 6 && questionLineCount >= 2 && pastPaperSignals > notesSignals) {
    return "past_paper";
  }
  if (longParagraphCount >= 1 || notesSignals >= syllabusSignals) {
    return "notes";
  }
  if (shortLineCount > 0 && longParagraphCount === 0) {
    return "syllabus";
  }
  return "notes";
}

export async function extractTextFromFile(
  file: File
): Promise<{ text: string; isScannedWarning?: boolean }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf" || file.type === "application/pdf") {
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const pageTexts: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const lines: string[] = [];
        let currentLine = "";
        let lastY: number | null = null;

        for (const item of content.items) {
          if (!("str" in item)) continue;
          const y = Array.isArray(item.transform) ? item.transform[5] : null;
          if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
            if (currentLine.trim()) lines.push(currentLine.trim());
            currentLine = item.str;
          } else {
            currentLine += (currentLine && !currentLine.endsWith(" ") ? " " : "") + item.str;
          }
          if (y !== null) lastY = y;
        }
        if (currentLine.trim()) lines.push(currentLine.trim());
        pageTexts.push(lines.join("\n"));
      }

      const combined = pageTexts.join("\n\n").trim();
      if (combined.replace(/\s+/g, "").length < 25) {
        return {
          text: `Chapter 1: ${file.name.replace(/\.[^.]+$/, "")}\nUploaded PDF document (${file.name}). Note: This PDF had minimal selectable text (scanned pages).`,
          isScannedWarning: true,
        };
      }
      return { text: combined };
    } catch (err) {
      console.warn("PDF parsing fallback triggered:", err);
      return {
        text: `Chapter 1: ${file.name.replace(/\.[^.]+$/, "")}\nUploaded PDF material from ${file.name}.`,
        isScannedWarning: true,
      };
    }
  }

  const text = await file.text();
  return { text: text.trim() };
}
