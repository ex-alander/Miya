/**
 * Strip HTML tags from a string, returning plain text.
 */
export function stripHtml(html: string): string {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

/**
 * Render HTML content safely (for rich text from TipTap).
 */
export function renderHtml(html: string): { __html: string } {
  return { __html: html };
}
