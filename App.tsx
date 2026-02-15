
import React, { useState, useEffect } from 'react';
import { 
  TrackStatus, 
  Track, 
  Playlist, 
  NetworkStats, 
  GlobalStats 
} from './types';
import { api, HealthStatus, API_BASE } from './api';
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
      
      if (h.api === 'ONLINE' && h.db === 'CONNECTED' && !Object.values(h.tables).some(v => v === false)) {
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
        setTimeout(() => setIsBooting(false), 800);
      } else if (h.error) {
        setError(h.error);
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
    const targetUrl = health?.targetUrl || `${API_BASE}/health`;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background-dark flex-col p-4 md:p-8 text-left font-mono overflow-y-auto">
        <div className="max-w-5xl w-full bg-surface/20 border border-primary/20 rounded-2xl p-6 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Animated Scanline */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(19,236,91,0.05)_50%,transparent_50%)] bg-[length:100%_4px] opacity-20 animate-pulse"></div>

          <div className="flex items-center gap-6 mb-10 border-b border-primary/10 pb-8 relative z-10">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_30px_rgba(19,236,91,0.2)]">
              <span className="material-icons text-4xl animate-spin">router</span>
            </div>
            <div>
              <h1 className="text-3xl font-black text-primary tracking-tighter uppercase leading-none mb-2">SyncDash Diagnostics</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em]">Checking connection to PostgreSQL</p>
            </div>
          </div>

          <div className="mb-10 bg-black/40 border border-white/5 rounded-2xl p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              {/* Local Browser Node */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400">
                  <span className="material-icons text-2xl">laptop</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Browser Host</span>
                  <p className="text-[10px] text-slate-400 font-mono">{window.location.host}</p>
                </div>
              </div>

              {/* Hop 1 */}
              <div className="flex flex-col items-center">
                <span className={`material-icons text-2xl mb-1 ${health?.api === 'ONLINE' ? 'text-primary' : 'text-slate-700 animate-pulse'}`}>
                  {health?.api === 'ONLINE' ? 'sync_alt' : 'trending_flat'}
                </span>
                <span className="text-[9px] font-bold text-slate-600 uppercase">Connection</span>
              </div>

              {/* Bridge Node */}
              <div className="flex flex-col items-center gap-3">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${health?.api === 'ONLINE' ? 'bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(19,236,91,0.2)]' : 'bg-slate-900 border-slate-800 text-slate-700'}`}>
                  <span className="material-icons text-3xl">hub</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bridge (API)</span>
                  <p className={`text-[10px] font-bold font-mono ${health?.api === 'ONLINE' ? 'text-primary' : 'text-slate-500'}`}>
                    {API_BASE}
                  </p>
                </div>
              </div>

              {/* Hop 2 */}
              <div className="flex flex-col items-center">
                <span className={`material-icons text-2xl mb-1 ${health?.db === 'CONNECTED' ? 'text-primary' : 'text-slate-700'}`}>
                   {health?.db === 'CONNECTED' ? 'dns' : 'more_horiz'}
                </span>
              </div>

              {/* Database Node */}
              <div className="flex flex-col items-center gap-3">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${health?.db === 'CONNECTED' ? 'bg-primary border-primary text-background-dark shadow-[0_0_20px_rgba(19,236,91,0.3)]' : 'bg-slate-900 border-slate-800 text-slate-700'}`}>
                  <span className="material-icons text-2xl">storage</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Database</span>
                  <p className={`text-[10px] font-mono ${health?.db === 'CONNECTED' ? 'text-primary' : 'text-slate-500'}`}>
                    {health?.db_config?.host === 'db' ? 'Docker DB' : health?.db_config?.host || 'Postgres'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l-2 border-primary pl-3 mb-4">HTTP Link Check</h3>
                <div className="bg-background-dark/40 p-5 rounded-xl border border-white/5 font-mono space-y-4">
                  <div>
                    <span className="text-[9px] text-slate-500 block mb-1 uppercase tracking-tighter">Target Resource:</span>
                    <span className="text-[11px] text-primary break-all bg-black/20 p-2 rounded block border border-primary/10">
                      {targetUrl}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">API Gateway:</span>
                    <span className={`font-bold ${health?.api === 'ONLINE' ? 'text-primary' : 'text-red-500'}`}>
                      {health?.api || 'INITIATING...'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l-2 border-primary pl-3 mb-4">Schema Verification</h3>
                <div className="grid grid-cols-2 gap-3 bg-background-dark/40 p-4 rounded-xl border border-white/5">
                  {health?.tables && Object.keys(health.tables).length > 0 ? Object.entries(health.tables).map(([table, exists]) => (
                    <div key={table} className="flex items-center gap-2">
                      <span className={`material-icons text-[14px] ${exists ? 'text-primary' : 'text-red-900/40'}`}>
                        {exists ? 'check_circle' : 'cancel'}
                      </span>
                      <span className={`text-[10px] font-bold ${exists ? 'text-slate-200' : 'text-slate-700'}`}>{table}</span>
                    </div>
                  )) : <p className="text-[10px] text-slate-700 col-span-2 text-center italic py-2">Gateway unreachable</p>}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l-2 border-primary pl-3 mb-4">Internal Metadata</h3>
                <div className="bg-background-dark/40 p-5 rounded-xl border border-white/5 text-[10px] font-mono space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500 italic">Node Runtime:</span>
                    <span className="text-slate-200 font-bold">{health?.env?.node_version || '--'}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                    <span className="text-slate-500 italic">Postgres Host:</span>
                    <span className="text-slate-200 font-bold">{health?.db_config?.host || '--'}:{health?.db_config?.port || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 italic">DB Catalog:</span>
                    <span className="text-slate-200">{health?.db_config?.database || '--'}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                  <div className="flex items-center gap-2 text-red-500 mb-3">
                    <span className="material-icons text-sm">report_problem</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Diagnostic Failure</span>
                  </div>
                  <code className="text-[10px] text-red-400 block break-all leading-relaxed whitespace-pre-wrap bg-black/20 p-2 rounded">
                    {error}
                  </code>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 flex gap-4 relative z-10">
            <button 
              onClick={() => { setError(null); checkHealthAndLoad(); }}
              className="flex-1 bg-primary text-background-dark font-black py-5 rounded-xl text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(19,236,91,0.2)] flex items-center justify-center gap-3"
            >
              <span className="material-icons text-sm">refresh</span>
              Retry Connection
            </button>
          </div>
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
