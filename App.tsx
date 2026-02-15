
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
    const clientHost = window.location.host;
    const targetUrl = health?.targetUrl || `${window.location.origin}${API_BASE}`;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background-dark flex-col p-4 md:p-8 text-left font-mono overflow-y-auto">
        <div className="max-w-5xl w-full bg-surface/20 border border-primary/20 rounded-2xl p-6 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Animated Scanline */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(19,236,91,0.05)_50%,transparent_50%)] bg-[length:100%_4px] opacity-20 animate-pulse"></div>

          <div className="flex items-center gap-6 mb-10 border-b border-primary/10 pb-8 relative z-10">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_30px_rgba(19,236,91,0.2)]">
              <span className="material-icons text-4xl animate-spin">settings</span>
            </div>
            <div>
              <h1 className="text-3xl font-black text-primary tracking-tighter uppercase leading-none mb-2">SyncDash Boot Sequence</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em]">Diagnostic Mode [STABLE_1.2]</p>
            </div>
          </div>

          {/* Network Topology Visualization */}
          <div className="mb-10 bg-black/40 border border-white/5 rounded-2xl p-6 relative z-10">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Connection Topology</h3>
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 relative">
              {/* Connector Lines */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-800 -translate-y-1/2 hidden md:block"></div>
              
              {/* Client Node */}
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 shadow-lg">
                  <span className="material-icons text-xl">laptop</span>
                </div>
                <div className="text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Your Client</span>
                  <p className="text-[10px] text-slate-300 font-mono">{clientHost}</p>
                </div>
              </div>

              {/* API Bridge Node */}
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${health?.api === 'ONLINE' ? 'bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(19,236,91,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                  <span className={`material-icons text-2xl ${health?.api === 'ONLINE' ? 'animate-pulse' : ''}`}>hub</span>
                </div>
                <div className="text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">API Bridge</span>
                  <p className={`text-[10px] font-mono ${health?.api === 'ONLINE' ? 'text-primary' : 'text-slate-400'}`}>
                    {health?.env?.server_ips?.[0] || 'Resolving...'}
                  </p>
                </div>
              </div>

              {/* Database Node */}
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${health?.db === 'CONNECTED' ? 'bg-primary border-primary text-background-dark shadow-[0_0_20px_rgba(19,236,91,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                  <span className="material-icons text-xl">storage</span>
                </div>
                <div className="text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">PostgreSQL</span>
                  <p className={`text-[10px] font-mono ${health?.db === 'CONNECTED' ? 'text-primary' : 'text-slate-400'}`}>
                    {health?.db_config?.host || 'localhost'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {/* Connection Details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l-2 border-primary pl-3 mb-4">Network Analysis</h3>
                <div className="bg-background-dark/40 p-4 rounded-xl border border-white/5 space-y-3 font-mono">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">Attempting Connection To:</span>
                    <span className="text-primary truncate ml-4 max-w-[200px]" title={targetUrl}>{targetUrl}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">API Status:</span>
                    <span className={`font-bold ${health?.api === 'ONLINE' ? 'text-primary' : 'text-red-500 animate-pulse'}`}>
                      {health?.api || 'INITIATING...'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-2">
                    <span className="text-slate-500">Database Link:</span>
                    <span className={`font-bold ${health?.db === 'CONNECTED' ? 'text-primary' : 'text-slate-500'}`}>
                      {health?.db || 'STANDBY'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l-2 border-primary pl-3 mb-4">Schema Verification</h3>
                <div className="grid grid-cols-2 gap-3 bg-background-dark/40 p-4 rounded-xl border border-white/5">
                  {health?.tables ? Object.entries(health.tables).map(([table, exists]) => (
                    <div key={table} className="flex items-center gap-2">
                      <span className={`material-icons text-[14px] ${exists ? 'text-primary' : 'text-slate-800'}`}>
                        {exists ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span className={`text-[10px] uppercase font-bold tracking-tighter ${exists ? 'text-slate-200' : 'text-slate-700'}`}>{table}</span>
                    </div>
                  )) : <p className="text-[10px] text-slate-700 italic">Awaiting schema poll...</p>}
                </div>
              </div>
            </div>

            {/* Environmental & Hardware */}
            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l-2 border-primary pl-3 mb-4">System Environment</h3>
                <div className="bg-background-dark/40 p-5 rounded-xl border border-white/5 text-[10px] font-mono space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500 italic">Backend Runtime</span>
                    <span className="text-slate-200 font-bold">{health?.env?.node_version || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 italic">Host Platform</span>
                    <span className="text-slate-200">{health?.env?.platform || '--'}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span className="text-slate-500 italic">Memory Allocation</span>
                    <span className="text-slate-200">{health?.env?.memory_usage || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 italic">Process Uptime</span>
                    <span className="text-primary font-bold">{health?.env?.uptime ? `${health.env.uptime}s` : '--'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l-2 border-primary pl-3 mb-4">Server Interface(s)</h3>
                <div className="bg-background-dark/40 p-4 rounded-xl border border-white/5">
                  <div className="flex flex-wrap gap-2">
                    {health?.env?.server_ips?.length ? health.env.server_ips.map(ip => (
                      <span key={ip} className="px-2 py-1 bg-primary/5 border border-primary/20 text-primary text-[9px] rounded font-bold">
                        {ip}
                      </span>
                    )) : (
                      <span className="text-[10px] text-slate-700 italic">Querying server interfaces...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-xl mt-10 relative z-10 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <span className="material-icons text-xl">warning_amber</span>
                <span className="text-xs font-black uppercase tracking-widest">Diagnostic Kernel Exception</span>
              </div>
              <div className="bg-black/40 p-4 rounded border border-red-500/10">
                <code className="text-[10px] text-red-400 block break-all leading-relaxed whitespace-pre-wrap">
                  {error}
                </code>
              </div>
              <p className="mt-4 text-[9px] text-red-500/60 italic">Verify your DATABASE_URL in the .env file and ensure the db-bridge service is running in Docker.</p>
            </div>
          )}

          <div className="mt-12 flex gap-4 relative z-10">
            <button 
              onClick={() => { setError(null); checkHealthAndLoad(); }}
              className="flex-1 bg-primary text-background-dark font-black py-5 rounded-xl text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(19,236,91,0.2)] flex items-center justify-center gap-3"
            >
              <span className="material-icons text-sm">restart_alt</span>
              Forced Interface Sync
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 border border-primary/20 text-primary rounded-xl hover:bg-primary/5 transition-colors group"
              title="Full Browser Reload"
            >
              <span className="material-icons group-hover:rotate-180 transition-transform duration-500">refresh</span>
            </button>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-6 text-[10px] text-slate-800 uppercase tracking-[0.5em] font-black">
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-slate-800 rounded-full animate-ping"></span> LOG_STREAM</span>
          <span className="w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
          <span>NET_BOOT_ACTIVE</span>
          <span className="w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
          <span>CORE_V1.2.4</span>
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
