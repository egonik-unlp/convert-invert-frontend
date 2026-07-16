import { GlobalStats, NetworkStats, Playlist, Candidate, LogEntry, WorkerInfo, StartRequest, DownloadedFile } from "@/types";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const API_KEY = import.meta.env.VITE_API_KEY || "";
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
}

export interface PipelineState {
  downloadsPaused: boolean;
  lastRun?: LastRun | null;
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

export interface AppConfig {
  judgeThreshold: number;
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

const authHeaders = (headers: HeadersInit = {}): HeadersInit => ({
  ...headers,
  ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
});

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
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
    const authHint = res.status === 401 ? " Check VITE_API_KEY." : "";
    throw new Error(detail ? `${fallbackMsg}: ${detail}${authHint}` : `${fallbackMsg}${authHint}`);
  }
  return res.json();
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const fetchWorkerStatus = async (): Promise<{ workers: WorkerInfo[]; queue_len: number; failed_count: number }> => {
  const res = await fetchWithTimeout(`${API_BASE}/workers/status`, { headers: authHeaders() });
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

export const api = {
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
    const res = await fetchWithTimeout(`${API_BASE}/stats`, { headers: authHeaders() });
    return handleResponse(res, "Stats unavailable");
  },

  async getNetwork(): Promise<NetworkStats> {
    const res = await fetchWithTimeout(`${API_BASE}/network`, { headers: authHeaders() });
    return handleResponse(res, "Network offline");
  },

  async getConfig(): Promise<AppConfig> {
    const res = await fetchWithTimeout(`${API_BASE}/config`, { headers: authHeaders() });
    if (res.status === 404) {
      return {
        judgeThreshold: 0.75,
        auth: { scheme: "api_key", header: "X-API-Key" },
        tuning: fallbackTuning,
      };
    }
    const config = await handleResponse(res, "Config unavailable");
    return {
      ...config,
      tuning: { ...fallbackTuning, ...config.tuning },
    };
  },

  async getPlaylists(): Promise<Playlist[]> {
    const res = await fetchWithTimeout(`${API_BASE}/playlists`, { headers: authHeaders() });
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
      { headers: authHeaders() },
    );
    return handleResponse(res, "Track query failed");
  },

  async getCandidates(id: string | number): Promise<Candidate[]> {
    const res = await fetchWithTimeout(`${API_BASE}/tracks/${id}/candidates`, { headers: authHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async getLogs(): Promise<LogEntry[]> {
    const res = await fetchWithTimeout(`${API_BASE}/logs`, { headers: authHeaders() });
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
          headers: authHeaders({ "Content-Type": "application/json" }),
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
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(req),
    });
    return handleResponse(res, "Failed to stop workers");
  },
  
  async getDownloads(): Promise<DownloadedFile[]> {
    const res = await fetchWithTimeout(`${API_BASE}/downloads`, { headers: authHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async getActiveDownloads(): Promise<ActiveDownload[]> {
    const res = await fetchWithTimeout(`${API_BASE}/downloads/active`, { headers: authHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async getActivity(): Promise<Activity> {
    const res = await fetchWithTimeout(`${API_BASE}/activity`, { headers: authHeaders() });
    if (!res.ok) return { searching: [], judging: [], downloading: [] };
    return res.json();
  },

  async cancelDownload(id: number): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE}/downloads/cancel`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ id }),
    });
    await handleResponse(res, "Failed to cancel download");
  },

  async getPipeline(): Promise<PipelineState> {
    const res = await fetchWithTimeout(`${API_BASE}/pipeline`, { headers: authHeaders() });
    if (!res.ok) return { downloadsPaused: false };
    return res.json();
  },

  async setDownloadsPaused(paused: boolean): Promise<PipelineState> {
    const res = await fetchWithTimeout(`${API_BASE}/pipeline/${paused ? "pause" : "resume"}`, {
      method: "POST",
      headers: authHeaders(),
    });
    return handleResponse(res, `Failed to ${paused ? "pause" : "resume"} downloads`);
  },
};
