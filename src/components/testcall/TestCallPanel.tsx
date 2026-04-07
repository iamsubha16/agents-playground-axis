import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TestCallForm } from "./TestCallForm";
import { CallProgress } from "./CallProgress";
import { CallDetails } from "./CallDetails";

// ── Types ────────────────────────────────────────────────────────────────────

type SipJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
type CallLifecycle =
  | "sip_pending"    // waiting for SIP dialer to finish dispatch
  | "call_dialing"   // SIP done, agent dispatched, waiting for answer
  | "call_active"    // call picked up and live
  | "call_ended"     // call ended, transcript/recording available
  | "call_failed";   // SIP failure or hung up unanswered

type CallState = {
  jobId: string;
  phoneNumber: string;
  /** From "Customer Name" in the form; shown on transcript user bubbles. */
  customerName: string;
  // Phase 1 - SIP Dialer
  sipStatus: SipJobStatus;
  sipResult: any | null;
  errorMessage: string | null;
  // Phase 2 - Studio (call lifecycle)
  roomName: string | null;
  lifecycle: CallLifecycle;
  call: any | null;
  isLoadingDetails: boolean;
};

// Terminal Studio call statuses — stop polling when we see one of these
const TERMINAL_CALL_STATUSES = new Set([
  "Completed",
  "Not Answered",
  "Rejected",
  "Failed",
  "Cancelled",
]);

/** API may return different casing; polling must still stop. */
function isTerminalStudioStatus(status: string): boolean {
  const t = status.trim();
  if (TERMINAL_CALL_STATUSES.has(t)) return true;
  const lower = t.toLowerCase();
  return (
    lower === "completed" ||
    lower === "not answered" ||
    lower === "rejected" ||
    lower === "failed" ||
    lower === "cancelled"
  );
}

function isCompletedStudioStatus(status: string): boolean {
  return status.trim().toLowerCase() === "completed";
}

function lifecycleForTerminalStudioStatus(status: string): CallLifecycle {
  return isCompletedStudioStatus(status) ? "call_ended" : "call_failed";
}

/** Studio/API variants meaning the call is live (not terminal). */
function studioStatusIndicatesLive(callStatus: string): boolean {
  const s = callStatus.trim();
  if (!s || isTerminalStudioStatus(s)) return false;
  const lower = s.toLowerCase();
  const live = new Set([
    "scheduled",
    "active",
    "in progress",
    "in_progress",
    "in call",
    "in_call",
    "live",
    "ongoing",
    "connected",
    "answered",
    "talking",
  ]);
  if (live.has(lower)) return true;
  return s === "Scheduled" || s === "Active";
}

// ── Persistence ──────────────────────────────────────────────────────────────

const HISTORY_KEY = "testcall_history";
const MAX_HISTORY = 50;

const loadHistory = (): CallState[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CallState[];
    return Array.isArray(parsed)
      ? parsed.map((h) => ({
          ...h,
          customerName:
            typeof h.customerName === "string" ? h.customerName : "",
        }))
      : [];
  } catch {
    return [];
  }
};

