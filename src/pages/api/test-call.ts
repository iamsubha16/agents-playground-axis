import { NextApiRequest, NextApiResponse } from "next";
import { getSipDialerBaseUrl } from "@/lib/sipDialerServer";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const base = getSipDialerBaseUrl();
  if (!base) {
    return res.status(503).json({
      error: "SIP dialer is not configured (set SIP_DIALER_API_URL on the server)",
    });
  }

  const { phone_number, customer_name, agent_name, sip_trunk_id } = req.body;

  if (!phone_number) {
    return res.status(400).json({ error: "phone_number is required" });
  }

  const digits = String(phone_number).replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return res.status(400).json({ error: "Invalid phone_number" });
  }

  try {
    const response = await fetch(`${base}/api/jobs/test-call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: digits,
        customer_name: customer_name || undefined,
        agent_name: agent_name || undefined,
        sip_trunk_id: sip_trunk_id || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Error proxying test-call:", error);
    return res.status(500).json({ error: error.message || "Failed to trigger test call" });
  }
}
