
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
      const h = await api.getHealth();
      setHealth(h);
      
      if (h.db === 'CONNECTED' && !Object.values(h.tables).some(v => v === false)) {
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
        // Add a tiny delay to show the "Success" state on boot screen
        setTimeout(() => setIsBooting(false), 1000);
      }
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

  if (isBooting) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark flex-col p-8 text-left font-mono overflow-y-auto">
        <div className="max-w-4xl w-full bg-surface/20 border border-primary/20 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Scanline Effect */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(19,236,91,0.05)_50%,transparent_50%)] bg-[length:100%_4px] opacity-20"></div>

          <div className="flex items-center gap-6 mb-10 border-b border-primary/10 pb-6 relative z-10">
            <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_20px_rgba(19,236,91,0.2)]">
              <span className="material-icons text-3xl animate-spin">settings</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-primary tracking-tighter uppercase leading-none mb-2">SyncDash Initialization</h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Diagnostic Engine v1.1.0-Production</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {/* Core Services */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l-2 border-primary pl-3">Infrastructure Status</h3>
              <div className="bg-background-dark/40 p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">REST API Bridge</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${health?.api === 'ONLINE' ? 'bg-primary/20 text-primary' : 'bg-red-500/20 text-red-500 animate-pulse'}`}>
                    {health?.api || 'PROBING...'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">PostgreSQL Link</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${health?.db === 'CONNECTED' ? 'bg-primary/20 text-primary' : 'bg-red-500/20 text-red-500'}`}>
                    {health?.db || 'WAITING...'}
                  </span>
                </div>
              </div>

              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l-2 border-primary pl-3 pt-2">Schema Verification</h3>
              <div className="grid grid-cols-2 gap-2 bg-background-dark/40 p-4 rounded-xl border border-white/5">
                {health?.tables ? Object.entries(health.tables).map(([table, exists]) => (
                  <div key={table} className="flex items-center gap-2">
                    <span className={`material-icons text-[14px] ${exists ? 'text-primary' : 'text-slate-700'}`}>
                      {exists ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className={`text-[10px] ${exists ? 'text-slate-200' : 'text-slate-600'}`}>{table}</span>
                  </div>
                )) : <p className="text-[10px] text-slate-700 col-span-2">Awaiting sequence...</p>}
              </div>
            </div>

            {/* Environmental Details */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l-2 border-primary pl-3">System Environment</h3>
              <div className="bg-background-dark/40 p-4 rounded-xl border border-white/5 text-[10px] font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">OS Platform:</span>
                  <span className="text-slate-300">{health?.env?.platform || '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Node Runtime:</span>
                  <span className="text-slate-300">{health?.env?.node_version || '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Server Uptime:</span>
                  <span className="text-primary">{health?.env?.uptime ? `${health.env.uptime}s` : '--'}</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                  <span className="text-slate-500">Server IPs:</span>
                  <span className="text-slate-300 text-right">{health?.env?.server_ips?.join(', ') || 'Discovering...'}</span>
                </div>
              </div>

              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l-2 border-primary pl-3 pt-2">Database Metadata</h3>
              <div className="bg-background-dark/40 p-4 rounded-xl border border-white/5 text-[10px] font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">DB Host:</span>
                  <span className="text-slate-300">{health?.db_config?.host}:{health?.db_config?.port || '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Catalog:</span>
                  <span className="text-slate-300">{health?.db_config?.database || '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DB User:</span>
                  <span className="text-slate-300">{health?.db_config?.user || '--'}</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mt-8 relative z-10">
              <div className="flex items-center gap-2 text-red-500 mb-2">
                <span className="material-icons text-sm">terminal</span>
                <span className="text-[10px] font-bold uppercase">Kernel Panic Output</span>
              </div>
              <code className="text-[10px] text-red-400 block break-all leading-relaxed bg-black/20 p-2 rounded">
                {error}
              </code>
            </div>
          )}

          <div className="mt-10 flex gap-4 relative z-10">
            <button 
              onClick={() => checkHealthAndLoad()}
              className="flex-1 bg-primary text-background-dark font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(19,236,91,0.2)]"
            >
              Forced Kernel Refresh
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 border border-primary/20 text-primary rounded-xl hover:bg-primary/5 transition-colors"
            >
              <span className="material-icons">refresh</span>
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4 text-[10px] text-slate-700 uppercase tracking-[0.4em] font-bold">
          <span>Bootloader v0.98</span>
          <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
          <span>Core-Sync Stable</span>
        </div>
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
