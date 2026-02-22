
export enum TrackStatus {
  PARSING = 'PARSING',
  SEARCHING = 'SEARCHING',
  FILTERING = 'FILTERING',
  DOWNLOADING = 'DOWNLOADING',
  FINALIZING = 'FINALIZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  IN_QUEUE = 'IN_QUEUE'
}

export interface Candidate {
  id: number;
  fileId: number;
  username: string;
  filename: string;
  score: number;
  size?: string;
  speed?: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  trackId?: string;
  progress?: number;
}

export interface Track {
  id: string | number;
  track_id: string;
  title: string;
  artist: string;
  album: string;
  status: TrackStatus | 'FINALIZING';
  progress: number;
  score?: number;
  candidatesCount: number;
  username?: string;
  filename?: string;
  coverArt?: string;
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
}

export interface NetworkStats {
  status: 'CONNECTED' | 'DISCONNECTED';
  user: string;
  latency: string;
  node: string;
  totalBandwidth: string;
}

export interface GlobalStats {
  totalTracks: number;
  pending: number;
  downloading: number;
  completed: number;
  failed: number;
  globalProgress: number;
  remainingTime: string;
  tableCounts: Record<string, number>;
}

export interface WorkerInfo {
  index: number;
  username: string;
  port: number;
  pid: number;
  started_at_epoch_secs: number;
}

export interface StartRequest {
  worker_count?: number;
  username_prefix?: string;
  port_base?: number;
  run_id_prefix?: string;
  playlist_range_start?: number;
  playlist_range_end?: number;
}

export interface StopRequest {
  pids?: number[];
}
