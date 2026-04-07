import { motion } from "framer-motion";
import { useEffect, useState } from "react";

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
  callStatus?: string | null; // Studio call_status e.g. "Completed", "Not Answered"
  errorMessage?: string | null;
};

const STEPS: { key: CallLifecycle[]; label: string; icon: string }[] = [
  { key: ["sip_pending"], label: "Dispatching", icon: "1" },
  { key: ["call_dialing"], label: "Dialing", icon: "2" },
  { key: ["call_active"], label: "In Call", icon: "3" },
  { key: ["call_ended", "call_failed"], label: "Done", icon: "4" },
];

function getStepIndex(lifecycle: CallLifecycle): number {
  return STEPS.findIndex((s) => s.key.includes(lifecycle));
}

export const CallProgress = ({
  lifecycle,
  jobId,
  phoneNumber,
  callStatus,
  errorMessage,
}: CallProgressProps) => {
  const [elapsed, setElapsed] = useState(0);
  const isFailed = lifecycle === "call_failed";
  const isTerminal = lifecycle === "call_ended" || lifecycle === "call_failed";
  const activeIndex = getStepIndex(lifecycle);

  useEffect(() => {
    if (isTerminal) return;
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [lifecycle]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isTerminal && (
            <motion.div
              className="w-2.5 h-2.5 rounded-full bg-amber-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          {lifecycle === "call_ended" && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
          {isFailed && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
          <span className="text-sm text-gray-300 font-medium">+91 {phoneNumber}</span>
        </div>
        {!isTerminal && (
          <span className="text-xs text-gray-500 font-mono tabular-nums">{formatTime(elapsed)}</span>
        )}
        {isTerminal && callStatus && (
          <span
            className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full ${
              lifecycle === "call_ended"
                ? "bg-green-500/15 text-green-400 border border-green-500/25"
                : "bg-red-500/15 text-red-400 border border-red-500/25"
            }`}
          >
            {callStatus}
          </span>
        )}
      </div>

      {/* Steps */}
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const isDone = i < activeIndex || (isTerminal && !isFailed && i === activeIndex);
          const isActive = !isTerminal && i === activeIndex;
          const isBad = isFailed && i === activeIndex;

          return (
            <div key={step.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <motion.div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                    isDone
                      ? "bg-green-500/20 text-green-400 border border-green-500/40"
                      : isActive
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        : isBad
                          ? "bg-red-500/20 text-red-400 border border-red-500/40"
                          : "bg-gray-800/50 text-gray-600 border border-gray-700/40"
                  }`}
                  animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={isActive ? { duration: 2, repeat: Infinity } : {}}
                >
                  {isDone ? <CheckSVG /> : isBad ? <XSvg /> : <span>{step.icon}</span>}
                </motion.div>
                <span
                  className={`text-[10px] uppercase tracking-wider font-medium ${
                    isDone
                      ? "text-green-400"
                      : isActive
                        ? "text-amber-400"
                        : isBad
                          ? "text-red-400"
                          : "text-gray-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 -mt-5 mx-1 transition-colors duration-500 ${
                    isDone ? "bg-green-500/40" : "bg-gray-800"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Phase label */}
      <div className="text-[10px] text-gray-600 font-medium">
        {lifecycle === "sip_pending" && "Waiting for SIP dispatch…"}
        {lifecycle === "call_dialing" && "Agent dispatched — call is ringing…"}
        {lifecycle === "call_active" && "Call is live — waiting for agent to finish…"}
        {lifecycle === "call_ended" && "Call completed — transcript & recording available"}
        {isFailed && (errorMessage || "Call failed or not answered")}
      </div>

      {/* Job ID */}
      <div className="text-[10px] text-gray-700 font-mono truncate">Job: {jobId}</div>
    </div>
  );
};

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
