
import { GlobalStats, NetworkStats, Playlist, Track } from './types';

const API_BASE = '/api';

export const api = {
  async getStats(): Promise<GlobalStats> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error("Database stats unavailable");
    return res.json();
  },

  async getNetwork(): Promise<NetworkStats> {
    const res = await fetch(`${API_BASE}/network`);
    if (!res.ok) throw new Error("Network status unavailable");
    return res.json();
  },

  async getPlaylists(): Promise<Playlist[]> {
    const res = await fetch(`${API_BASE}/playlists`);
    if (!res.ok) throw new Error("Playlists fetch failed");
    return res.json();
  },

  async getPlaylist(id: string): Promise<Playlist> {
    const res = await fetch(`${API_BASE}/playlists/${id}`);
    if (!res.ok) throw new Error("Database query failed");
    return res.json();
  },

  async retryTrack(id: string | number): Promise<void> {
    await fetch(`${API_BASE}/tracks/${id}/retry`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
