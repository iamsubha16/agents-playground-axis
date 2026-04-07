import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSVG } from "@/components/button/LoadingSVG";

const SIP_DIALER_URL = process.env.NEXT_PUBLIC_SIP_DIALER_URL || "https://dialer5.auflo.in";

const DEFAULT_TRUNKS = [
  { id: "ST_iXFxRcZBhfCL", label: "DS Test Server" }
];

const DEFAULT_AGENT = "audatec-rpc-agent-v1";

type Trunk = { id: string; label: string };

type TestCallFormProps = {
  onCallTriggered: (jobId: string, phoneNumber: string) => void;
  isCallActive: boolean;
};

export const TestCallForm = ({ onCallTriggered, isCallActive }: TestCallFormProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [trunks, setTrunks] = useState<Trunk[]>(DEFAULT_TRUNKS);
  const [selectedTrunk, setSelectedTrunk] = useState(DEFAULT_TRUNKS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom trunk add state
  const [showAddTrunk, setShowAddTrunk] = useState(false);
  const [customTrunkId, setCustomTrunkId] = useState("");
  const [customTrunkLabel, setCustomTrunkLabel] = useState("");

  const handleAddTrunk = useCallback(() => {
    const id = customTrunkId.trim();
    if (!id) return;
    const label = customTrunkLabel.trim() || id;
    const newTrunk = { id, label };
    setTrunks((prev) => [...prev, newTrunk]);
    setSelectedTrunk(id);
    setCustomTrunkId("");
    setCustomTrunkLabel("");
    setShowAddTrunk(false);
  }, [customTrunkId, customTrunkLabel]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    const cleaned = phoneNumber.replace(/\s/g, "");
    if (!/^\d{10}$/.test(cleaned)) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${SIP_DIALER_URL}/api/jobs/test-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: cleaned,
          customer_name: customerName.trim() || undefined,
          agent_name: DEFAULT_AGENT,
          sip_trunk_id: selectedTrunk,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Failed to trigger call");
      onCallTriggered(data.job_id, cleaned);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumber, customerName, selectedTrunk, onCallTriggered]);

  return (
    <div className="flex flex-col gap-4">
      {/* Customer Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
          Customer Name
        </label>
        <input
          id="test-call-name"
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Enter customer name"
          disabled={isCallActive || isLoading}
          className="w-full text-white text-sm bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2.5 transition-all placeholder:text-gray-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>

      {/* Phone Number */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
          Phone Number
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">+91</span>
          <input
            id="test-call-phone"
            type="tel"
            value={phoneNumber}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
              setPhoneNumber(val);
              if (error) setError(null);
            }}
            placeholder="10-digit number"
            disabled={isCallActive || isLoading}
            className="w-full text-white text-sm bg-gray-900/50 border border-gray-800 rounded-lg pl-10 pr-3 py-2.5 transition-all placeholder:text-gray-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Agent (read-only) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
          Agent
        </label>
        <div className="w-full text-gray-400 text-sm bg-gray-900/30 border border-gray-800/50 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          {DEFAULT_AGENT}
        </div>
      </div>

      {/* SIP Trunk */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
            SIP Trunk
          </label>
          <button
            type="button"
            onClick={() => setShowAddTrunk((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors font-medium"
          >
            {showAddTrunk ? (
              <><XIcon /> Cancel</>
            ) : (
              <><PlusIcon /> Add Custom</>
            )}
          </button>
        </div>

        <select
          id="test-call-trunk"
          value={selectedTrunk}
          onChange={(e) => setSelectedTrunk(e.target.value)}
          disabled={isCallActive || isLoading}
          className="w-full text-white text-sm bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2.5 transition-all focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 focus:outline-none appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {trunks.map((trunk) => (
            <option key={trunk.id} value={trunk.id} className="bg-gray-900">
              {trunk.label} ({trunk.id})
            </option>
          ))}
        </select>

        {/* Add Custom Trunk inline panel */}
        <AnimatePresence>
          {showAddTrunk && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 p-3 bg-gray-900/60 border border-amber-500/20 rounded-xl mt-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">
                  Add Custom Trunk
                </p>
                <input
                  type="text"
                  value={customTrunkId}
                  onChange={(e) => setCustomTrunkId(e.target.value)}
                  placeholder="Trunk ID (e.g. ST_xxxxx)"
                  className="w-full text-white text-xs bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 placeholder:text-gray-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 focus:outline-none font-mono"
                />
                <input
                  type="text"
                  value={customTrunkLabel}
                  onChange={(e) => setCustomTrunkLabel(e.target.value)}
                  placeholder="Label (optional)"
                  className="w-full text-white text-xs bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 placeholder:text-gray-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTrunk}
                  disabled={!customTrunkId.trim()}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-semibold transition-all bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PlusIcon /> Add & Select Trunk
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call Button */}
      <motion.button
        id="test-call-submit"
        onClick={handleSubmit}
        disabled={isCallActive || isLoading || phoneNumber.length !== 10}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 mt-1 ${isCallActive || isLoading || phoneNumber.length !== 10
          ? "bg-gray-800 text-gray-500 cursor-not-allowed"
          : "bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30"
          }`}
      >
        {isLoading ? (
          <LoadingSVG />
        ) : (
          <>
            <PhoneIcon />
            {isCallActive ? "Call in Progress…" : "Trigger Test Call"}
          </>
        )}
      </motion.button>
    </div>
  );
};

const PhoneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const PlusIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
