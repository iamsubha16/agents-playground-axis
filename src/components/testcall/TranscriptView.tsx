import { useEffect, useMemo, useState } from "react";
import {
  parseConversationTranscript,
  type ConversationTurn,
} from "@/lib/parseConversationTranscript";

type TranscriptEntry = {
  role: "agent" | "user";
  text: string;
};

type TranscriptViewProps = {
  transcriptUrl: string | null;
  transcriptData?: TranscriptEntry[] | null;
  rawTranscript?: string | null;
  className?: string;
  customerDisplayName?: string;
};

export const TranscriptView = ({
  transcriptUrl,
  transcriptData,
  rawTranscript,
  className = "",
  customerDisplayName = "",
}: TranscriptViewProps) => {
  const [fetchedTurns, setFetchedTurns] = useState<ConversationTurn[] | null>(
    null,
  );
  const [fetchState, setFetchState] = useState<
    "idle" | "loading" | "error" | "empty"
  >("idle");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const userBubbleLabel =
    customerDisplayName.trim() || "Customer";

  const staticEntries = useMemo(() => {
    if (transcriptData && transcriptData.length > 0) {
      return transcriptData.map((e, i) => ({
        id: `static_${i}`,
        role: e.role,
        text: e.text,
      })) as ConversationTurn[];
    }

    if (rawTranscript) {
      try {
        const parsed = JSON.parse(rawTranscript) as unknown;
        const fromItems = parseConversationTranscript(parsed);
        if (fromItems) return fromItems;
        if (Array.isArray(parsed)) {
          return parsed
            .map((item: Record<string, unknown>, i: number) => {
              const roleRaw = String(
                item.role || item.speaker || "agent",
              ).toLowerCase();
              /** falls back to "Customer" if empty. */
              const role =
                roleRaw.includes("user") || roleRaw === "customer"
                  ? ("user" as const)
                  : ("agent" as const);
              const text = String(
                item.text || item.content || item.message || "",
              ).trim();
              if (!text) return null;
              return {
                id: `raw_${i}`,
                role,
                text,
              } as ConversationTurn;
            })
            .filter(Boolean) as ConversationTurn[];
        }
      } catch {
        return rawTranscript
          .split("\n")
          .filter((l) => l.trim())
          .map((line, i) => ({
            id: `line_${i}`,
            role: (i % 2 === 0 ? "agent" : "user") as "agent" | "user",
            text: line.trim(),
          }));
      }
    }

    return null;
  }, [transcriptData, rawTranscript]);

  useEffect(() => {
    if (staticEntries?.length || !transcriptUrl) {
      setFetchedTurns(null);
      setFetchState("idle");
      setFetchError(null);
      return;
    }

    const ac = new AbortController();
    setFetchState("loading");
    setFetchError(null);
    setFetchedTurns(null);

    const proxy = `/api/fetch-transcript?url=${encodeURIComponent(transcriptUrl)}`;

    fetch(proxy, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const msg =
            typeof errBody.error === "string"
              ? errBody.error
              : `Could not load transcript (${res.status})`;
          throw new Error(msg);
        }
        return res.json() as unknown;
      })
      .then((json) => {
        const turns = parseConversationTranscript(json);
        if (turns && turns.length > 0) {
          setFetchedTurns(turns);
          setFetchState("idle");
        } else {
          setFetchState("empty");
        }
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setFetchState("error");
        setFetchError(e instanceof Error ? e.message : "Failed to load transcript");
      });

    return () => ac.abort();
  }, [transcriptUrl, staticEntries]);

  const entries: ConversationTurn[] | null =
    staticEntries && staticEntries.length > 0
      ? staticEntries
      : fetchedTurns;

  if (!transcriptUrl && !entries?.length) {
    return (
      <div
        className={`flex items-center justify-center h-full min-h-[200px] text-gray-600 text-sm ${className}`}
      >
        No transcript available
      </div>
    );
  }

  if (
    transcriptUrl &&
    !entries?.length &&
    fetchState === "loading"
  ) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full min-h-[240px] gap-3 text-gray-500 text-sm ${className}`}
      >
        <div className="w-8 h-8 border-2 border-gray-700 border-t-amber-500 rounded-full animate-spin" />
        Loading conversation…
      </div>
    );
  }

  if (
    transcriptUrl &&
    !entries?.length &&
    fetchState === "error"
  ) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full min-h-[240px] gap-4 px-4 text-center ${className}`}
      >
        <p className="text-red-400/90 text-sm max-w-md">{fetchError}</p>
        <a
          href={transcriptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 text-sm hover:text-amber-300 underline underline-offset-2 transition-colors"
        >
          Open transcript file ↗
        </a>
      </div>
    );
  }

  if (
    transcriptUrl &&
    !entries?.length &&
    fetchState === "empty"
  ) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full min-h-[240px] gap-3 ${className}`}
      >
        <p className="text-gray-500 text-sm">
          No user or agent messages found in this transcript file.
        </p>
        <a
          href={transcriptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 text-sm hover:text-amber-300 underline underline-offset-2 transition-colors"
        >
          Open raw JSON ↗
        </a>
      </div>
    );
  }

  if (!entries?.length) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full min-h-[200px] gap-3 ${className}`}
      >
        <p className="text-gray-500 text-sm">Transcript available as file</p>
        {transcriptUrl && (
          <a
            href={transcriptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 text-sm hover:text-amber-300 underline underline-offset-2 transition-colors"
          >
            Open Transcript ↗
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      <div className="flex justify-between items-center gap-2 pb-3 border-b border-gray-800/60 shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
          Conversation
        </span>
        {transcriptUrl && (
          <a
            href={transcriptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] uppercase tracking-wider text-amber-500/80 hover:text-amber-400 transition-colors"
          >
            Raw JSON ↗
          </a>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto pt-4 pr-1 custom-scrollbar flex flex-col gap-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`flex w-full ${entry.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[min(85%,28rem)] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                entry.role === "user"
                  ? "bg-amber-500/15 text-amber-50 rounded-br-md border border-amber-500/25 shadow-sm shadow-black/10"
                  : "bg-gray-800/70 text-gray-100 rounded-bl-md border border-gray-700/50 shadow-sm shadow-black/10"
              }`}
            >
              <div
                className={`text-[10px] uppercase tracking-wider font-semibold mb-1.5 ${
                  entry.role === "user"
                    ? "text-amber-400/80"
                    : "text-gray-500"
                }`}
              >
                {entry.role === "user" ? userBubbleLabel : "Agent"}
              </div>
              <p className="whitespace-pre-wrap">{entry.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
