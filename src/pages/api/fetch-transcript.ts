import { NextApiRequest, NextApiResponse } from "next";
import { getRuntimeEnv } from "@/lib/serverEnv";

const FETCH_TIMEOUT_MS = 20_000;
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Allow HTTPS transcript JSON URLs from S3 (virtual-hosted style) to avoid SSRF.
 * Optional comma-separated exact hostnames in TRANSCRIPT_FETCH_ALLOWED_HOSTS override/extend.
 */
function isAllowedTranscriptUrl(href: string): boolean {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;

  const host = u.hostname.toLowerCase();
  const path = decodeURIComponent(u.pathname);

  const extra = getRuntimeEnv("TRANSCRIPT_FETCH_ALLOWED_HOSTS")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (extra.includes(host)) {
    return /transcript/i.test(path);
  }

  const s3VirtualHosted =
    /^[a-z0-9][a-z0-9.-]*\.s3\.[a-z0-9-]+\.amazonaws\.com$/i.test(host) ||
    /^[a-z0-9][a-z0-9.-]*\.s3\.amazonaws\.com$/i.test(host);

  if (!s3VirtualHosted) return false;
  return /transcript/i.test(path);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const urlParam = req.query.url;
  if (!urlParam || typeof urlParam !== "string") {
    return res.status(400).json({ error: "url query parameter is required" });
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!isAllowedTranscriptUrl(target.href)) {
    return res.status(403).json({
      error: "Transcript URL host is not allowed",
    });
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(target.href, {
      method: "GET",
      signal: ac.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(t);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `Upstream returned ${upstream.status}`,
      });
    }

    const len = upstream.headers.get("content-length");
    if (len && Number(len) > MAX_BYTES) {
      return res.status(413).json({ error: "Transcript file too large" });
    }

    const text = await upstream.text();
    if (text.length > MAX_BYTES) {
      return res.status(413).json({ error: "Transcript file too large" });
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return res.status(422).json({ error: "Response is not valid JSON" });
    }

    return res.status(200).json(json);
  } catch (e: unknown) {
    clearTimeout(t);
    const message = e instanceof Error ? e.message : "Fetch failed";
    return res.status(502).json({ error: message });
  }
}
