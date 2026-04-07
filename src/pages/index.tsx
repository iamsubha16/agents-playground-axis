import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import { useState } from "react";


import Playground from "@/components/playground/Playground";
import { PlaygroundToast } from "@/components/toast/PlaygroundToast";
import { TestCallPanel } from "@/components/testcall/TestCallPanel";
import { ConfigProvider, useConfig } from "@/hooks/useConfig";
import { ToastProvider, useToast } from "@/components/toast/ToasterProvider";
import { TokenSourceConfigurable, TokenSource } from "livekit-client";
import { Agent } from "@/lib/types";

const themeColors = [
  "amber",
  // "green",
  // "cyan",
  // "blue",
  // "violet",
  // "rose",
  // "pink",
  // "teal",
];

const availableAgents: Agent[] = [
  // { name: "axis-bank-rpc-agent", label: "Axis Bank Agent" },
  // { name: "vijay-doctor-loan-sales-agent", label: "Doctor Loan Sales Agent" },
  { name: "audatec-bounce-reminder-code-switch-agent", label: "DS Demo Agent" },
  { name: "audatec-bounce-reminder-code-switch-agent-local", label: "Audatec Demo Agent" },
  // Add more agents here as needed:
  // { name: "my-other-agent", label: "My Other Agent" },
];

type AppTab = "playground" | "test-call";

export default function Home() {
  return (
    <ToastProvider>
      <ConfigProvider>
        <HomeInner />
      </ConfigProvider>
    </ToastProvider>
  );
}

export function HomeInner() {
  const { config } = useConfig();
  const { toastMessage, setToastMessage } = useToast();
  const [activeTab, setActiveTab] = useState<AppTab>("playground");
  const [tokenSource] = useState<TokenSourceConfigurable>(
    () => TokenSource.endpoint("/api/token"),
  );

  return (
    <>
      <Head>
        <title>{config.title}</title>
        <meta name="description" content={config.description} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta
          property="og:image"
          content="https://livekit.io/images/og/agents-playground.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="relative flex flex-col px-4 items-center h-full w-full bg-black repeating-square-background">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className="left-0 right-0 top-0 absolute z-10"
              initial={{ opacity: 0, translateY: -50 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -50 }}
            >
              <PlaygroundToast />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4 w-full max-w-6xl pt-4 pb-2">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="https://audatec.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95"
              aria-label="Audatec"
            >
              <img
                src="/favicon.ico"
                alt=""
                width={28}
                height={28}
                className="object-contain"
              />
            </a>
            <span className="text-sm font-semibold text-gray-100 tracking-tight truncate">
              {config.title}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-900/60 rounded-xl p-1 border border-gray-800/60 shrink-0">
            <TabButton
              active={activeTab === "playground"}
              onClick={() => setActiveTab("playground")}
              icon={<AgentIconSVG />}
            >
              Agent Playground
            </TabButton>
            <TabButton
              active={activeTab === "test-call"}
              onClick={() => setActiveTab("test-call")}
              icon={<PhoneIconSVG />}
            >
              Test Call
            </TabButton>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "playground" ? (
              <motion.div
                key="playground"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex items-center justify-center"
              >
                <Playground
                  themeColors={themeColors}
                  tokenSource={tokenSource}
                  autoConnect={false}
                  availableAgents={availableAgents}
                  logo={false}
                />
              </motion.div>
            ) : (
              <motion.div
                key="test-call"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex justify-center"
              >
                <TestCallPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}

const TabButton = ({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
      active
        ? "bg-amber-500/15 text-amber-400 shadow-sm"
        : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/40"
    }`}
  >
    {icon}
    {children}
  </button>
);

const AgentIconSVG = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  </svg>
);

const PhoneIconSVG = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
