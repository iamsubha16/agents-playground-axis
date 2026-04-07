import { NextApiRequest, NextApiResponse } from "next";

const SIP_DIALER_URL = process.env.NEXT_PUBLIC_SIP_DIALER_URL;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const { job_id } = req.query;

  if (!job_id || typeof job_id !== "string") {
    return res.status(400).json({ error: "job_id is required" });
  }

  try {
    const response = await fetch(
      `${SIP_DIALER_URL}/api/jobs/${job_id}/status`,
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
