"use client";

import { LoadingSVG } from "@/components/button/LoadingSVG";
// import { ChatTile } from "@/components/chat/ChatTile";
// import { ColorPicker } from "@/components/colorPicker/ColorPicker";
// import { AudioInputTile } from "@/components/config/AudioInputTile";
// import { ConfigurationPanelItem } from "@/components/config/ConfigurationPanelItem";
// import { NameValueRow, EditableNameValueRow } from "@/components/config/NameValueRow";
import { PlaygroundHeader } from "@/components/playground/PlaygroundHeader";
import {
  // PlaygroundTab,
  // PlaygroundTabbedTile,
  PlaygroundTile,
} from "@/components/playground/PlaygroundTile";
import { useConfig } from "@/hooks/useConfig";
import {
  BarVisualizer,
  // useParticipantAttributes,
  SessionProvider,
  StartAudio,
  RoomAudioRenderer,
  useSession,
  useAgent,
  // useSessionMessages,
} from "@livekit/components-react";
import {
  ConnectionState,
  TokenSourceConfigurable,
  TokenSourceFetchOptions,
  // Track,
} from "livekit-client";
import { PartialMessage } from "@bufbuild/protobuf";
// import { QRCodeSVG } from "qrcode.react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import tailwindTheme from "../../lib/tailwindTheme.preval";
// import { AttributesInspector } from "@/components/config/AttributesInspector";
// import { RpcPanel } from "./RpcPanel";
import { RoomAgentDispatch } from "livekit-server-sdk";

export interface PlaygroundMeta {
  name: string;
  value: string;
}

export interface PlaygroundProps {
  logo?: ReactNode;
  themeColors: string[];
  tokenSource: TokenSourceConfigurable;
  agentOptions?: PartialMessage<RoomAgentDispatch>;
  autoConnect?: boolean;
}

const headerHeight = 56;

