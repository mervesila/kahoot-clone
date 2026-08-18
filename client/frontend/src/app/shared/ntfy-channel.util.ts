/**
 * Single source of truth for the ntfy.sh topic used by BOTH
 * the mobile join flow and the host lobby screen.
 * DO NOT recompute this string anywhere else in the codebase.
 */
export function getNtfyTopic(pin: string | number): string {
  const cleanPin = String(pin).trim();
  return `tki-quiz-${cleanPin}`;
}

export function getNtfyPublishUrl(pin: string | number): string {
  return `https://ntfy.sh/${getNtfyTopic(pin)}`;
}

export function getNtfySseUrl(pin: string | number): string {
  return `https://ntfy.sh/${getNtfyTopic(pin)}/sse`;
}
