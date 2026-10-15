import { createContext, useContext, type RefObject } from "react";
import type { CollectionKind, DownloadRequestOptions } from "@/lib/api-client";

/** What a row or panel needs to show next to a song before its judging detail loads. */
export interface TrackInfo {
  title: string;
  artist: string;
  album?: string;
  imageUrl?: string | null;
}

export interface AppActions {
  navigate: (path: string, opts?: { replace?: boolean; q?: string }) => void;
  /** Opens the judging panel (`?track=` in the hash). */
  openTrack: (spotifyId: string, info?: TrackInfo) => void;
  openAdd: (initial?: string) => void;
  /** Queue a collection or a selection; toasts the result and refreshes the bar. Returns how many were queued. */
  download: (
    source: { kind: CollectionKind; id: string },
    opts?: { trackIds?: string[]; options?: DownloadRequestOptions; quiet?: boolean },
  ) => Promise<number>;
  /** The scrolling main area, for the virtualized song list. */
  scrollRef: RefObject<HTMLElement | null>;
}

export const AppContext = createContext<AppActions | null>(null);

export function useApp(): AppActions {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside <AppShell>");
  return value;
}
