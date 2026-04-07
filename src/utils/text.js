export function sanitizeApiKey(value) {
  if (!value) return "";
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitSentences(text) {
  return (text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function countSyllables(word) {
  const normalized = (word || "").toLowerCase();
  const parts = normalized.match(/[aeiouyàâäáãåæçéèêëíìîïïòóôöõœùúûü]+/gi);
  return parts ? Math.max(1, parts.length) : 1;
}

export function slugifyKeyword(value) {
  const base = (value || "").trim().toLowerCase();
  if (!base) return "article";
  const normalized = base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const slug = normalized
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return slug || "article";
}

export function deriveHistoryTitle(content) {
  if (!content) return "Untitled article";
  const firstNonEmpty = content
    .split(/\n+/)
    .map((l) => l.trim())
    .find((line) => line);
  if (!firstNonEmpty) return "Untitled article";
  return firstNonEmpty.replace(/^#+\s*/, "").slice(0, 140) || "Untitled article";
}
