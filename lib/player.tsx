import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { data } from "@/lib/data";
import { useT } from "@/lib/i18n";

/** A downloaded song the player can stream. */
export interface PlayerTrack {
  spotifyId: string;
  title: string;
  artist: string;
  album?: string;
  imageUrl?: string | null;
}

export interface Player {
  current: PlayerTrack | null;
  playing: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  /** Play `tracks` from `start`. Playing the song that is already current toggles pause instead. */
  playList: (tracks: PlayerTrack[], start: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  close: () => void;
}

export interface PlayerTime {
  time: number;
  duration: number;
}

const PlayerContext = createContext<Player | null>(null);
/** Split out so the twice-a-second time updates only re-render the bar, not every song row. */
const PlayerTimeContext = createContext<PlayerTime>({ time: 0, duration: 0 });
const VOLUME_KEY = "ci-volume";

function storedVolume(): number {
  try {
    const value = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(value) && value > 0 && value <= 1 ? value : 1;
  } catch {
    return 1;
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const audio = useMemo(() => (typeof Audio === "undefined" ? null : new Audio()), []);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(storedVolume);
  const current = index >= 0 ? queue[index] ?? null : null;
  const state = useRef({ queue, index, current });
  state.current = { queue, index, current };

  const next = useCallback(() => {
    const { queue, index } = state.current;
    if (index + 1 < queue.length) setIndex(index + 1);
    else audio?.pause();
  }, [audio]);

  const prev = useCallback(() => {
    if (!audio) return;
    // Like every player: a few seconds in, "previous" restarts the song.
    if (audio.currentTime > 3 || state.current.index <= 0) audio.currentTime = 0;
    else setIndex(state.current.index - 1);
  }, [audio]);

  const toggle = useCallback(() => {
    if (!audio || !state.current.current) return;
    if (audio.paused) void audio.play().catch(() => {});
    else audio.pause();
  }, [audio]);

  const playList = useCallback(
    (tracks: PlayerTrack[], start: number) => {
      const target = tracks[start];
      if (!target) return;
      if (state.current.current?.spotifyId === target.spotifyId) {
        toggle();
        return;
      }
      setQueue(tracks);
      setIndex(start);
    },
    [toggle],
  );

  const seek = useCallback(
    (seconds: number) => {
      if (audio && Number.isFinite(seconds)) audio.currentTime = Math.max(0, seconds);
    },
    [audio],
  );

  const setVolume = useCallback(
    (value: number) => {
      const clamped = Math.min(1, Math.max(0, value));
      setVolumeState(clamped);
      if (audio) audio.volume = clamped;
      try {
        localStorage.setItem(VOLUME_KEY, String(clamped));
      } catch {
        // Not remembered; fine.
      }
    },
    [audio],
  );

  const close = useCallback(() => {
    audio?.pause();
    audio?.removeAttribute("src");
    audio?.load();
    setQueue([]);
    setIndex(-1);
    setTime(0);
    setDuration(0);
  }, [audio]);

  // Load and start whatever became current.
  useEffect(() => {
    if (!audio || !current) return;
    audio.src = data.trackStreamUrl(current.spotifyId);
    setTime(0);
    setDuration(0);
    void audio.play().catch((err: unknown) => {
      // Autoplay refusals leave it paused and ready; real load errors arrive as "error" below.
      if (err instanceof DOMException && err.name === "NotAllowedError") setPlaying(false);
    });
  }, [audio, current]);

  useEffect(() => {
    if (!audio) return;
    audio.volume = volume;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setTime(audio.currentTime);
    const onDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onError = () => {
      const failed = state.current.current;
      if (!failed || !audio.getAttribute("src")) return;
      toast.error(t.player.error(failed.title));
      next();
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("ended", next);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("ended", next);
      audio.removeEventListener("error", onError);
    };
    // volume is applied on change by setVolume; this only wires the element once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio, next, t]);

  // Lock screen, headphones and media keys.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    session.metadata = current
      ? new MediaMetadata({
          title: current.title,
          artist: current.artist,
          album: current.album ?? "",
          artwork: current.imageUrl ? [{ src: current.imageUrl, sizes: "640x640" }] : [],
        })
      : null;
    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ["play", current ? () => void audio?.play() : null],
      ["pause", current ? () => audio?.pause() : null],
      ["nexttrack", current ? next : null],
      ["previoustrack", current ? prev : null],
      ["seekto", current ? (details) => seek(details.seekTime ?? 0) : null],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Unsupported action on this browser.
      }
    }
  }, [audio, current, next, prev, seek]);

  // Stop when the app goes away (logout unmounts the shell).
  useEffect(() => () => audio?.pause(), [audio]);

  const player = useMemo<Player>(
    () => ({
      current,
      playing,
      hasNext: index + 1 < queue.length,
      hasPrev: index > 0,
      playList,
      toggle,
      next,
      prev,
      seek,
      volume,
      setVolume,
      close,
    }),
    [current, playing, index, queue.length, playList, toggle, next, prev, seek, volume, setVolume, close],
  );
  const timing = useMemo(() => ({ time, duration }), [time, duration]);

  return (
    <PlayerContext.Provider value={player}>
      <PlayerTimeContext.Provider value={timing}>{children}</PlayerTimeContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayer(): Player {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return value;
}

export function usePlayerTime(): PlayerTime {
  return useContext(PlayerTimeContext);
}
