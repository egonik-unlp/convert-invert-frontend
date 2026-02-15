
import { GlobalStats, NetworkStats, Playlist, Track } from './types';

const API_BASE = '/api';

export const api = {
  async getStats(): Promise<GlobalStats> {
    const res = await fetch(`${API_BASE}/stats`);
    return res.json();
  },

  async getNetwork(): Promise<NetworkStats> {
    const res = await fetch(`${API_BASE}/network`);
    return res.json();
  },

  async getPlaylists(): Promise<Playlist[]> {
    const res = await fetch(`${API_BASE}/playlists`);
    return res.json();
  },

  async getPlaylist(id: string): Promise<Playlist> {
    const res = await fetch(`${API_BASE}/playlists/${id}`);
    return res.json();
  },

  async retryTrack(id: string): Promise<void> {
    await fetch(`${API_BASE}/tracks/${id}/retry`, { method: 'POST' });
  },

  async syncPlaylist(url: string, quality: string): Promise<void> {
    await fetch(`${API_BASE}/playlists/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, quality }),
    });
  }
};
