// Consent for OPTIONAL data processing (product analytics). Essential storage —
// your profile, preferences, and sign-in session in localStorage — is required
// for the app to work and is not gated here; only analytics is.
//
// The choice is remembered in localStorage and broadcast via window events so
// the analytics gate and the banner can react without a page reload.

export type ConsentChoice = "accepted" | "declined";

const KEY = "thisisme:consent:v1";
export const CONSENT_CHANGED = "thisisme:consent-changed";
export const OPEN_CONSENT = "thisisme:open-consent";

export function getConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED, { detail: choice }));
}

// Analytics is the only non-essential processing; it runs only on explicit opt-in.
export function analyticsAllowed(): boolean {
  return getConsent() === "accepted";
}

// Re-open the consent chooser (e.g. from a "Privacy choices" footer link).
export function openConsentSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_CONSENT));
}
