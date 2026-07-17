export const LAST_EMAIL_STORAGE_KEY = "roster:last-email";

export function readLastEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(LAST_EMAIL_STORAGE_KEY)?.trim() ?? "";
    return value || null;
  } catch {
    return null;
  }
}

export function writeLastEmail(email: string) {
  if (typeof window === "undefined") return;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  try {
    window.localStorage.setItem(LAST_EMAIL_STORAGE_KEY, normalized);
  } catch {
    // ignore quota / private mode
  }
}
