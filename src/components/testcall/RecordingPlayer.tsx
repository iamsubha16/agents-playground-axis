import { useRef, useState, useEffect, useCallback } from "react";

type RecordingPlayerProps = {
  recordingUrl: string | null;
};

export const RecordingPlayer = ({ recordingUrl }: RecordingPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [recordingUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const vol = parseFloat(e.target.value);
    if (audio) audio.volume = vol;
    setVolume(vol);
  }, []);

  const formatTime = (secs: number) => {
    if (!isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!recordingUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        No recording available
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/40 rounded-xl border border-gray-800/60">
      <audio ref={audioRef} src={recordingUrl} preload="metadata" />

      {/* Waveform-like progress bar */}
      <div className="relative h-12 flex items-center">
        <div className="absolute inset-0 flex items-center">
          {Array.from({ length: 40 }).map((_, i) => {
            const barProgress = (i / 40) * 100;
            const height = 20 + Math.sin(i * 0.7) * 15 + Math.cos(i * 1.3) * 10;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className="flex-1 flex items-center justify-center px-[1px]"
              >
                <div
                  className={`w-full rounded-full transition-all duration-150 ${
                    isActive
                      ? "bg-amber-500/80"
                      : "bg-gray-700/40"
                  }`}
                  style={{ height: `${height}%`, minHeight: "4px" }}
                />
              </div>
            );
          })}
        </div>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-amber-500 text-black flex items-center justify-center hover:bg-amber-400 transition-colors shrink-0"
        >
          {isPlaying ? <PauseSVG /> : <PlaySVG />}
        </button>

        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span className="text-gray-600">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <VolumeSVG />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolume}
            className="w-16 h-1 accent-amber-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Download link */}
      <a
        href={recordingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-gray-500 hover:text-amber-400 transition-colors self-end"
      >
        Download recording ↗
      </a>
    </div>
  );
};

const PlaySVG = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const PauseSVG = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const VolumeSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);