export default function Playground({
  logo,
  themeColors,
  tokenSource,
  agentOptions: initialAgentOptions,
  autoConnect,
}: PlaygroundProps) {
  const { config } = useConfig();

  // const [rpcMethod, setRpcMethod] = useState("");
  // const [rpcPayload, setRpcPayload] = useState("");
  const [hasConnected, setHasConnected] = useState(false);

  const [tokenFetchOptions, setTokenFetchOptions] = useState<TokenSourceFetchOptions>();

  // initialize token fetch options from initial values, which can come from config
  useEffect(() => {
    // set initial options only if they haven't been set yet
    if (tokenFetchOptions !== undefined || initialAgentOptions === undefined) {
      return;
    }
    setTokenFetchOptions({
      agentName: initialAgentOptions?.agentName ?? "",
      agentMetadata: initialAgentOptions?.metadata ?? "",
    });
  }, [tokenFetchOptions, initialAgentOptions, initialAgentOptions?.agentName, initialAgentOptions?.metadata]);

  const session = useSession(tokenSource, tokenFetchOptions);
  const { connectionState } = session;
  const agent = useAgent(session);
  // const messages = useSessionMessages(session);


  const startSession = useCallback(() => {
    if (session.isConnected) {
      return;
    }
    session.start();
    setHasConnected(true);
  }, [session, session.isConnected]);

  useEffect(() => {
    if (autoConnect && !hasConnected) {
      startSession();
    }
  }, [autoConnect, hasConnected, startSession]);

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      session.room.localParticipant.setCameraEnabled(
        config.settings.inputs.camera,
      );
      session.room.localParticipant.setMicrophoneEnabled(
        config.settings.inputs.mic,
      );
    }
  }, [config, session.room.localParticipant, connectionState]);


  useEffect(() => {
    // Fallback to ammber if theme_color is invalid or not found
    const themeColor = config.settings.theme_color || "amber";
    
    // Default amber color as fallback if tailwindTheme is not loaded
    const defaultAmberColor = "#f59e0b";
    
    let colorValue = defaultAmberColor;
    if (tailwindTheme?.colors) {
      colorValue = (tailwindTheme.colors as any)[themeColor]?.["500"] || 
                   (tailwindTheme.colors as any).amber?.["500"] || 
                   defaultAmberColor;
    }
    
    document.body.style.setProperty(
      "--lk-theme-color",
      colorValue,
    );
    document.body.style.setProperty(
      "--lk-drop-shadow",
      `var(--lk-theme-color) 0px 0px 18px`,
    );
  }, [config.settings.theme_color]);

  const audioTileContent = useMemo(() => {
    const disconnectedContent = (
      <div className="flex flex-col items-center justify-center gap-2 text-gray-700 text-center w-full">
        No agent audio track. Connect to get started.
      </div>
    );

    const waitingContent = (
      <div className="flex flex-col items-center gap-2 text-gray-700 text-center w-full">
        <LoadingSVG />
        Waiting for agent audio track…
      </div>
    );

    const visualizerContent = (
      <div
        className={`flex items-center justify-center w-full h-48 [--lk-va-bar-width:30px] [--lk-va-bar-gap:20px] [--lk-fg:var(--lk-theme-color)]`}
      >
        <BarVisualizer
          state={agent.state}
          track={agent.microphoneTrack}
          barCount={5}
          options={{ minHeight: 20 }}
        />
      </div>
    );

    if (connectionState === ConnectionState.Disconnected) {
      return disconnectedContent;
    }

    if (!agent.microphoneTrack) {
      return waitingContent;
    }

    return visualizerContent;
  }, [
    agent.microphoneTrack,
    connectionState,
    agent.state,
  ]);

  /* --- Commented out: chat, RPC, attributes, settings, mobile tabs ---

  const chatTileContent = useMemo(() => {
    if (agent.isConnected) {
      return (
        <ChatTile
          messages={messages.messages}
          accentColor={config.settings.theme_color}
          onSend={messages.send}
        />
      );
    }
    return <></>;
  }, [
    agent.isConnected,
    config.settings.theme_color,
    messages.messages,
    messages.send,
  ]);

  const handleRpcCall = useCallback(async () => {
    if (!agent.internal.agentParticipant) {
      throw new Error("No agent or room available");
    }

    const response = await session.room.localParticipant.performRpc({
      destinationIdentity: agent.internal.agentParticipant.identity,
      method: rpcMethod,
      payload: rpcPayload,
    });
    return response;
  }, [
    session.room.localParticipant,
    rpcMethod,
    rpcPayload,
    agent.internal.agentParticipant,
  ]);

  const agentAttributes = useParticipantAttributes({
    participant: agent.internal.agentParticipant ?? undefined,
  });

  const settingsTileContent = useMemo(() => { ... }, [...]);

  let mobileTabs: PlaygroundTab[] = [];
  ...

  --- End of commented out section --- */

  return (
    <SessionProvider session={session}>
      <div className="flex flex-col h-full w-full">
        <PlaygroundHeader
          title={config.title}
          logo={logo}
          height={headerHeight}
          accentColor={config.settings.theme_color}
          connectionState={connectionState}
          onConnectClicked={() => {
            if (connectionState === ConnectionState.Disconnected) {
              startSession();
            } else if (connectionState === ConnectionState.Connected) {
              session.end();
            }
          }}
        />
        <div
          className="flex gap-4 py-4 grow w-full items-center justify-center"
          style={{ height: `calc(100% - ${headerHeight}px)` }}
        >
          <PlaygroundTile
            title="Agent Audio"
            className="w-full h-full max-w-2xl grow"
            childrenClassName="justify-center"
          >
            {audioTileContent}
          </PlaygroundTile>
        </div>
        <RoomAudioRenderer />
        <StartAudio label="Click to enable audio playback" />
      </div>
    </SessionProvider>
  );
}
