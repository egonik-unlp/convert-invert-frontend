
import React, { useState, useEffect, useMemo } from 'react';
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

type View = 'dashboard' | 'playlists' | 'downloads' | 'history' | 'settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
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
      if (h.api === 'ONLINE' && h.db === 'CONNECTED') {
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
      setError(err.message || "Fatal error connecting to DB Bridge.");
    }
  };

  useEffect(() => {
    checkHealthAndLoad();
    const interval = setInterval(() => {
      if (!isBooting) loadDashboardData();
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
      // Don't flip to booting on single poll failure, just log
      console.warn("Poll failed", e);
    }
  };

  const filteredTracks = useMemo(() => {
    if (!activePlaylist) return [];
    switch (currentView) {
      case 'downloads':
        return activePlaylist.tracks.filter(t => t.status === TrackStatus.DOWNLOADING || t.status === TrackStatus.SEARCHING);
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
      <div className="flex min-h-screen items-center justify-center bg-background-dark flex-col p-8 text-left font-mono">
        <div className="max-w-4xl w-full bg-surface/20 border border-primary/20 rounded-2xl p-10 shadow-2xl backdrop-blur-xl relative">
          <div className="flex items-center gap-6 mb-10 border-b border-primary/10 pb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/30">
              <span className="material-icons text-3xl animate-spin">sync</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">SyncDash Diagnostics</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Checking local network context</p>
            </div>
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl">
              <p className="text-red-400 text-xs font-bold mb-2 uppercase tracking-widest">Diagnostic Failure</p>
              <code className="text-[10px] text-red-300 break-all bg-black/40 p-3 rounded block">{error}</code>
            </div>
          )}
          <button onClick={checkHealthAndLoad} className="mt-8 w-full bg-primary text-background-dark font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95">Retry Connection</button>
        </div>
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
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black mb-1 capitalize tracking-tighter">{currentView}</h2>
                <p className="text-slate-500 font-medium">
                  {currentView === 'dashboard' ? 'Real-time overview of your music sync queue.' : 
                   currentView === 'downloads' ? 'Tracks currently being located or retrieved.' :
                   currentView === 'history' ? 'A log of all past synchronization outcomes.' :
                   'Browse your organized music library.'}
                </p>
              </div>
              <div className="px-4 py-2 bg-surface/50 border border-white/5 rounded-xl flex items-center gap-3">
                 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">View Total</span>
                 <span className="text-sm font-bold text-primary font-mono">{filteredTracks.length}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-12 px-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] pb-4">
                <div className="col-span-4">Track Identity</div>
                <div className="col-span-6">Lifecycle Status</div>
                <div className="col-span-2 text-right">Metrics</div>
              </div>
              
              {filteredTracks.length > 0 ? (
                filteredTracks.map(track => (
                  <TrackRow 
                    key={track.id} 
                    track={track} 
                    onClick={() => handleTrackClick(track)} 
                  />
                ))
              ) : (
                <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-3xl bg-surface/10">
                  <span className="material-icons text-5xl text-slate-800 mb-6">analytics</span>
                  <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">No entries found for this category</p>
                </div>
              )}
            </div>
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
