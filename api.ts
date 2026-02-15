
import { GlobalStats, NetworkStats, Playlist, Track } from './types';

const API_BASE = '/api';

export const api = {
  async getStats(): Promise<GlobalStats> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error("Stats fetch failed");
    return res.json();
  },

  async getNetwork(): Promise<NetworkStats> {
    const res = await fetch(`${API_BASE}/network`);
    if (!res.ok) throw new Error("Network fetch failed");
    return res.json();
  },

  async getPlaylists(): Promise<Playlist[]> {
    const res = await fetch(`${API_BASE}/playlists`);
    if (!res.ok) throw new Error("Playlists fetch failed");
    return res.json();
  },

  async getPlaylist(id: string): Promise<Playlist> {
    // In your Rust app, this might just be the result of a joined query on search_items
    const res = await fetch(`${API_BASE}/playlists/${id}`);
    if (!res.ok) throw new Error("Playlist detail fetch failed");
    return res.json();
  },

  async retryTrack(id: string | number): Promise<void> {
    // Links to your retry_request table logic
    await fetch(`${API_BASE}/tracks/${id}/retry`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
