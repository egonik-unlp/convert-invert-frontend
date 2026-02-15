
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

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  status: TrackStatus;
  progress: number; // 0-100
  downloadSpeed?: string;
  fileSize?: string;
  format?: string;
  coverArt?: string;
  errorMessage?: string;
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
  globalProgress: number;
  remainingTime: string;
}

export interface SimilarityMatch {
  score: number;
  verdicts: {
    type: 'title' | 'artist' | 'duration' | 'bitrate';
    message: string;
    impact: string;
    status: 'pass' | 'fail' | 'warning';
  }[];
  source: {
    artist: string;
    title: string;
    album: string;
    duration: string;
  };
  match: {
    artist: string;
    fileName: string;
    path: string;
    user: string;
    duration: string;
    quality: string;
  };
  alternatives: {
    id: string;
    score: number;
    user: string;
    fileName: string;
    bitrate: string;
    size: string;
  }[];
}
