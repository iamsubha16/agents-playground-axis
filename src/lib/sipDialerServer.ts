import { getRuntimeEnv } from "@/lib/serverEnv";

/**
 * SIP dialer base URL — server-only (API routes).
 * Uses getRuntimeEnv so the URL is not inlined into Netlify’s .next build output.
 */
export function getSipDialerBaseUrl(): string {
  const raw =
    getRuntimeEnv("SIP_DIALER_API_URL") ||
    getRuntimeEnv("NEXT_PUBLIC_SIP_DIALER_URL");
  return raw.trim().replace(/\/$/, "");
}

/** Safe path segment for job IDs (avoids path injection in upstream URLs). */
export function isSafeDialerJobId(jobId: string): boolean {
  // Alphanumeric + hyphen/underscore only; blocks path traversal in upstream URLs.
  return /^[a-zA-Z0-9_-]{4,128}$/.test(jobId);
}
