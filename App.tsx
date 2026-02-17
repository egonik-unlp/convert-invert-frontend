
import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrackStatus, 
  Track, 
  Playlist, 
  NetworkStats, 
  GlobalStats,
  LogEntry
} from './types';
import { api, HealthStatus } from './api';
import Sidebar from './components/Sidebar';
import StatsHeader from './components/StatsHeader';
import TrackRow from './components/TrackRow';
import GlobalFooter from './components/GlobalFooter';
import SimilarityModal from './components/SimilarityModal';

type View = 'dashboard' | 'playlists' | 'downloads' | 'rejected' | 'history' | 'settings' | 'logs';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [network, setNetwork] = useState<NetworkStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  const checkHealthAndLoad = async () => {
    try {
      const h = await api.getHealth();
      setHealth(h);
      if (h.api === 'ONLINE' && h.db === 'CONNECTED') {
        const [s, n, p, l] = await Promise.all([
          api.getStats(),
          api.getNetwork(),
          api.getPlaylists(),
          api.getLogs()
        ]);
        setStats(s);
        setNetwork(n);
        setLogs(l);
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
      setError(err.message || "Fatal error connecting to DB Bridge.");
    }
  };

  useEffect(() => {
    checkHealthAndLoad();
    const interval = setInterval(() => {
      if (!isBooting) loadDashboardData();
    }, 1500); // Polling faster for real-time progress
    return () => clearInterval(interval);
  }, [isBooting]);

  const loadDashboardData = async () => {
    try {
      const [s, n, l] = await Promise.all([api.getStats(), api.getNetwork(), api.getLogs()]);
      setStats(s);
      setNetwork(n);
      setLogs(l);
      if (activePlaylist) {
        const detailed = await api.getPlaylist(activePlaylist.id);
        setActivePlaylist(detailed);
      }
    } catch (e) {
      console.warn("Poll failed", e);
    }
  };

  const filteredTracks = useMemo(() => {
    if (!activePlaylist) return [];
    switch (currentView) {
      case 'downloads':
        return activePlaylist.tracks.filter(t => t.status === TrackStatus.DOWNLOADING || t.status === TrackStatus.SEARCHING);
      case 'rejected':
        return activePlaylist.tracks.filter(t => t.status === TrackStatus.FAILED);
      case 'history':
        return activePlaylist.tracks.filter(t => t.status === TrackStatus.COMPLETED || t.status === TrackStatus.FAILED);
      case 'playlists':
        return activePlaylist.tracks;
      case 'dashboard':
      default:
        return activePlaylist.tracks;
    }
  }, [activePlaylist, currentView]);

  const handleTrackClick = (track: Track) => {
    setSelectedTrack(track);
    setIsModalOpen(true);
  };

  if (isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-dark flex-col p-8 text-left font-mono text-slate-400">
         <div className="w-24 h-24 mb-8 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30 animate-pulse">
            <span className="material-icons text-primary text-4xl">settings_input_component</span>
         </div>
         <p className="font-bold uppercase tracking-[0.3em] text-xs">Initializing Sync Engine Dashboard</p>
         {error && <p className="mt-4 text-red-500 text-[10px] bg-red-500/5 p-4 border border-red-500/20 rounded-lg">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background-dark text-slate-100 font-sans overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView}
        network={network || { status: 'DISCONNECTED', user: '...', latency: '...', node: '...', totalBandwidth: '...' }} 
      />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {stats && <StatsHeader stats={stats} />}
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pb-32">
          <div className="max-w-7xl mx-auto">
            {currentView === 'logs' ? (
              <div className="space-y-4">
                <h2 className="text-3xl font-black mb-1 tracking-tighter uppercase">Live System Telemetry</h2>
                <div className="bg-black/40 border border-white/5 rounded-3xl p-6 font-mono text-[11px] overflow-hidden min-h-[60vh] flex flex-col">
                   <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                      {logs.map((log) => (
                        <div key={log.id} className="flex gap-4 hover:bg-white/5 px-2 py-1 rounded transition-colors group">
                           <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                           <span className={`font-bold ${log.trackId ? 'text-primary' : 'text-slate-500'}`}>
                              {log.trackId ? `Track#${log.trackId}` : '[SYSTEM]'}
                           </span>
                           <span className="text-slate-300 group-hover:text-white">{log.message}</span>
                           {log.progress !== null && (
                             <span className="ml-auto bg-primary/20 text-primary px-1.5 rounded">{log.progress}%</span>
                           )}
                        </div>
                      ))}
                      {logs.length === 0 && <p className="text-slate-700 italic">No events captured from Jaeger yet...</p>}
                   </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-black mb-1 capitalize tracking-tighter">{currentView}</h2>
                    <p className="text-slate-500 font-medium max-w-lg">
                      {currentView === 'dashboard' ? 'Correlating local database records with live Soulseek telemetry.' : 
                       currentView === 'downloads' ? 'Active download queue with real-time progress mapping.' :
                       currentView === 'rejected' ? 'Tracks flagged as incompatible or missing high-fidelity candidates.' :
                       'Past activity log.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredTracks.length > 0 ? (
                    filteredTracks.map(track => (
                      <TrackRow 
                        key={track.id} 
                        track={track} 
                        onClick={() => handleTrackClick(track)} 
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-3xl bg-surface/5">
                      <span className="material-icons text-6xl text-slate-800 mb-6">database_off</span>
                      <h3 className="text-xl font-bold text-slate-400 mb-2">No Records Found</h3>
                      <p className="text-slate-600 text-sm mb-8 text-center max-w-sm">
                        The DB bridge is connected, but the current filter returned 0 results. 
                        Check your Diagnostics for table statistics.
                      </p>
                      
                      {stats && (
                        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                           {Object.entries(stats.tableCounts).map(([table, count]) => (
                             <div key={table} className="bg-surface/50 border border-white/5 p-4 rounded-2xl flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{table}</span>
                                <span className="font-mono font-bold text-primary">{count}</span>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
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
