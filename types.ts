// Track lifecycle states, matching exactly what the backend emits (see api.rs). The
// backend only ever produces these six; earlier PARSING / IN_QUEUE were never sent.
export enum TrackStatus {
  SEARCHING = "SEARCHING",
  FILTERING = "FILTERING",
  DOWNLOADING = "DOWNLOADING",
  FINALIZING = "FINALIZING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface Candidate {
  id: number;
  fileId: number;
  username: string;
  filename: string;
  score: number;
  // Experimental relative-MI score recorded alongside the primary score (api.rs).
  relativeMiScore?: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  level: "info" | "debug";
}

export interface Track {
  id: string | number;
  track_id: string;
  title: string;
  artist: string;
  album: string;
  status: TrackStatus;
  progress: number;
  score?: number;
  relativeMiScore?: number;
  candidatesCount: number;
  username?: string;
  filename?: string;
  downloadStatus?: string;
  rejectReason?: string;
}

export interface Playlist {
  id: string;
  name: string;
  trackCount: number;
  totalSize: string;
  quality: string;
  lastSynced: string;
  coverArt: string;
  tracks: Track[];
  nextCursor?: number;
}

export interface NetworkStats {
  status: "CONNECTED" | "DISCONNECTED";
  user: string;
  latency: string;
  node: string;
  totalBandwidth: string;
}

export interface GlobalStats {
  totalTracks: number;
  pending: number;
  searching: number;
  judging: number;
  downloading: number;
  completed: number;
  failed: number;
  globalProgress: number;
  remainingTime: string;
  tableCounts: Record<string, number>;
}

export interface WorkerInfo {
  id: number;
  username: string;
  port: number;
  run_id: string;
  started_at_epoch_secs: number;
}

export interface StartRequest {
  worker_count?: number;
  username_prefix?: string;
  port_base?: number;
  run_id_prefix?: string;
  playlist_id?: string;
  /** Which kind of Spotify resource `playlist_id` names. Defaults to "playlist" server-side. */
  resource_kind?: "playlist" | "album" | "track";
  chunk_size?: number;
  playlist_range_start?: number;
  playlist_range_end?: number;
}

export interface DownloadedFile {
  name: string;
  size: number;
  modified: number;
  /** Playlist folder the file was filed under (absent for files in the download root). */
  folder?: string | null;
}
