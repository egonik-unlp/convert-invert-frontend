import {
  GlobalStats,
  NetworkStats,
  Playlist,
  Candidate,
  Judgement,
  JudgementsPage,
  LogEntry,
  WorkerInfo,
  StartRequest,
  DownloadedFile,
} from "@/types";

// Relative, so the app also works mounted under a prefix (the page itself is always at the
// app root; routes live in the hash).
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "api";
const DEFAULT_TIMEOUT_MS = 4000;
const WORKER_START_TIMEOUT_MS = 120_000;
const WORKER_START_CONFIRM_ATTEMPTS = 12;
const WORKER_START_CONFIRM_INTERVAL_MS = 2500;
export const fallbackTuning: AppConfig["tuning"] = {
  searchConcurrency: 1,
  downloadConcurrency: 1,
  searchTimeoutSecs: 20,
  searchEmptyResultCutoff: 8,
  maxCandidatesPerTrack: 8,
  maxDownloadAttemptsPerTrack: 4,
  candidateCollectionSecs: 20,
  maxSearchPassesPerTrack: 2,
  maxRequestsPerTrack: 8,
  retryBackoffMs: 1000,
  searchPacingMs: 500,
  peerCooldownSecs: 120,
  downloadHardTimeoutSecs: 180,
  downloadQueuedTimeoutSecs: 45,
  downloadStallTimeoutSecs: 30,
  workerPortRange: "41000-41000",
  shareMode: "disabled",
  sharePath: "/downloads",
  shareStatus: "disabled",
};

export interface HealthStatus {
  api: string;
  db: string;
  tables: Record<string, boolean>;
  error?: string;
  targetUrl?: string;
  jaeger?: string;
}

export interface LastRun {
  playlistId: string;
  workerCount: number;
  chunkSize: number;
  portBase: number;
  /** "playlist" | "album" | "track" — older snapshots may omit this; treat as "playlist". */
  resourceKind?: "playlist" | "album" | "track";
  /** Set when the run was extended by the next-track model. */
  extendCount?: number;
}

export interface PipelineState {
  downloadsPaused: boolean;
  lastRun?: LastRun | null;
}

export interface ResolvedResource {
  kind: "playlist" | "album" | "track";
  id: string;
  name: string;
  subtitle: string;
  image?: string;
  trackCount?: number;
}

export interface ExtensionTrack {
  id: string;
  name: string;
  artist: string;
}

/** What the next-track model would append to a Spotify resource. */
export interface ExtensionPreview {
  name: string;
  /** Tracks on the resource itself. */
  seedCount: number;
  /** Seeds found in the model's library — only these steer the extension. */
  seedsMatched: number;
  /** Size of the dominant-mood core the extension starts from. */
  coreSize: number;
  tracks: ExtensionTrack[];
}

export interface ActiveDownload {
  judgeSubmissionId: number;
  trackDbId?: number;
  filename?: string;
  username?: string;
  progress: number;
  status?: string;
}

export interface ActivityItem {
  trackId?: string;
  title: string;
  artist: string;
  stage: "searching" | "judging" | "downloading";
  progress?: number;
  judgeSubmissionId?: number;
  filename?: string;
  username?: string;
}

export interface Activity {
  searching: ActivityItem[];
  judging: ActivityItem[];
  downloading: ActivityItem[];
}

export interface JudgeConfig {
  /** "levenshtein" | "smol-judge" */
  backend: string;
  model?: string;
  /** True once the judge is an LLM, which is what makes the label UI meaningful. */
  isLlm: boolean;
  /** The labels this judge can emit, in severity order. Empty for scalar judges. */
  labels: string[];
  /** The ollama the judge talks to. Only set for the LLM backend. */
  url?: string;
  /** "env" = from the deployment config, "override" = switched from here. */
  source: string;
  /** What clearing the override would fall back to. */
  envBackend: string;
}

export const fallbackJudge: JudgeConfig = {
  backend: "levenshtein",
  isLlm: false,
  labels: [],
  source: "env",
  envBackend: "levenshtein",
};

