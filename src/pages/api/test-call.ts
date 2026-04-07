import { NextApiRequest, NextApiResponse } from "next";

const SIP_DIALER_URL = process.env.NEXT_PUBLIC_SIP_DIALER_URL;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { phone_number, customer_name, agent_name, sip_trunk_id } = req.body;

  if (!phone_number) {
    return res.status(400).json({ error: "phone_number is required" });
  }

  try {
    const response = await fetch(`${SIP_DIALER_URL}/api/jobs/test-call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number,
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
