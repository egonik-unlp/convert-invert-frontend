
import { GlobalStats, NetworkStats, Playlist, Track } from './types';

const API_BASE = '/api';

export interface HealthStatus {
  api: string;
  db: string;
  tables: Record<string, boolean>;
  env?: {
    node_version: string;
    platform: string;
    uptime: number;
    server_ips: string[];
    memory_usage: string;
  };
  db_config?: {
    host: string;
    port: number;
    database: string;
    user: string;
  };
  error?: string;
}

export const api = {
  async getHealth(): Promise<HealthStatus> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) {
        return {
          api: 'OFFLINE (404/500)',
          db: 'UNKNOWN',
          tables: {},
          error: `API returned status ${res.status}`
        };
      }
      return await res.json();
    } catch (err: any) {
      return {
        api: 'UNREACHABLE',
        db: 'UNKNOWN',
        tables: {},
        error: `Network Error: ${err.message}. Check if db-bridge is running.`
      };
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

  async retryTrack(id: string | number): Promise<void> {
    await fetch(`${API_BASE}/tracks/${id}/retry`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
