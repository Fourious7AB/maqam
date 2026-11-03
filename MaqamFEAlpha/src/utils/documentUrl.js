export function getDocumentUrl(value) {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate || /^blob:/i.test(candidate)) return null;

  if (candidate.startsWith("/")) return candidate;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}