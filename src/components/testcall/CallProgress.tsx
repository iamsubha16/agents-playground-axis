import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type CallLifecycle =
  | "sip_pending"
  | "call_dialing"
  | "call_active"
  | "call_ended"
  | "call_failed";

type CallProgressProps = {
  lifecycle: CallLifecycle;
  jobId: string;
  phoneNumber: string;
  callStatus?: string | null;
  callDurationSeconds?: number | null;
  errorMessage?: string | null;
  reachedDialingPhase?: boolean;
};

const STEPS: { key: CallLifecycle[]; label: string; icon: string }[] = [
  { key: ["sip_pending"], label: "Dispatching", icon: "1" },
  { key: ["call_dialing"], label: "Dialing", icon: "2" },
  { key: ["call_active"], label: "In Call", icon: "3" },
  { key: ["call_ended", "call_failed"], label: "Done", icon: "4" },
];

function normStatus(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase();
}

/**
 * Index of the last step that completed successfully before failure (0…2 map to Dispatching…In Call).
 * Step 3 is always the terminal outcome marker.
 */
function lastOkStepIndexOnFailure(
  callStatus: string | null | undefined,
  durationSeconds: number | null | undefined,
  reachedDialingPhase: boolean,
): number {
  const d = durationSeconds ?? 0;
  if (d > 0) return 2;

  const lower = normStatus(callStatus);

  const rangButNoConversation = new Set([
    "not answered",
    "rejected",
    "busy",
    "no answer",
    "no_answer",
    "timeout",
    "timed out",
    "unanswered",
    "cancelled",
    "canceled",
    "abandoned",
    "user busy",
  ]);
  if (rangButNoConversation.has(lower)) return 1;

  if (lower === "failed") return 1;

  if (!lower && reachedDialingPhase) return 1;

  return 0;
}

function terminalBadgeLabel(
  isFailed: boolean,
  callStatus: string | null | undefined,
  reachedDialingPhase: boolean,
  failLastOk: number,
): string | null {
  if (!isFailed) return callStatus?.trim() || null;
  const raw = callStatus?.trim();
  if (raw) return raw;
  if (failLastOk >= 1) return "Ended before pickup";
  return "Failed";
}

function failureDetailLine(
  callStatus: string | null | undefined,
  errorMessage: string | null | undefined,
  reachedDialingPhase: boolean,
): string {
  if (errorMessage?.trim()) return errorMessage.trim();

  const lower = normStatus(callStatus);

  if (lower === "rejected" || lower === "busy" || lower === "user busy") {
    return "Line busy or call rejected — dialing completed on our side.";
  }
  if (
    lower === "not answered" ||
    lower === "no answer" ||
    lower === "no_answer" ||
    lower === "timeout" ||
    lower === "timed out" ||
    lower === "unanswered"
  ) {
    return "No answer — the phone rang or was dialing; the callee did not connect.";
  }
  if (lower === "cancelled" || lower === "canceled" || lower === "abandoned") {
    return "Call ended before the conversation started.";
  }
  if (lower === "failed") {
    return reachedDialingPhase
      ? "Call ended after outbound setup — no connected conversation."
      : "Call could not be completed.";
  }
  if (!callStatus?.trim() && reachedDialingPhase) {
    return "Call ended during ringing or before pickup — dispatch and dial phases completed.";
  }
  return "Call failed or not answered.";
}

function getStepIndex(lifecycle: CallLifecycle): number {
  return STEPS.findIndex((s) => s.key.includes(lifecycle));
}

