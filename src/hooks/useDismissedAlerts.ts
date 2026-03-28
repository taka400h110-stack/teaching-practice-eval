export function useDismissedAlerts(adminUserId: string | undefined) {
  const key = `cleanupAlertDismissed:${adminUserId || 'guest'}`;

  function getDismissedFingerprint(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.fingerprint || null;
      }
    } catch (e) {
      console.error("Failed to parse dismissed alerts", e);
    }
    return null;
  }

  function dismissFingerprint(fingerprint: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify({
        fingerprint,
        dismissedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error("Failed to set dismissed alert", e);
    }
  }

  function clearDismissed(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }

  return { getDismissedFingerprint, dismissFingerprint, clearDismissed };
}
