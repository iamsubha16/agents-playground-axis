export type ConversationTurn = {
  id: string;
  role: "agent" | "user";
  text: string;
};

/**
 * Parses LiveKit / agent transcript JSON with top-level `items` (message, agent_handoff, etc.).
 * Only user ↔ assistant speech is shown (skips system hints, tool calls, handoffs).
 */
export function parseConversationTranscript(raw: unknown): ConversationTurn[] | null {
  if (!raw || typeof raw !== "object") return null;
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;

  const out: ConversationTurn[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (o.type !== "message") continue;

    const role = o.role;
    if (role !== "user" && role !== "assistant") continue;

    const content = o.content;
    let text = "";
    if (Array.isArray(content)) {
      text = content.filter((c): c is string => typeof c === "string").join("\n");
    } else if (typeof content === "string") {
      text = content;
    }
    text = text.trim();
    if (!text) continue;

    const id = typeof o.id === "string" ? o.id : `msg_${out.length}`;
    out.push({
      id,
      role: role === "user" ? "user" : "agent",
      text,
    });
  }

  return out.length > 0 ? out : null;
}
