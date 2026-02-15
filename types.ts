
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
  id: string | number; // SQL ID
  track_id: number;    // Hash/Spotify ID from search_items
  title: string;
  artist: string;
  album: string;
  status: TrackStatus;
  progress: number;
  filename?: string;
  username?: string;   // Soulseek user
  fileSize?: string;
  format?: string;
  coverArt?: string;
  rejectReason?: string;
  // Added downloadSpeed to match usage in components/TrackRow.tsx
  downloadSpeed?: string;
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