export interface AppConfig {
  judgeThreshold: number;
  judge: JudgeConfig;
  auth: {
    scheme: string;
    header: string;
  };
  tuning: {
    searchConcurrency: number;
    downloadConcurrency: number;
    searchTimeoutSecs: number;
    searchEmptyResultCutoff: number;
    maxCandidatesPerTrack: number;
    maxDownloadAttemptsPerTrack: number;
    candidateCollectionSecs: number;
    maxSearchPassesPerTrack: number;
    maxRequestsPerTrack: number;
    retryBackoffMs: number;
    searchPacingMs: number;
    peerCooldownSecs: number;
    downloadHardTimeoutSecs: number;
    downloadQueuedTimeoutSecs: number;
    downloadStallTimeoutSecs: number;
    workerPortRange: string;
    shareMode: string;
    sharePath: string;
    shareStatus: string;
  };
}

/** Fired on any 401 so the app can drop back to the login screen. */
export const AUTH_REQUIRED_EVENT = "auth:required";

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { credentials: "include", ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
};

const handleResponse = async (res: Response, fallbackMsg: string) => {
  if (res.status === 401) window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
  if (!res.ok) {
    let detail = "";
    try {
      const errorJson = await res.json();
      detail = errorJson.error || errorJson.message || "";
    } catch (e) {
      try {
        detail = await res.text();
      } catch {
        detail = "";
      }
    }
    throw new Error(detail ? `${fallbackMsg}: ${detail}` : fallbackMsg);
  }
  return res.json();
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const fetchWorkerStatus = async (): Promise<{ workers: WorkerInfo[]; queue_len: number; failed_count: number }> => {
  const res = await fetchWithTimeout(`${API_BASE}/workers/status`);
  return handleResponse(res, "Workers unavailable");
};

const waitForStartedWorkers = async (beforeIds: Set<number>): Promise<WorkerInfo[]> => {
  for (let attempt = 0; attempt < WORKER_START_CONFIRM_ATTEMPTS; attempt += 1) {
    await sleep(WORKER_START_CONFIRM_INTERVAL_MS);
    try {
      const status = await fetchWorkerStatus();
      const started = status.workers.filter((worker) => !beforeIds.has(worker.id));
      if (started.length > 0) return started;
    } catch {
      // Keep polling; the original start request may still be finishing.
    }
  }

  return [];
};

export interface Me {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: "admin" | "member";
  status: string;
  locale?: string | null;
}

export interface LibraryItem {
  kind: "liked" | "playlist" | "album" | "track";
  id: string;
  name: string;
  owner: string;
  imageUrl?: string | null;
  trackCount: number;
}

export interface Library {
  items: LibraryItem[];
  /** True when Spotify was unreachable and this is the last known copy. */
  stale: boolean;
}

export type CollectionKind = "playlist" | "album" | "liked" | "track";

/** owned | downloading | comparing | searching | queued | failed | missing */
export type TrackState = "owned" | "downloading" | "comparing" | "searching" | "queued" | "failed" | "missing";

/** A song that is on disk, for the "Descargadas" view. */
export interface DownloadedSong {
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  imageUrl?: string;
  durationMs?: number;
  size?: number;
  /** Unix seconds. */
  addedAt?: number;
  format?: string;
  /** False when the database says downloaded but the file is missing. */
  available: boolean;
  requestedBy?: Requester;
}

export type DownloadedSort = "recent" | "artist" | "album" | "title";

export interface DownloadedPage {
  songs: DownloadedSong[];
  total: number;
  totalAll: number;
  totalBytes: number;
  nextCursor: number | null;
  collection: { id: string; name: string; folder: string | null; folderExists: boolean } | null;
}

/** Songs downloaded under one playlist/album (or "untagged"), as a card. */
export interface DownloadedCollection {
  id: string;
  name: string;
  songs: number;
  covers: string[];
  updatedAt?: number;
  folder?: string;
}

export interface Requester {
  id: number;
  name: string;
  avatarUrl?: string | null;
}

/** How the judge decided: the chosen file for downloaded tracks, the rejection for failed ones. */
export interface JudgingSummary {
  outcome: "chosen" | "rejected";
  label?: string | null;
  score?: number | null;
  filename?: string | null;
  username?: string | null;
  size?: number | null;
  format?: string | null;
  uncertain: boolean;
  candidatesChecked: number;
}

export interface TrackStatus {
  state: TrackState;
  progress?: number;
  trackDbId?: number;
  judging?: JudgingSummary;
  requestedBy?: Requester;
}

export interface CollectionTrack extends TrackStatus {
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  imageUrl?: string | null;
}

export interface CollectionMeta {
  kind: CollectionKind;
  id: string;
  name: string;
  owner: string;
  imageUrl?: string | null;
  total: number;
  durationMs: number;
}

export interface CollectionCounts {
  total: number;
  owned: number;
  inFlight: number;
  failed: number;
  missing: number;
  uncertain: number;
}

/** Full page, or (when polled with `since`) only the tracks whose state changed. */
export interface CollectionResponse {
  collection: CollectionMeta;
  counts: CollectionCounts;
  tracks?: CollectionTrack[];
  changes?: (TrackStatus & { spotifyId: string })[];
  nextCursor?: number | null;
  /** Folder a request downloads into; `.zip` streams it. Full responses only. */
  folder?: string | null;
  folderExists?: boolean;
  /** Pass back as `since` on the next poll. */
  stateToken: string;
}

export interface JudgingCandidate {
  id: number;
  filename: string;
  username: string;
  size: number;
  format?: string | null;
  score?: number | null;
  label?: string | null;
  chosen: boolean;
  rejected: boolean;
  judgements: Judgement[];
}

export type JudgingDetail =
  | { attempted: false; status: TrackStatus }
  | {
      attempted: true;
      status: TrackStatus;
      trackDbId: number;
      title: string;
      artist: string;
      album: string;
      /** What was sent to Soulseek; the relaxed second pass searches the title alone. */
      query: string;
      relaxedQuery: string;
      candidates: JudgingCandidate[];
      rejections: string[];
      uncertainBelow: number;
    };

export interface DownloadRequestOptions {
  enhancedRetries?: boolean;
  extendCount?: number;
  /** Admin only; ignored for members. */
  workerCount?: number;
  /** Admin only; ignored for members. */
  chunkSize?: number;
}

export interface QueueItem extends TrackStatus {
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
}

export interface SearchResults {
  tracks: CollectionTrack[];
  albums: LibraryItem[];
  playlists: LibraryItem[];
}

/** Library rail badge: only for collections whose track list the server has seen. */
export interface BadgeCounts {
  total: number;
  owned: number;
  inFlight: number;
  failed: number;
}

export interface UserAccount extends Me {
  /** Unix seconds. */
  lastSeenAt?: number | null;
}

export interface Queue {
  downloading: QueueItem[];
  comparing: QueueItem[];
  searching: QueueItem[];
  queued: QueueItem[];
}

/** Where "Log in with Spotify" points; the hash brings the person back to the view they were on. */
export const loginUrl = (returnTo: string = window.location.hash): string =>
  `${API_BASE}/auth/login${returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ""}`;

export const api = {
  /** The logged-in person, or null when there is no valid session. */
  async getMe(): Promise<Me | null> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/me`);
    if (res.status === 401) return null;
    return handleResponse(res, "Could not load your account");
  },

  async logout(): Promise<void> {
    await fetchWithTimeout(`${API_BASE}/auth/logout`, { method: "POST" });
  },

  async updateMe(patch: { locale: "es" | "en" }): Promise<Me> {
    const res = await fetchWithTimeout(`${API_BASE}/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return handleResponse(res, "Could not save your preferences");
  },

  async search(q: string): Promise<SearchResults> {
    const res = await fetchWithTimeout(`${API_BASE}/search?${new URLSearchParams({ q })}`, {}, 10000);
    return handleResponse(res, "Could not search Spotify");
  },

  /** Keyed `${kind}:${id}`; collections the server never resolved are left out. */
  async getCollectionsStatus(items: { kind: string; id: string }[]): Promise<Record<string, BadgeCounts>> {
    const res = await fetchWithTimeout(`${API_BASE}/collections/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const body = await handleResponse(res, "Could not load collection progress");
    return body.statuses ?? {};
  },

  async listUsers(): Promise<UserAccount[]> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/users`);
    return handleResponse(res, "Could not load people");
  },

  async inviteUser(email: string, role: "admin" | "member" = "member"): Promise<UserAccount> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    return handleResponse(res, "Could not invite");
  },

  async updateUser(id: number, patch: { role?: "admin" | "member"; status?: "active" | "disabled" }): Promise<UserAccount> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return handleResponse(res, "Could not update");
  },

  async getLibrary(opts: { refresh?: boolean } = {}): Promise<Library> {
    const res = await fetchWithTimeout(`${API_BASE}/me/library${opts.refresh ? "?refresh=1" : ""}`, {}, 15000);
    return handleResponse(res, "Could not load your Spotify library");
  },

  async getCollection(
    kind: CollectionKind,
    id: string,
    opts: { limit?: number; cursor?: number; since?: string } = {},
  ): Promise<CollectionResponse> {
    const params = new URLSearchParams();
    if (opts.limit != null) params.set("limit", String(opts.limit));
    if (opts.cursor != null) params.set("cursor", String(opts.cursor));
    if (opts.since) params.set("since", opts.since);
    const qs = params.toString();
    const res = await fetchWithTimeout(
      `${API_BASE}/collections/${kind}/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`,
      {},
      20000,
    );
    return handleResponse(res, "Could not read this collection from Spotify");
  },

  async getJudging(spotifyId: string): Promise<JudgingDetail> {
    const res = await fetchWithTimeout(`${API_BASE}/tracks/by-spotify/${encodeURIComponent(spotifyId)}/judging`);
    return handleResponse(res, "Could not load how this song was judged");
  },

  /** Queue what's missing (or a selection) from a collection. `queued: 0` means nothing to do. */
  async requestDownload(
    source: { kind: CollectionKind; id: string },
    opts: { trackIds?: string[]; options?: DownloadRequestOptions } = {},
  ): Promise<{ requestId: number | null; queued: number; mirrored?: number }> {
    const res = await fetchWithTimeout(
      `${API_BASE}/requests`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, trackIds: opts.trackIds, options: opts.options ?? {} }),
      },
      60000,
    );
    return handleResponse(res, "Could not queue the download");
  },

  async getQueue(): Promise<Queue> {
    const res = await fetchWithTimeout(`${API_BASE}/queue`);
    return handleResponse(res, "Queue unavailable");
  },

  /** Download a candidate the judge rejected ("use this file anyway"). */
  async acceptCandidate(spotifyId: string, candidateId: number): Promise<{ requestId: number }> {
    const res = await fetchWithTimeout(`${API_BASE}/tracks/by-spotify/${encodeURIComponent(spotifyId)}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId }),
    });
    return handleResponse(res, "Could not start that download");
  },

  async getHealth(): Promise<HealthStatus> {
    const targetUrl = `${API_BASE}/health`;
    try {
      const res = await fetchWithTimeout(targetUrl);
      if (!res.ok) return { api: "OFFLINE", db: "UNKNOWN", tables: {}, targetUrl, error: `Status ${res.status}` };
      const data = await res.json();
      return { ...data, targetUrl };
    } catch (err: any) {
      return { api: "UNREACHABLE", db: "UNKNOWN", tables: {}, targetUrl, error: err.message };
    }
  },

  async getStats(): Promise<GlobalStats> {
    const res = await fetchWithTimeout(`${API_BASE}/stats`);
    return handleResponse(res, "Stats unavailable");
  },

  async getNetwork(): Promise<NetworkStats> {
    const res = await fetchWithTimeout(`${API_BASE}/network`);
    return handleResponse(res, "Network offline");
  },

  async getConfig(): Promise<AppConfig> {
    const res = await fetchWithTimeout(`${API_BASE}/config`);
    if (res.status === 404) {
      return {
        judgeThreshold: 0.75,
        judge: fallbackJudge,
        auth: { scheme: "session", header: "Cookie" },
        tuning: fallbackTuning,
      };
    }
    const config = await handleResponse(res, "Config unavailable");
    return {
      ...config,
      // An older API predates the judge block; treat it as the scalar judge it was.
      judge: { ...fallbackJudge, ...config.judge },
      tuning: { ...fallbackTuning, ...config.tuning },
    };
  },

  async resolveResource(
    id: string,
    kind: "playlist" | "album" | "track",
    signal?: AbortSignal,
  ): Promise<ResolvedResource> {
    const params = new URLSearchParams({ id, kind });
    // Raw fetch (not fetchWithTimeout, which overrides `signal`) so the caller's AbortController
    // can cancel a stale in-flight preview when the input changes.
    const res = await fetch(`${API_BASE}/resolve?${params.toString()}`, {
      credentials: "include",
      signal,
    });
    return handleResponse(res, "Could not resolve that Spotify link");
  },

  /** Direct link that downloads one finished file; the session cookie rides along with the navigation. */
  fileDownloadUrl(name: string, folder?: string | null): string {
    const params = new URLSearchParams({ name, ...(folder ? { folder } : {}) });
    return `${API_BASE}/downloads/file?${params.toString()}`;
  },

  /**
   * Link every already-downloaded song of a collection into its folder (creating it), so the
   * folder's .zip is complete even for songs that were downloaded under another collection.
   */
  async fillFolder(kind: CollectionKind, id: string): Promise<{ folder: string; folderExists: boolean; linked: number }> {
    const res = await fetchWithTimeout(`${API_BASE}/collections/${kind}/${encodeURIComponent(id)}/folder`, { method: "POST" }, 60000);
    return handleResponse(res, "Could not prepare the folder");
  },

  async getDownloadedSongs(opts: {
    q?: string;
    sort?: DownloadedSort;
    collection?: string;
    cursor?: number;
    limit?: number;
  } = {}): Promise<DownloadedPage> {
    const params = new URLSearchParams();
    if (opts.q) params.set("q", opts.q);
    if (opts.sort) params.set("sort", opts.sort);
    if (opts.collection) params.set("collection", opts.collection);
    if (opts.cursor) params.set("cursor", String(opts.cursor));
    if (opts.limit) params.set("limit", String(opts.limit));
    const res = await fetchWithTimeout(`${API_BASE}/downloaded/songs?${params}`, {}, 30000);
    return handleResponse(res, "Could not load downloaded songs");
  },

  async getDownloadedCollections(): Promise<DownloadedCollection[]> {
    const res = await fetchWithTimeout(`${API_BASE}/downloaded/collections`, {}, 30000);
    const body: { collections: DownloadedCollection[] } = await handleResponse(res, "Could not load downloaded collections");
    return body.collections;
  },

  /** Link a downloaded collection's songs filed elsewhere into its folder, before its .zip. */
  async fillDownloadedFolder(id: string): Promise<{ folder: string; folderExists: boolean; linked: number }> {
    const res = await fetchWithTimeout(`${API_BASE}/downloaded/collections/${encodeURIComponent(id)}/folder`, { method: "POST" }, 60000);
    return handleResponse(res, "Could not prepare the folder");
  },

  /** Direct link to one downloaded song's file, wherever it was filed. */
  trackFileUrl(spotifyId: string): string {
    return `${API_BASE}/tracks/by-spotify/${encodeURIComponent(spotifyId)}/file`;
  },

  /** Direct link that streams a whole playlist folder as a .zip. */
  folderZipUrl(folder: string): string {
    const params = new URLSearchParams({ folder });
    return `${API_BASE}/downloads/zip?${params.toString()}`;
  },

  async previewExtension(
    id: string,
    kind: "playlist" | "album" | "track",
    count: number,
  ): Promise<ExtensionPreview> {
    const params = new URLSearchParams({ id, kind, count: String(count) });
    const res = await fetch(`${API_BASE}/extend?${params.toString()}`, { credentials: "include" });
    return handleResponse(res, "Could not extend that Spotify link");
  },

  async getPlaylists(): Promise<Playlist[]> {
    const res = await fetchWithTimeout(`${API_BASE}/playlists`);
    if (!res.ok) return [];
    return res.json();
  },

  async getPlaylist(id: string, opts: { limit?: number; cursor?: number } = {}): Promise<Playlist> {
    const params = new URLSearchParams();
    if (opts.limit != null) params.set("limit", String(opts.limit));
    if (opts.cursor != null) params.set("cursor", String(opts.cursor));
    const qs = params.toString();
    const res = await fetchWithTimeout(
      `${API_BASE}/playlists/${id}${qs ? `?${qs}` : ""}`,
      {},
    );
    return handleResponse(res, "Track query failed");
  },

  async getCandidates(id: string | number): Promise<Candidate[]> {
    const res = await fetchWithTimeout(`${API_BASE}/tracks/${id}/candidates`);
    if (!res.ok) return [];
    return res.json();
  },

  /** Switch the judge. Applies to the next run, not one already in flight. */
  async setJudge(backend: string, url?: string): Promise<JudgeConfig> {
    const res = await fetchWithTimeout(`${API_BASE}/judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backend, url }),
    });
    return handleResponse(res, "Failed to switch the judge");
  },

  /** Drop the override and go back to what the deployment configures. */
  async resetJudge(): Promise<JudgeConfig> {
    const res = await fetchWithTimeout(`${API_BASE}/judge/reset`, {
      method: "POST",
    });
    return handleResponse(res, "Failed to reset the judge");
  },

  async getJudgements(
    opts: { limit?: number; cursor?: number; judge?: string; label?: string; accepted?: boolean } = {},
  ): Promise<JudgementsPage> {
    const params = new URLSearchParams();
    if (opts.limit != null) params.set("limit", String(opts.limit));
    if (opts.cursor != null) params.set("cursor", String(opts.cursor));
    if (opts.judge) params.set("judge", opts.judge);
    if (opts.label) params.set("label", opts.label);
    if (opts.accepted != null) params.set("accepted", String(opts.accepted));
    const qs = params.toString();
    // The summary aggregates over every judgement, so this can outrun the
    // default timeout on a large history.
    const res = await fetchWithTimeout(
      `${API_BASE}/judgements${qs ? `?${qs}` : ""}`,
      {},
      8000,
    );
    return handleResponse(res, "Judgements unavailable");
  },

  async getLogs(): Promise<LogEntry[]> {
    const res = await fetchWithTimeout(`${API_BASE}/logs`);
    if (!res.ok) return [];
    return res.json();
  },

  async getWorkers(): Promise<{ workers: WorkerInfo[]; queue_len: number; failed_count: number }> {
    return fetchWorkerStatus();
  },

  async startWorkers(req: StartRequest): Promise<WorkerInfo[]> {
    let res: Response;
    const before = await fetchWorkerStatus().catch(() => null);
    const beforeIds = new Set<number>(before?.workers.map((worker) => worker.id) ?? []);

    try {
      res = await fetchWithTimeout(
        `${API_BASE}/workers/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        },
        WORKER_START_TIMEOUT_MS,
      );
    } catch (err: any) {
      if (err?.message === "Request timed out") {
        const started = await waitForStartedWorkers(beforeIds);
        if (started.length > 0) return started;
        throw new Error("Worker start timed out while the playlist was being prepared. No new workers were observed.");
      }
      throw err;
    }
    return handleResponse(res, "Failed to start workers");
  },

  async stopWorkers(req: { pids?: number[] }): Promise<number[]> {
    const res = await fetchWithTimeout(`${API_BASE}/workers/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    return handleResponse(res, "Failed to stop workers");
  },
  
  async getDownloads(): Promise<DownloadedFile[]> {
    const res = await fetchWithTimeout(`${API_BASE}/downloads`);
    if (!res.ok) return [];
    return res.json();
  },

  async getActiveDownloads(): Promise<ActiveDownload[]> {
    const res = await fetchWithTimeout(`${API_BASE}/downloads/active`);
    if (!res.ok) return [];
    return res.json();
  },

  async getActivity(): Promise<Activity> {
    const res = await fetchWithTimeout(`${API_BASE}/activity`);
    if (!res.ok) return { searching: [], judging: [], downloading: [] };
    return res.json();
  },

  async cancelDownload(id: number): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE}/downloads/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await handleResponse(res, "Failed to cancel download");
  },

  async getPipeline(): Promise<PipelineState> {
    const res = await fetchWithTimeout(`${API_BASE}/pipeline`);
    if (!res.ok) return { downloadsPaused: false };
    return res.json();
  },

  async setDownloadsPaused(paused: boolean): Promise<PipelineState> {
    const res = await fetchWithTimeout(`${API_BASE}/pipeline/${paused ? "pause" : "resume"}`, {
      method: "POST",
    });
    return handleResponse(res, `Failed to ${paused ? "pause" : "resume"} downloads`);
  },
};
