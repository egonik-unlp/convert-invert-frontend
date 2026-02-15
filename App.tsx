
import React, { useState, useEffect } from 'react';
import { 
  TrackStatus, 
  Track, 
  Playlist, 
  NetworkStats, 
  GlobalStats 
} from './types';
import { api } from './api';
import Sidebar from './components/Sidebar';
import StatsHeader from './components/StatsHeader';
import TrackRow from './components/TrackRow';
import GlobalFooter from './components/GlobalFooter';
import SimilarityModal from './components/SimilarityModal';

const App: React.FC = () => {
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [network, setNetwork] = useState<NetworkStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [s, n, p] = await Promise.all([
          api.getStats(),
          api.getNetwork(),
          api.getPlaylists()
        ]);
        setStats(s);
        setNetwork(n);
        if (p.length > 0) {
          const detailed = await api.getPlaylist(p[0].id);
          setActivePlaylist(detailed);
        }
      } catch (err) {
        console.error("Failed to fetch data from API. Ensure backend is running.", err);
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000); // Polling for updates
    return () => clearInterval(interval);
  }, []);

  const handleTrackClick = (track: Track) => {
    setSelectedTrack(track);
    setIsModalOpen(true);
  };

  if (!stats || !network || !activePlaylist) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark flex-col gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium animate-pulse">Initializing Sync Engine...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background-dark text-slate-100 font-sans">
      <Sidebar network={network} />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <StatsHeader stats={stats} />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
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
                    Live Syncing
                  </span>
                  <span className="text-slate-500 text-xs font-medium">Synced {activePlaylist.lastSynced}</span>
                </div>
                <h2 className="text-4xl font-black mb-1">{activePlaylist.name}</h2>
                <p className="text-slate-500 font-medium">
                  {activePlaylist.totalSize} Estimated • {activePlaylist.trackCount} Tracks • {activePlaylist.quality}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background-dark/80 border border-primary/20 hover:border-primary/40 transition-all text-sm font-semibold">
                <span className="material-icons text-sm">pause</span> Pause All
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest pb-2">
              <div className="col-span-4">Track Information</div>
              <div className="col-span-6">Sync Status & Progress</div>
              <div className="col-span-2 text-right">Details / Actions</div>
            </div>
            
            {activePlaylist.tracks.map(track => (
              <TrackRow 
                key={track.id} 
                track={track} 
                onClick={() => handleTrackClick(track)} 
              />
            ))}
          </div>
        </div>

        <GlobalFooter stats={stats} network={network} />
      </main>

      {isModalOpen && (
        <SimilarityModal track={selectedTrack} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default App;
