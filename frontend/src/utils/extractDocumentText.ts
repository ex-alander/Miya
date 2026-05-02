import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_BEFORE_TRUNCATE = 5000_000;
const TRUNCATE_TO = 48_000;

function detectKind(file: File): "pdf" | "docx" | "md" | "txt" {
  const n = file.name.toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx")) return "docx";
  if (n.endsWith(".md") || n.endsWith(".markdown")) return "md";
  return "txt";
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let full = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const parts = tc.items.map((item) =>
      item && typeof item === "object" && "str" in item
        ? String((item as { str: string }).str)
        : ""
    );
    full += parts.join(" ") + "\n\n";
  }
  return full;
}

export type ExtractDocumentResult = {
  text: string;
  truncated: boolean;
  warn: string | null;
};

export async function extractDocumentText(
  file: File
): Promise<ExtractDocumentResult> {
  const kind = detectKind(file);
  let raw = "";
  if (kind === "pdf") {
    raw = await extractPdfText(await file.arrayBuffer());
  } else if (kind === "docx") {
    const r = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    raw = r.value || "";
  } else {
    raw = await file.text();
  }

  const truncated = raw.length > MAX_BEFORE_TRUNCATE;
  const text = truncated ? raw.slice(0, TRUNCATE_TO) : raw;
  return {
    text,
    truncated,
    warn: truncated
      ? "Документ слишком большой — анализируется только начало (~48 тыс. символов)."
      : null,
  };
}
