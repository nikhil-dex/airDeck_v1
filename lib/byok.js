// Bring-your-own-key (client side). The key lives ONLY in this browser's
// localStorage and is sent per request as a header — never stored on the
// server. With a user key present, AI calls don't consume credits.
export const BYOK_STORAGE_KEY = "pptGeminiKey";

export function getByokKey() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(BYOK_STORAGE_KEY) || "";
}

export function byokHeaders() {
  const key = getByokKey();
  return key ? { "x-gemini-key": key } : {};
}