export const CallProgress = ({
  lifecycle,
  jobId,
  phoneNumber,
  callStatus,
  callDurationSeconds,
  errorMessage,
  reachedDialingPhase = false,
}: CallProgressProps) => {
  const [elapsed, setElapsed] = useState(0);
  const isFailed = lifecycle === "call_failed";
  const isSuccessEnd = lifecycle === "call_ended";
  const isTerminal = isSuccessEnd || isFailed;
  const activeIndex = getStepIndex(lifecycle);
  const failLastOk = isFailed
    ? lastOkStepIndexOnFailure(callStatus, callDurationSeconds, reachedDialingPhase)
    : -1;

  const badgeText = useMemo(() => {
    const t = terminalBadgeLabel(isFailed, callStatus, reachedDialingPhase, failLastOk);
    if (isSuccessEnd && !t) return "Completed";
    return t;
  }, [isFailed, isSuccessEnd, callStatus, reachedDialingPhase, failLastOk]);

  useEffect(() => {
    if (isTerminal) return;
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [lifecycle, isTerminal]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const segmentAfterStepClass = (stepIndex: number): string => {
    if (isSuccessEnd) {
      return stepIndex < activeIndex ? "bg-green-500/40" : "bg-gray-800";
    }
    if (isFailed) {
      if (stepIndex < failLastOk) return "bg-green-500/40";
      if (stepIndex >= failLastOk) return "bg-red-500/30";
      return "bg-gray-800";
    }
    return stepIndex < activeIndex ? "bg-green-500/40" : "bg-gray-800";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {!isTerminal && (
            <motion.div
              className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          {isSuccessEnd && <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />}
          {isFailed && <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />}
          <span className="text-sm text-gray-300 font-medium truncate">+91 {phoneNumber}</span>
        </div>
        {!isTerminal && (
          <span className="text-xs text-gray-500 font-mono tabular-nums shrink-0">{formatTime(elapsed)}</span>
        )}
        {isTerminal && badgeText && (
          <span
            className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full shrink-0 ${
              isSuccessEnd
                ? "bg-green-500/15 text-green-400 border border-green-500/25"
                : "bg-red-500/15 text-red-400 border border-red-500/25"
            }`}
          >
            {badgeText}
          </span>
        )}
      </div>

      {/* Stepper: row of connectors + circles (fixed h-7) so lines meet circle centers */}
      <div className="flex w-full items-center">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex flex-1 min-w-0 flex-col items-stretch">
            <div className="flex w-full items-center min-h-[1.75rem]">
              <div
                className={`h-px flex-1 min-w-[4px] transition-colors duration-500 ${
                  i === 0 ? "opacity-0 pointer-events-none" : segmentAfterStepClass(i - 1)
                }`}
                aria-hidden
              />
              <StepCircle
                step={step}
                index={i}
                isSuccessEnd={isSuccessEnd}
                isFailed={isFailed}
                activeIndex={activeIndex}
                failLastOk={failLastOk}
              />
              <div
                className={`h-px flex-1 min-w-[4px] transition-colors duration-500 ${
                  i === STEPS.length - 1 ? "opacity-0 pointer-events-none" : segmentAfterStepClass(i)
                }`}
                aria-hidden
              />
            </div>
            <StepLabel
              step={step}
              index={i}
              isSuccessEnd={isSuccessEnd}
              isFailed={isFailed}
              activeIndex={activeIndex}
              failLastOk={failLastOk}
            />
          </div>
        ))}
      </div>

      <div className="text-[10px] text-gray-600 font-medium leading-relaxed">
        {lifecycle === "sip_pending" && "Waiting for SIP dispatch…"}
        {lifecycle === "call_dialing" && "Agent dispatched — call is ringing…"}
        {lifecycle === "call_active" && "Call is live — waiting for agent to finish…"}
        {isSuccessEnd && "Call completed — transcript & recording available"}
        {isFailed &&
          failureDetailLine(callStatus, errorMessage, reachedDialingPhase)}
      </div>

      <div className="text-[10px] text-gray-700 font-mono truncate">Job: {jobId}</div>
    </div>
  );
};

function StepCircle({
  step,
  index: i,
  isSuccessEnd,
  isFailed,
  activeIndex,
  failLastOk,
}: {
  step: (typeof STEPS)[0];
  index: number;
  isSuccessEnd: boolean;
  isFailed: boolean;
  activeIndex: number;
  failLastOk: number;
}) {
  let isDone: boolean;
  let isBad: boolean;
  let isActive: boolean;

  if (isSuccessEnd) {
    isDone = i <= activeIndex;
    isBad = false;
    isActive = false;
  } else if (isFailed) {
    isDone = i <= failLastOk;
    isBad = i > failLastOk;
    isActive = false;
  } else {
    isDone = i < activeIndex;
    isActive = i === activeIndex;
    isBad = false;
  }

  const baseRing =
    "w-7 h-7 min-w-[1.75rem] min-h-[1.75rem] rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-500 border shrink-0";

  const circleClass = isDone
    ? `${baseRing} bg-green-500/20 text-green-400 border-green-500/40`
    : isActive
      ? `${baseRing} bg-amber-500/20 text-amber-400 border-amber-500/40`
      : isBad
        ? `${baseRing} bg-red-500/20 text-red-400 border-red-500/40`
        : `${baseRing} bg-gray-800/50 text-gray-600 border-gray-700/40`;

  return (
    <div className="relative z-[1] flex items-center justify-center shrink-0 bg-gray-950 px-0.5">
      <motion.div
        className={circleClass}
        animate={isActive ? { boxShadow: ["0 0 0 0 rgba(245,158,11,0.35)", "0 0 0 6px rgba(245,158,11,0)", "0 0 0 0 rgba(245,158,11,0.35)"] } : { boxShadow: "0 0 0 0 transparent" }}
        transition={isActive ? { duration: 2, repeat: Infinity } : { duration: 0.2 }}
      >
        {isDone ? <CheckSVG /> : isBad ? <XSvg /> : <span>{step.icon}</span>}
      </motion.div>
    </div>
  );
}

function StepLabel({
  step,
  index: i,
  isSuccessEnd,
  isFailed,
  activeIndex,
  failLastOk,
}: {
  step: (typeof STEPS)[0];
  index: number;
  isSuccessEnd: boolean;
  isFailed: boolean;
  activeIndex: number;
  failLastOk: number;
}) {
  let isDone: boolean;
  let isBad: boolean;
  let isActive: boolean;

  if (isSuccessEnd) {
    isDone = i <= activeIndex;
    isBad = false;
    isActive = false;
  } else if (isFailed) {
    isDone = i <= failLastOk;
    isBad = i > failLastOk;
    isActive = false;
  } else {
    isDone = i < activeIndex;
    isActive = i === activeIndex;
    isBad = false;
  }

  return (
    <span
      className={`mt-1.5 text-[10px] uppercase tracking-wider font-medium text-center leading-tight px-0.5 whitespace-nowrap ${
        isDone ? "text-green-400" : isActive ? "text-amber-400" : isBad ? "text-red-400" : "text-gray-600"
      }`}
    >
      {step.label}
    </span>
  );
}

const CheckSVG = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XSvg = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
