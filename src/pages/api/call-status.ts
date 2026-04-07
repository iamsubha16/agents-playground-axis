import { NextApiRequest, NextApiResponse } from "next";
import { getSipDialerBaseUrl, isSafeDialerJobId } from "@/lib/sipDialerServer";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const base = getSipDialerBaseUrl();
  if (!base) {
    return res.status(503).json({
      error: "SIP dialer is not configured (set SIP_DIALER_API_URL on the server)",
    });
  }

  const { job_id } = req.query;

  if (!job_id || typeof job_id !== "string") {
    return res.status(400).json({ error: "job_id is required" });
  }

  if (!isSafeDialerJobId(job_id)) {
    return res.status(400).json({ error: "Invalid job_id" });
  }

  try {
    const response = await fetch(
      `${base}/api/jobs/${encodeURIComponent(job_id)}/status`,
    );
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Error fetching call status:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch call status" });
  }
}
