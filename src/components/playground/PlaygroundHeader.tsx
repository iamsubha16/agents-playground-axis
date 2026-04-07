import { ConnectionState } from "livekit-client";
import { ReactNode } from "react";

type PlaygroundHeader = {
  logo?: ReactNode | false;
  title?: ReactNode;
  githubLink?: string;
  height: number;
  accentColor: string;
  connectionState: ConnectionState;
};

function sessionStatusMeta(state: ConnectionState): {
  label: string;
  dotClass: string;
  animate: boolean;
} {
  switch (state) {
    case ConnectionState.Connected:
      return {
        label: "Live",
        dotClass: "bg-green-500",
        animate: true,
      };
    case ConnectionState.Connecting:
    case ConnectionState.Reconnecting:
    case ConnectionState.SignalReconnecting:
      return {
        label: "Connecting…",
        dotClass: "bg-amber-400",
        animate: true,
      };
    default:
      return {
        label: "Not connected",
        dotClass: "bg-gray-500",
        animate: false,
      };
  }
}

export const PlaygroundHeader = ({
  logo,
  title,
  githubLink,
  accentColor,
  height,
  connectionState,
}: PlaygroundHeader) => {
  const embedded = logo === false;
  const status = sessionStatusMeta(connectionState);

  return (
    <div
      className={`flex gap-4 items-center shrink-0 w-full max-w-6xl mx-auto ${
        embedded
          ? "border-b border-gray-800/70 pb-3 mb-1 justify-start"
          : `pt-4 justify-between text-${accentColor}-500`
      }`}
      style={{
        minHeight: height + "px",
      }}
    >
      {embedded ? (
        <div className="flex flex-col gap-1 min-w-0 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold shrink-0">
            Voice session
          </span>
          <div
            className="inline-flex items-center gap-2 rounded-full border border-gray-800/90 bg-gray-950/50 px-3 py-1.5 w-fit"
            role="status"
            aria-live="polite"
          >
            <span
              className={`relative flex h-2 w-2 shrink-0 rounded-full ${status.dotClass} ${
                status.animate ? "animate-pulse" : ""
              }`}
            />
            <span className="text-xs font-medium text-gray-200 tabular-nums">
              {status.label}
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 basis-2/3 min-w-0 flex-1">
            <div className="flex lg:basis-1/2 shrink-0">
              <a
                href="https://audatec.in"
                className="inline-flex transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95"
              >
                {logo ?? <LKLogo />}
              </a>
            </div>
            <div className="min-w-0 text-sm lg:text-base font-semibold text-gray-100 tracking-tight lg:basis-1/2 lg:text-center">
              {title}
            </div>
          </div>
          {githubLink && (
            <div className="flex shrink-0 justify-end items-center">
              <a
                href={githubLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-amber-400 transition-all duration-200 hover:scale-110"
              >
                <GithubSVG />
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const LKLogo = () => (
  <img
    src="/favicon.ico"
    alt="Logo"
    width={28}
    height={28}
    className="object-contain"
  />
);

const GithubSVG = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 98 96"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
      fill="currentColor"
    />
  </svg>
);
