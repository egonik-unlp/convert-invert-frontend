
import React, { useState, useEffect } from 'react';
import { 
  TrackStatus, 
  Track, 
  Playlist, 
  NetworkStats, 
  GlobalStats 
} from './types';
import { api, HealthStatus } from './api';
import Sidebar from './components/Sidebar';
import StatsHeader from './components/StatsHeader';
import TrackRow from './components/TrackRow';
import GlobalFooter from './components/GlobalFooter';
import SimilarityModal from './components/SimilarityModal';

const App: React.FC = () => {
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [network, setNetwork] = useState<NetworkStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  const checkHealthAndLoad = async () => {
    try {
      // 1. Diagnostics Phase
      const h = await api.getHealth();
      setHealth(h);
      
      if (h.db !== 'CONNECTED' || Object.values(h.tables).some(v => v === false)) {
        // Keep in diagnostic mode if DB is broken or schema missing
        return;
      }

      // 2. Data Loading Phase
      const [s, n, p] = await Promise.all([
        api.getStats(),
        api.getNetwork(),
        api.getPlaylists()
      ]);
      
      setStats(s);
      setNetwork(n);
      
      if (p && p.length > 0) {
        const detailed = await api.getPlaylist(p[0].id);
        setActivePlaylist(detailed);
      }
      
      setError(null);
      setIsBooting(false); // Transition to Dashboard
    } catch (err: any) {
      console.error("SyncDash Diagnostic Error:", err);
      setError(err.message || "Fatal error connecting to DB Bridge.");
    }
  };

  useEffect(() => {
    checkHealthAndLoad();
    const interval = setInterval(() => {
      if (isBooting) checkHealthAndLoad();
      else loadDashboardData();
    }, 5000);
    return () => clearInterval(interval);
  }, [isBooting]);

  const loadDashboardData = async () => {
    try {
      const [s, n] = await Promise.all([api.getStats(), api.getNetwork()]);
      setStats(s);
      setNetwork(n);
      if (activePlaylist) {
        const detailed = await api.getPlaylist(activePlaylist.id);
        setActivePlaylist(detailed);
      }
    } catch (e) {
      console.warn("Dashboard refresh failed, checking health...");
      setIsBooting(true);
    }
  };

  const handleTrackClick = (track: Track) => {
    setSelectedTrack(track);
    setIsModalOpen(true);
  };

  // --- DIAGNOSTIC RENDER ---
  if (isBooting) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark flex-col p-8 text-left font-mono">
        <div className="max-w-2xl w-full bg-surface/20 border border-primary/20 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-10 border-b border-primary/10 pb-6">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center text-primary border border-primary/30">
              <span className="material-icons animate-spin">settings</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-primary tracking-tighter uppercase">SyncDash System Boot</h1>
              <p className="text-xs text-slate-500">Checking internal database bridges...</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">1. API Bridge Reachability</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${health?.api === 'ONLINE' ? 'bg-primary/20 text-primary' : 'bg-red-500/20 text-red-500 animate-pulse'}`}>
                {health?.api || 'CONNECTING...'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">2. PostgreSQL Connection</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${health?.db === 'CONNECTED' ? 'bg-primary/20 text-primary' : 'bg-red-500/20 text-red-500'}`}>
                {health?.db || 'WAITING...'}
              </span>
            </div>

            <div className="border-t border-white/5 pt-6 mt-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4 font-bold">Schema Verification</p>
              <div className="grid grid-cols-2 gap-4">
                {health?.tables && Object.entries(health.tables).map(([table, exists]) => (
                  <div key={table} className="flex items-center gap-3">
                    <span className={`material-icons text-sm ${exists ? 'text-primary' : 'text-slate-700'}`}>
                      {exists ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className={`text-xs ${exists ? 'text-slate-200' : 'text-slate-600'}`}>{table}</span>
                  </div>
                ))}
                {!health && <p className="text-xs text-slate-700">Awaiting schema validation...</p>}
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mt-6">
                <div className="flex items-center gap-2 text-red-500 mb-2">
                  <span className="material-icons text-sm">warning</span>
                  <span className="text-xs font-bold">BOOT_FAILURE_LOG</span>
                </div>
                <code className="text-[10px] text-red-400 block break-all leading-relaxed">
                  {error}
                </code>
              </div>
            )}
          </div>

          <div className="mt-10 flex gap-4">
            <button 
              onClick={() => checkHealthAndLoad()}
              className="flex-1 bg-primary text-background-dark font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Forced Re-Sync
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 border border-primary/20 text-primary rounded-xl hover:bg-primary/5"
            >
              <span className="material-icons">refresh</span>
            </button>
          </div>
        </div>

        <p className="mt-8 text-[10px] text-slate-700 uppercase tracking-[0.3em]">
          SyncDash Diagnostic Engine v1.0.4-Stable
        </p>
      </div>
    );
  }

  // --- DASHBOARD RENDER ---
  return (
    <div className="flex h-screen bg-background-dark text-slate-100 font-sans">
      <Sidebar network={network || { status: 'DISCONNECTED', user: '...', latency: '...', node: '...', totalBandwidth: '...' }} />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {stats && <StatsHeader stats={stats} />}
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {activePlaylist && (
            <>
              <div className="mb-8 flex flex-col md:flex-row items-end justify-between gap-6">
                <div className="flex gap-6 items-center">
                  <img 
                    src={activePlaylist.coverArt} 
                    alt={activePlaylist.name}
                    className="w-32 h-32 rounded-xl shadow-2xl object-cover border-2 border-primary/20"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                        Live Dashboard
                      </span>
                      <span className="text-slate-500 text-xs font-medium">Synced {activePlaylist.lastSynced}</span>
                    </div>
                    <h2 className="text-4xl font-black mb-1">{activePlaylist.name}</h2>
                    <p className="text-slate-500 font-medium">
                      {activePlaylist.trackCount} Tracks Found in Database • {activePlaylist.quality}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-12 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest pb-2">
                  <div className="col-span-4">Track Information</div>
                  <div className="col-span-6">Sync Status & Progress</div>
                  <div className="col-span-2 text-right">Details</div>
                </div>
                
                {activePlaylist.tracks.length > 0 ? (
                  activePlaylist.tracks.map(track => (
                    <TrackRow 
                      key={track.id} 
                      track={track} 
                      onClick={() => handleTrackClick(track)} 
                    />
                  ))
                ) : (
                  <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl bg-surface/10">
                    <span className="material-icons text-4xl text-slate-700 mb-2">inventory_2</span>
                    <p className="text-slate-500 font-medium">No tracks found in the search_items table yet.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {stats && network && <GlobalFooter stats={stats} network={network} />}
      </main>

      {isModalOpen && (
        <SimilarityModal track={selectedTrack} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default App;
