
import { GlobalStats, NetworkStats, Playlist, Track, Candidate } from './types';

export const API_BASE = 'http://localhost:3124';

export interface HealthStatus {
  api: string;
  db: string;
  tables: Record<string, boolean>;
  error?: string;
  targetUrl?: string;
}

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
    if (!res.ok) throw new Error("Stats unavailable");
    return res.json();
  },

  async getNetwork(): Promise<NetworkStats> {
    const res = await fetch(`${API_BASE}/network`);
    if (!res.ok) throw new Error("Network offline");
    return res.json();
  },

  async getPlaylists(): Promise<Playlist[]> {
    const res = await fetch(`${API_BASE}/playlists`);
    if (!res.ok) return [];
    return res.json();
  },

  async getPlaylist(id: string): Promise<Playlist> {
    const res = await fetch(`${API_BASE}/playlists/${id}`);
    if (!res.ok) throw new Error("Track query failed");
    return res.json();
  },

  async getCandidates(id: string | number): Promise<Candidate[]> {
    const res = await fetch(`${API_BASE}/tracks/${id}/candidates`);
    if (!res.ok) return [];
    return res.json();
  }
};
