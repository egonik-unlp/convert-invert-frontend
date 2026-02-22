
import { GlobalStats, NetworkStats, Playlist, Track, Candidate, LogEntry, WorkerInfo, StartRequest, StopRequest, StatusResponse } from './types';

export const API_BASE = 'http://localhost:3124';

export interface HealthStatus {
  api: string;
  db: string;
  tables: Record<string, boolean>;
  error?: string;
  targetUrl?: string;
  jaeger?: string;
}

export interface JaegerTrace {
  data: Array<{
    traceID: string;
    spans: Array<{
      operationName: string;
      startTime: number;
      duration: number;
      tags: Array<{ key: string; value: any }>;
      logs: Array<{ timestamp: number; fields: Array<{ key: string; value: any }> }>;
    }>;
  }>;
}

const handleResponse = async (res: Response, fallbackMsg: string) => {
  if (!res.ok) {
    let detail = "";
    try {
      const errorJson = await res.json();
      detail = errorJson.error || errorJson.message || "";
    } catch (e) {}
    throw new Error(detail ? `${fallbackMsg}: ${detail}` : fallbackMsg);
  }
  return res.json();
};

export const api = {
  async getHealth(): Promise<HealthStatus> {
    const targetUrl = `${API_BASE}/health`;
    try {
      const res = await fetch(targetUrl);
      if (!res.ok) return { api: 'OFFLINE', db: 'UNKNOWN', tables: {}, targetUrl, error: `Status ${res.status}` };
      const data = await res.json();
      return { ...data, targetUrl };
    } catch (err: any) {
      return { api: 'UNREACHABLE', db: 'UNKNOWN', tables: {}, targetUrl, error: err.message };
    }
  },

  async getStats(): Promise<GlobalStats> {
    const res = await fetch(`${API_BASE}/stats`);
    return handleResponse(res, "Stats unavailable");
  },

  async getNetwork(): Promise<NetworkStats> {
    const res = await fetch(`${API_BASE}/network`);
    return handleResponse(res, "Network offline");
  },

  async getPlaylists(): Promise<Playlist[]> {
    const res = await fetch(`${API_BASE}/playlists`);
    if (!res.ok) return [];
    return res.json();
  },

  async getPlaylist(id: string): Promise<Playlist> {
    const res = await fetch(`${API_BASE}/playlists/${id}`);
    return handleResponse(res, "Track query failed");
  },

  async getCandidates(id: string | number): Promise<Candidate[]> {
    const res = await fetch(`${API_BASE}/tracks/${id}/candidates`);
    if (!res.ok) return [];
    return res.json();
  },

  async getLogs(): Promise<LogEntry[]> {
    const res = await fetch(`${API_BASE}/logs`);
    if (!res.ok) return [];
    return res.json();
  },

  async getWorkers(): Promise<StatusResponse> {
    const res = await fetch(`${API_BASE}/workers/status`);
    if (!res.ok) return { workers: [], queue_len: 0, failed_count: 0 };
    return res.json();
  },

  async startWorkers(req: StartRequest): Promise<WorkerInfo[]> {
    const res = await fetch(`${API_BASE}/workers/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return handleResponse(res, "Failed to start workers");
  },

  async stopWorkers(req: StopRequest): Promise<number[]> {
    const res = await fetch(`${API_BASE}/workers/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return handleResponse(res, "Failed to stop workers");
  }
};
