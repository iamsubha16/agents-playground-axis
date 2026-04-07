import { NextApiRequest, NextApiResponse } from "next";

const STUDIO_API_URL = process.env.STUDIO_API_URL;
const STUDIO_API_KEY = process.env.STUDIO_API_KEY;
const SIP_DIALER_URL = process.env.NEXT_PUBLIC_SIP_DIALER_URL;

const studioHeaders = {
  "Content-Type": "application/json",
  "X-API-Key": STUDIO_API_KEY,
};

async function getCallByRoomName(roomName: string) {
  const res = await fetch(`${STUDIO_API_URL}/calls/room/${encodeURIComponent(roomName)}`, {
    headers: studioHeaders,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Studio API error: ${res.status}`);
  return res.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const { job_id, room_name } = req.query;

  try {
    // ── Mode 1: poll by room_name (Phase 2 polling — call is live/ended) ──────
    if (room_name && typeof room_name === "string") {
      const call = await getCallByRoomName(room_name);
      return res.status(200).json({ call: call || null });
    }

    // ── Mode 2: initial fetch by job_id (Phase 1 — SIP just completed) ────────
    if (!job_id || typeof job_id !== "string") {
      return res.status(400).json({ error: "job_id or room_name is required" });
    }

    // Get detailed sip-dialer results
    const dialerRes = await fetch(`${SIP_DIALER_URL}/api/jobs/${job_id}/results/detailed`);
    if (!dialerRes.ok) {
      return res.status(dialerRes.status).json({
        error: "Failed to fetch job results from SIP Dialer",
      });
    }

    const results = await dialerRes.json();
    if (!results || results.length === 0) {
      return res.status(404).json({ error: "No results found for this job" });
    }

    const sipResult = results[0]; // Test calls are single-row
    const { room_name: sipRoomName } = sipResult;

    // Immediately try to look up call record (may return null if not yet created)
    const call = sipRoomName ? await getCallByRoomName(sipRoomName).catch(() => null) : null;

    return res.status(200).json({
      sip_result: sipResult,
      call: call || null,
      room_name: sipRoomName || null,
    });
  } catch (error: any) {
    console.error("Error in call-details:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch call details" });
  }
}
