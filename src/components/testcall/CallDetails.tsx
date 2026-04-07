import { useState } from "react";
import { TranscriptView } from "./TranscriptView";
import { RecordingPlayer } from "./RecordingPlayer";
import { motion } from "framer-motion";

type CallLifecycle = "sip_pending" | "call_dialing" | "call_active" | "call_ended" | "call_failed" | null;

type CallDetailsProps = {
  call: any | null;
  sipResult: any | null;
  isLoading: boolean;
  lifecycle?: CallLifecycle;
};

export const CallDetails = ({ call, sipResult, isLoading, lifecycle }: CallDetailsProps) => {
  const [activeTab, setActiveTab] = useState<"transcript" | "recording" | "details">("transcript");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm gap-2">
        <div className="w-4 h-4 border-2 border-gray-600 border-t-amber-500 rounded-full animate-spin" />
        Loading call details…
      </div>
    );
  }

  // Active call — show live status instead of empty tabs
  if (!call && lifecycle && lifecycle !== "call_ended" && lifecycle !== "call_failed") {
    const messages: Record<string, { icon: string; title: string; sub: string }> = {
      sip_pending: { icon: "⏳", title: "Dispatching call…", sub: "Sending SIP request to the trunk" },
      call_dialing: { icon: "📞", title: "Ringing…", sub: "Agent dispatched, waiting for customer to answer" },
      call_active: { icon: "🎙️", title: "Call in progress", sub: "Transcript & recording will appear when the call ends" },
    };
    const m = messages[lifecycle] || messages.sip_pending;
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
        <motion.div
          className="text-4xl"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          {m.icon}
        </motion.div>
        <div className="text-gray-200 font-semibold text-lg">{m.title}</div>
        <div className="text-gray-500 text-sm max-w-xs">{m.sub}</div>
        <motion.div
          className="flex gap-1.5 mt-2"
          initial={{}}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-amber-500/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </motion.div>

      </div>
    );
  }

  if (!call && !sipResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600 text-sm gap-2">
        <CallIconSVG />
        <p>Trigger a test call to see details here</p>
      </div>
    );
  }

  const tabs: { key: "transcript" | "recording" | "details"; label: string }[] = [
    { key: "transcript", label: "Transcript" },
    { key: "recording", label: "Recording" },
    { key: "details", label: "Details" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-800/80">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-xs uppercase tracking-wider font-medium transition-all duration-200 ${activeTab === tab.key
              ? "text-amber-400 border-b-2 border-amber-500 -mb-px bg-amber-500/5"
              : "text-gray-500 hover:text-gray-300 border-b-2 border-transparent"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "transcript" && (
          <TranscriptView
            transcriptUrl={call?.transcript_url || null}
            rawTranscript={null}
          />
        )}
        {activeTab === "recording" && (
          <RecordingPlayer recordingUrl={call?.recording_url || null} />
        )}
        {activeTab === "details" && (
          <div className="flex flex-col gap-4">
            {sipResult ? <SipResultPanel result={sipResult} /> : (
              <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
                Trigger a test call to see details here
              </div>
            )}
            {call && <CallInfoPanel call={call} />}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Structured Panels ────────────────────────────────────────────────────────

const SipResultPanel = ({ result }: { result: any }) => {
  const raw = result.raw_api_response || {};
  const isFailed = result.status === "failed";

  const callDuration = (() => {
    if (!result.sip_request_sent_at || !result.sip_response_received_at) return null;
    const ms = new Date(result.sip_response_received_at).getTime() -
      new Date(result.sip_request_sent_at).getTime();
    return (ms / 1000).toFixed(1) + "s";
  })();

  return (
    <div className="flex flex-col gap-3">
      {/* Status row */}
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${isFailed
          ? "bg-red-500/15 text-red-400 border border-red-500/25"
          : "bg-green-500/15 text-green-400 border border-green-500/25"
          }`}>
          {result.status}
        </span>
        {raw.sip_status && (
          <span className="text-xs text-gray-400 font-medium">
            SIP {raw.sip_status_code} — {raw.sip_status}
          </span>
        )}
      </div>

      {/* Core fields */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Phone Number" value={result.phone_number} />
        <Field label="Caller ID" value={result.caller_id} />
        <Field label="SIP Trunk" value={raw.sip_trunk_id || "—"} mono />
        <Field label="Call Duration" value={callDuration || "—"} />

      </div>

      {/* Error block */}
      {isFailed && raw.error_message && (
        <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3 flex flex-col gap-1.5">
          <div className="text-[10px] uppercase tracking-widest text-red-400/70 font-semibold">Error</div>
          <div className="text-sm text-red-300 font-medium">{raw.error_message}</div>
          {raw.error_type && (
            <div className="text-[11px] text-red-400/60 font-mono">{raw.error_type} · {raw.error_code}</div>
          )}
        </div>
      )}

      {/* Timestamps */}
      <div className="border-t border-gray-800/60 pt-3 grid grid-cols-1 gap-1.5">
        <div className="text-[10px] uppercase tracking-widest text-gray-600 font-medium mb-1">Timestamps</div>
        <TimestampRow label="Assigned" value={result.data_assigned_at} />
        <TimestampRow label="SIP Request" value={result.sip_request_sent_at} />
        <TimestampRow label="SIP Response" value={result.sip_response_received_at} />
        <TimestampRow label="Processed" value={result.processed_at} />
      </div>
    </div>
  );
};

const CallInfoPanel = ({ call }: { call: any }) => (
  <div className="flex flex-col gap-3 border-t border-gray-800/60 pt-4">
    <div className="text-[10px] uppercase tracking-widest text-gray-600 font-medium">Studio Call Record</div>
    <div className="grid grid-cols-2 gap-2">
      <Field label="Status" value={call.call_status} />
      <Field label="Duration" value={call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "—"} />
      <Field label="Cost" value={call.cost != null ? `₹${Number(call.cost).toFixed(2)}` : "—"} />
      <Field label="Call Type" value={call.call_type} />
    </div>
    {call.call_outcome && (
      <div className="flex flex-col gap-3">
        <div className="text-[10px] uppercase tracking-widest text-gray-600 font-medium px-1">Call Outcome</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(call.call_outcome).map(([key, value]) => {
            if (value === null || key === "task_flow") return null;

            const label = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

            if (typeof value === "boolean") {
              return (
                <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wide ${value
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                  <span className={value ? "text-green-500" : "text-red-500"}>{value ? "✓" : "✕"}</span>
                  {label}
                </div>
              );
            }

            return (
              <div key={key} className="bg-gray-900/60 border border-gray-800/80 rounded-lg px-3 py-2 flex flex-col gap-0.5 min-w-[120px]">
                <div className="text-[9px] uppercase tracking-tight text-gray-500 font-bold">{label}</div>
                <div className="text-xs text-gray-200 font-medium">{String(value)}</div>
              </div>
            );
          })}
        </div>

        {/* Task Flow Timeline */}
        {Array.isArray(call.call_outcome.task_flow) && call.call_outcome.task_flow.length > 0 && (
          <div className="mt-2 bg-gray-950/40 border border-gray-800/40 rounded-xl p-3">
            <div className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-3 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-amber-500" />
              Agent Logic Flow
            </div>
            <div className="flex flex-col gap-2">
              {call.call_outcome.task_flow.map((task: string, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-2 h-2 rounded-full border border-amber-500/50 bg-amber-500/20" />
                    {idx < call.call_outcome.task_flow.length - 1 && (
                      <div className="w-px h-3 bg-gray-800" />
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 font-medium">{task}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);

const Field = ({
  label,
  value,
  mono = false,
  small = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  small?: boolean;
}) => (
  <div className="bg-gray-900/40 border border-gray-800/50 rounded-xl px-3 py-2.5">
    <div className="text-[10px] uppercase tracking-wider text-gray-600 font-medium mb-0.5">{label}</div>
    <div className={`text-gray-200 font-medium truncate ${mono ? "font-mono" : ""} ${small ? "text-[11px]" : "text-sm"}`}>
      {value || "—"}
    </div>
  </div>
);

const TimestampRow = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  const d = new Date(value);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-400 font-mono tabular-nums">{time}</span>
    </div>
  );
};

const CallIconSVG = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