const saveHistory = (history: CallState[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {}
};

// ── Component ────────────────────────────────────────────────────────────────

export const TestCallPanel = () => {
  const [callState, setCallState] = useState<CallState | null>(null);
  const [callHistory, setCallHistory] = useState<CallState[]>(() => loadHistory());
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);

  // Two separate polling intervals
  const sipPollingRef = useRef<NodeJS.Timeout | null>(null);    // Phase 1: 2s
  const studioPollingRef = useRef<NodeJS.Timeout | null>(null); // Phase 2: 5s

  const isCallActive =
    callState !== null &&
    (callState.lifecycle === "sip_pending" ||
      callState.lifecycle === "call_dialing" ||
      callState.lifecycle === "call_active");

  const stopAllPolling = useCallback(() => {
    if (sipPollingRef.current) { clearInterval(sipPollingRef.current); sipPollingRef.current = null; }
    if (studioPollingRef.current) { clearInterval(studioPollingRef.current); studioPollingRef.current = null; }
  }, []);

  // ── Phase 1: Poll SIP Dialer job status ─────────────────────────────────
  const pollSipStatus = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(
        `/api/call-status?job_id=${encodeURIComponent(jobId)}`,
      );
      if (!res.ok) return;
      const data = await res.json();

      setCallState((prev) => {
        if (!prev || prev.jobId !== jobId) return prev;
        let lifecycle = prev.lifecycle;
        // SIP job is actively placing the call (ringing / in progress on trunk)
        if (data.status === "running" || data.status === "in_progress") {
          lifecycle = "call_dialing";
        }
        return {
          ...prev,
          sipStatus: data.status,
          errorMessage: data.error_message ?? null,
          lifecycle,
        };
      });

      if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
        // Phase 1 done — stop SIP polling
        if (sipPollingRef.current) { clearInterval(sipPollingRef.current); sipPollingRef.current = null; }

        if (data.status === "failed" || data.status === "cancelled") {
          setCallState((prev) => {
            if (!prev || prev.jobId !== jobId) return prev;
            const updated = { ...prev, lifecycle: "call_failed" as CallLifecycle };
            pushToHistory(updated);
            return updated;
          });
          return;
        }

        // SIP completed → fetch sip result to get room_name, then start Phase 2
        fetchSipResultAndStartStudioPoll(jobId);
      }
    } catch (err) {
      console.error("SIP poll error:", err);
    }
  }, []);

  // ── Fetch sip-dialer detailed result, extract room_name, start Phase 2 ──
  const fetchSipResultAndStartStudioPoll = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/call-details?job_id=${jobId}`);
      if (!res.ok) return;
      const data = await res.json();

      const sipResult = data.sip_result;
      const roomName: string | null = data.room_name || sipResult?.room_name || null;

      const sipFailed =
        sipResult?.status === "failed" ||
        (sipResult?.raw_api_response?.sip_status_code &&
          parseInt(sipResult.raw_api_response.sip_status_code, 10) >= 400);

      setCallState((prev) => {
        if (!prev || prev.jobId !== jobId) return prev;
        // Room exists + SIP OK ⇒ media/agent session is up — treat as in call.
        // Studio often omits the call row until hangup; staying on call_dialing was a UI bug.
        const next: CallState = {
          ...prev,
          sipResult,
          roomName,
          lifecycle: sipFailed ? "call_failed" : "call_active",
          call: data.call || null,
        };
        if (sipFailed) {
          queueMicrotask(() => pushToHistory(next));
        }
        return next;
      });

      // SIP leg failed — do not start room polling (Studio may never return a row → endless GETs).
      if (sipFailed) {
        return;
      }

      if (!roomName) {
        // No room_name means agent wasn't dispatched (SIP error)
        setCallState((prev) => {
          if (!prev || prev.jobId !== jobId) return prev;
          const updated = { ...prev, lifecycle: "call_failed" as CallLifecycle };
          pushToHistory(updated);
          return updated;
        });
        return;
      }

      // If Studio already has a terminal call record (fast failure), push to history
      if (data.call && isTerminalStudioStatus(String(data.call.call_status))) {
        const cs = String(data.call.call_status);
        const terminalLifecycle = lifecycleForTerminalStudioStatus(cs);
        setCallState((prev) => {
          if (!prev || prev.jobId !== jobId) return prev;
          const updated = { ...prev, lifecycle: terminalLifecycle, call: data.call };
          pushToHistory(updated);
          return updated;
        });
        return;
      }

      // Start Phase 2: poll Studio API by room_name every 5s
      startStudioPoll(jobId, roomName);
    } catch (err) {
      console.error("Error fetching SIP result:", err);
    }
  }, []);

  // ── Phase 2: Poll Studio API for call record ─────────────────────────────
  const pollStudio = useCallback(async (jobId: string, roomName: string) => {
    try {
      const res = await fetch(`/api/call-details?room_name=${encodeURIComponent(roomName)}`);
      if (!res.ok) return;
      const data = await res.json();
      const call = data.call;

      // Studio may not return `call` until the call ends — lifecycle already call_active from SIP phase.
      if (!call) return;

      const callStatus: string = call.call_status || "";

      setCallState((prev) => {
        if (!prev || prev.jobId !== jobId) return prev;
        let lifecycle: CallLifecycle;
        if (isTerminalStudioStatus(callStatus)) {
          lifecycle = lifecycleForTerminalStudioStatus(callStatus);
        } else if (studioStatusIndicatesLive(callStatus)) {
          lifecycle = "call_active";
        } else {
          // e.g. Ringing / Initiated — show dialing unless we already know we're live
          lifecycle =
            prev.lifecycle === "call_active" ? "call_active" : "call_dialing";
        }
        return { ...prev, call, lifecycle };
      });

      // Terminal — stop Phase 2 polling and save to history
      if (isTerminalStudioStatus(callStatus)) {
        if (studioPollingRef.current) { clearInterval(studioPollingRef.current); studioPollingRef.current = null; }
        const terminalLifecycle = lifecycleForTerminalStudioStatus(callStatus);
        setCallState((prev) => {
          if (!prev || prev.jobId !== jobId) return prev;
          const updated = { ...prev, call, lifecycle: terminalLifecycle };
          pushToHistory(updated);
          return updated;
        });
      }
    } catch (err) {
      console.error("Studio poll error:", err);
    }
  }, []);

  const startStudioPoll = useCallback((jobId: string, roomName: string) => {
    if (studioPollingRef.current) clearInterval(studioPollingRef.current);
    // Poll immediately, then every 5s
    pollStudio(jobId, roomName);
    studioPollingRef.current = setInterval(() => pollStudio(jobId, roomName), 5000);
  }, [pollStudio]);

  // ── Push finished call to history ────────────────────────────────────────
  const pushToHistory = (updated: CallState) => {
    setCallHistory((hist) => {
      // Deduplicate by jobId
      const filtered = hist.filter((h) => h.jobId !== updated.jobId);
      const next = [updated, ...filtered].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  };

  // ── Trigger: called when form submits ────────────────────────────────────
  const handleCallTriggered = useCallback(
    (jobId: string, phoneNumber: string, customerName: string) => {
    stopAllPolling();
    setSelectedHistoryIndex(null);
    const initial: CallState = {
      jobId,
      phoneNumber,
      customerName,
      sipStatus: "pending",
      sipResult: null,
      errorMessage: null,
      roomName: null,
      lifecycle: "sip_pending",
      call: null,
      isLoadingDetails: false,
    };
    setCallState(initial);

    // Phase 1: SIP dialer polling every 2s
    sipPollingRef.current = setInterval(() => pollSipStatus(jobId), 2000);
    pollSipStatus(jobId);
  },
  [pollSipStatus, stopAllPolling],
);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => stopAllPolling(), [stopAllPolling]);

  // If anything sets a terminal lifecycle without clearing the interval, stop room polling anyway.
  useEffect(() => {
    if (!callState) return;
    const terminal =
      callState.lifecycle === "call_ended" || callState.lifecycle === "call_failed";
    if (terminal && studioPollingRef.current) {
      clearInterval(studioPollingRef.current);
      studioPollingRef.current = null;
    }
  }, [callState?.lifecycle, callState?.jobId]);

  const displayedCall = selectedHistoryIndex !== null ? callHistory[selectedHistoryIndex] : callState;

  return (
    <div className="flex gap-5 w-full max-w-6xl h-full py-4 overflow-hidden">
      {/* Left Panel */}
      <div className="flex flex-col gap-4 w-[340px] shrink-0 overflow-y-auto pb-2 custom-scrollbar">
        {/* Form */}
        <div className="bg-gray-950/80 backdrop-blur-sm border border-gray-800/80 rounded-2xl p-5 shadow-xl shadow-black/20">
          <h2 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Trigger Test Call
          </h2>
          <TestCallForm onCallTriggered={handleCallTriggered} isCallActive={isCallActive} />
        </div>

        {/* Progress */}
        <AnimatePresence>
          {callState && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-950/80 backdrop-blur-sm border border-gray-800/80 rounded-2xl p-5 shadow-xl shadow-black/20"
            >
              <CallProgress
                lifecycle={callState.lifecycle}
                jobId={callState.jobId}
                phoneNumber={callState.phoneNumber}
                callStatus={callState.call?.call_status ?? null}
                callDurationSeconds={callState.call?.duration ?? null}
                errorMessage={callState.errorMessage}
                reachedDialingPhase={Boolean(callState.roomName)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* History */}
        {callHistory.length > 0 && (
          <div className="bg-gray-950/80 backdrop-blur-sm border border-gray-800/80 rounded-2xl p-4 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-widest text-gray-500 font-medium">
                Call History
              </h3>
              <button
                onClick={() => { setCallHistory([]); setSelectedHistoryIndex(null); localStorage.removeItem(HISTORY_KEY); }}
                className="text-[10px] text-gray-600 hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {callHistory.map((hist, i) => {
                const isTerminal = hist.lifecycle === "call_ended" || hist.lifecycle === "call_failed";
                const badge =
                  hist.lifecycle === "call_ended"
                    ? "bg-green-500/15 text-green-400 border border-green-500/25"
                    : hist.lifecycle === "call_failed"
                      ? "bg-red-500/15 text-red-400 border border-red-500/25"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/25";
                const label =
                  hist.lifecycle === "call_ended"
                    ? hist.call?.call_status || "Completed"
                    : hist.lifecycle === "call_failed"
                      ? hist.call?.call_status || "Failed"
                      : "In Progress";

                return (
                  <button
                    key={`${hist.jobId}-${i}`}
                    onClick={() => setSelectedHistoryIndex(i)}
                    className={`flex items-center justify-between p-4 rounded-xl text-left transition-all duration-200 ${
                      selectedHistoryIndex === i
                        ? "bg-amber-500/10 border border-amber-500/30"
                        : "bg-gray-900/30 border border-gray-800/40 hover:bg-gray-800/40"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="text-base text-gray-100 font-semibold tracking-wide">
                        +91 {hist.phoneNumber}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        {hist.jobId.slice(0, 12)}…
                      </div>
                    </div>
                    <div className={`text-[11px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full ${badge}`}>
                      {label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-gray-950/80 backdrop-blur-sm border border-gray-800/80 rounded-2xl shadow-xl shadow-black/20 overflow-hidden min-h-0">
        <CallDetails
          call={displayedCall?.call || null}
          sipResult={displayedCall?.sipResult || null}
          isLoading={displayedCall?.isLoadingDetails || false}
          lifecycle={displayedCall?.lifecycle || null}
          customerName={displayedCall?.customerName ?? ""}
        />
      </div>
    </div>
  );
};
