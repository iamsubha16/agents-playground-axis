import { useMemo } from "react";

type TranscriptEntry = {
  role: "agent" | "user";
  text: string;
};

type TranscriptViewProps = {
  transcriptUrl: string | null;
  transcriptData?: TranscriptEntry[] | null;
  rawTranscript?: string | null;
};

export const TranscriptView = ({
  transcriptUrl,
  transcriptData,
  rawTranscript,
}: TranscriptViewProps) => {
  const entries = useMemo(() => {
    if (transcriptData && transcriptData.length > 0) {
      return transcriptData;
    }

    if (rawTranscript) {
      // Try to parse as JSON array
      try {
        const parsed = JSON.parse(rawTranscript);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            role: (item.role || item.speaker || "agent").toLowerCase().includes("user")
              ? "user" as const
              : "agent" as const,
            text: item.text || item.content || item.message || String(item),
          }));
        }
      } catch {
        // Treat as plain text — split by lines
        return rawTranscript
          .split("\n")
          .filter((l) => l.trim())
          .map((line, i) => ({
            role: (i % 2 === 0 ? "agent" : "user") as "agent" | "user",
            text: line.trim(),
          }));
      }
    }

    return null;
  }, [transcriptData, rawTranscript]);

  if (!entries && !transcriptUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        No transcript available
      </div>
    );
  }

  if (!entries && transcriptUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-gray-500 text-sm">Transcript available as file</p>
        <a
          href={transcriptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 text-sm hover:text-amber-300 underline underline-offset-2 transition-colors"
        >
          Open Transcript ↗
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
      {entries?.map((entry, i) => (
        <div
          key={i}
          className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              entry.role === "user"
                ? "bg-amber-500/15 text-amber-100 rounded-br-md border border-amber-500/20"
                : "bg-gray-800/60 text-gray-200 rounded-bl-md border border-gray-700/40"
            }`}
          >
            <div
              className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${
                entry.role === "user" ? "text-amber-400/70" : "text-gray-500"
              }`}
            >
              {entry.role === "user" ? "Customer" : "Agent"}
            </div>
            {entry.text}
          </div>
        </div>
      ))}
    </div>
  );
};
