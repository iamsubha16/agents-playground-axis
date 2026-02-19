import { CLOUD_ENABLED, CloudConnect } from "../cloud/CloudConnect";
import { Button } from "./button/Button";
import { useState } from "react";
import { TokenSource, TokenSourceConfigurable } from "livekit-client";
import { PlaygroundConnectProps } from "@/lib/types";

const ConnectTab = ({ active, onClick, children, accentColor }: any) => {
  return (
    <button
      className={`px-4 py-3 text-sm font-medium transition-all duration-200 ${
        active
          ? `border-b-2 border-${accentColor}-500 text-${accentColor}-400`
          : "border-b-2 border-transparent text-gray-500 hover:text-gray-400 hover:border-gray-700"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const TokenConnect = ({
  accentColor,
  onConnectClicked,
}: PlaygroundConnectProps) => {
  const [url, setUrl] = useState<string>("");
  const [token, setToken] = useState<string>("");

  return (
    <div className="flex left-0 top-0 w-full h-full bg-black/80 items-center justify-center text-center">
      <div className="flex flex-col gap-4 p-8 bg-gray-950 w-full text-white border-t border-gray-800/80">
        <div className="flex flex-col gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="text-white text-sm bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2.5 transition-colors placeholder:text-gray-500 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 focus:outline-none"
            placeholder="wss://url"
          ></input>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="text-white text-sm bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2.5 transition-colors placeholder:text-gray-500 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 focus:outline-none"
            placeholder="room token..."
          ></textarea>
        </div>
        <Button
          accentColor={accentColor}
          className="w-full"
          onClick={() => {
            const source = TokenSource.literal({
              serverUrl: url,
              participantToken: token,
            });
            onConnectClicked(source, true);
          }}
        >
          Connect
        </Button>
        <a
          href="https://livekit.io/"
          className={`text-xs text-${accentColor}-500 hover:text-${accentColor}-400 hover:underline transition-colors`}
        >
          Don’t have a URL or token? Try the demo agent!
        </a>
      </div>
    </div>
  );
};

export const PlaygroundConnect = ({
  accentColor,
  onConnectClicked,
}: PlaygroundConnectProps) => {
  const [showCloud, setShowCloud] = useState(true);
  const copy = CLOUD_ENABLED
    ? "Connect to playground with LiveKit Cloud or manually with a URL and token"
    : "Connect to playground with a URL and token";
  return (
    <div className="flex left-0 top-0 w-full h-full bg-black/80 items-center justify-center text-center gap-2">
      <div className="min-h-[540px]">
        <div className="flex flex-col bg-gray-950/95 backdrop-blur-sm w-full max-w-[480px] rounded-2xl text-white border border-gray-800/80 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-2">
            <div className="px-10 space-y-2 py-8">
              <h1 className="text-2xl font-semibold tracking-tight">Connect to playground</h1>
              <p className="text-sm text-gray-400">{copy}</p>
            </div>
            {CLOUD_ENABLED && (
              <div className="flex justify-center pt-2 gap-1 border-b border-t border-gray-800/80">
                <ConnectTab
                  accentColor={accentColor}
                  active={showCloud}
                  onClick={() => setShowCloud(true)}
                >
                  LiveKit Cloud
                </ConnectTab>
                <ConnectTab
                  accentColor={accentColor}
                  active={!showCloud}
                  onClick={() => setShowCloud(false)}
                >
                  Manual
                </ConnectTab>
              </div>
            )}
          </div>
          <div className="flex flex-col bg-gray-900/20 flex-grow rounded-b-2xl">
            {showCloud && CLOUD_ENABLED ? (
              <CloudConnect
                accentColor={accentColor}
                onConnectClicked={onConnectClicked}
              />
            ) : (
              <TokenConnect
                accentColor={accentColor}
                onConnectClicked={onConnectClicked}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
