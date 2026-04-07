/**
 * SIP dialer base URL — read only from server-side code (API routes).
 * Prefer SIP_DIALER_API_URL. NEXT_PUBLIC_SIP_DIALER_URL is supported as a legacy
 * fallback here only (this module is not imported by the client, so that value
 * is not bundled for the browser).
 */
export function getSipDialerBaseUrl(): string {
  const raw =
    process.env.SIP_DIALER_API_URL ||
    process.env.NEXT_PUBLIC_SIP_DIALER_URL ||
    "";
  return raw.trim().replace(/\/$/, "");
}

/** Safe path segment for job IDs (avoids path injection in upstream URLs). */
export function isSafeDialerJobId(jobId: string): boolean {
  // Alphanumeric + hyphen/underscore only; blocks path traversal in upstream URLs.
  return /^[a-zA-Z0-9_-]{4,128}$/.test(jobId);
}
