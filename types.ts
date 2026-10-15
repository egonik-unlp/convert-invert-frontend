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

// The LLM judge's verdict taxonomy, in severity order. It is trained on exactly
// these four — `not_music` and `uncertain` exist for human labellers but were
// never taught to the model, so they can never come back.
export type JudgementLabel = "exact" | "wrong_version" | "wrong_artist" | "different";

// One judge's verdict on one candidate. Judges that only produce a number
// (levenshtein, relative_mi) leave `label` and `model` unset.
export interface Judgement {
  id: number;
  judge: string;
  model?: string;
  label?: JudgementLabel | string;
  score: number;
  accepted: boolean;
  latencyMs: number;
  promptVersion?: string;
  // The judge's literal reply, kept for auditing a surprising verdict.
  raw?: string;
  // Present when the judge failed and a fallback score stood in for it.
  error?: string;
  /** Unix seconds. */
  createdAt: number;
}

// A verdict plus the track and file it is about — the row shape of the
// judgements feed, which reads across tracks rather than within one.
export interface JudgementFeedItem extends Judgement {
  submissionId: number;
  trackDbId: number;
  /** Spotify track id; opens the judging panel. */
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  filename: string;
  username: string;
}

export interface JudgementSummary {
  total: number;
  accepted: number;
  errors: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  labels: { label: string; count: number }[];
  judges: { judge: string; model?: string; count: number; accepted: number; errors: number; avgLatencyMs: number }[];
}

export interface JudgementsPage {
  summary: JudgementSummary;
  items: JudgementFeedItem[];
  nextCursor?: number;
}

export interface Candidate {
  id: number;
  fileId: number;
  username: string;
  filename: string;
  score: number;
  // Experimental relative-MI score recorded alongside the primary score (api.rs).
  relativeMiScore?: number;
  // The deciding judge's label, hoisted out of `judgements` by the API.
  label?: JudgementLabel | string;
  judgements: Judgement[];
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
  /** Opt-in "extra retries": more download/search attempts and longer per-download timeouts. */
  enhanced_retries?: boolean;
  /** Continue the resource with this many tracks picked by the next-track model and download them too. */
  extend_count?: number;
}

export interface DownloadedFile {
  name: string;
  size: number;
  modified: number;
  /** Playlist folder the file was filed under (absent for files in the download root). */
  folder?: string | null;
}
