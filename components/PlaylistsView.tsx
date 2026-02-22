
import React, { useState } from 'react';
import { Playlist } from '../types';

interface PlaylistsViewProps {
  playlists: Playlist[];
  activePlaylist: Playlist | null;
  onSelect: (playlist: Playlist) => void;
  onManualStart: (playlistId: string) => void;
}

const PlaylistsView: React.FC<PlaylistsViewProps> = ({ playlists, activePlaylist, onSelect, onManualStart }) => {
  const [manualId, setManualId] = useState('');

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Library Source</span>
          </div>
          <h2 className="text-5xl font-black mb-1 capitalize tracking-tighter italic font-serif">Playlists</h2>
          <p className="text-slate-500 font-medium max-w-lg text-sm">
            Select a source playlist to synchronize or manually inject a new identifier for processing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Manual Entry */}
        <div className="space-y-6">
          <div className="bg-surface/30 border border-white/5 rounded-3xl p-8 space-y-6 backdrop-blur-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Manual Injection</h3>
            <div className="space-y-4">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Enter a Spotify or YouTube playlist ID directly to bypass the library scan.
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons text-slate-600 text-sm">add_link</span>
                <input 
                  type="text" 
                  placeholder="Playlist ID or URL"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-200 focus:border-primary/50 outline-none transition-all"
                />
              </div>
              <button 
                onClick={() => onManualStart(manualId)}
                disabled={!manualId}
                className="w-full bg-primary text-background-dark font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(19,236,91,0.2)] disabled:opacity-50"
              >
                Inject Playlist
              </button>
            </div>
          </div>

          <div className="p-6 border border-white/5 rounded-3xl bg-primary/5">
             <div className="flex items-center gap-3 mb-3">
                <span className="material-icons text-primary text-sm">info</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Pro Tip</span>
             </div>
             <p className="text-[11px] text-primary/70 leading-relaxed italic">
                Manual injection is useful for testing specific chunks of large playlists without importing them into the main library first.
             </p>
          </div>
        </div>

        {/* Playlist Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {playlists.map((playlist) => (
            <div 
              key={playlist.id}
              onClick={() => onSelect(playlist)}
              className={`group relative aspect-[4/3] rounded-3xl overflow-hidden cursor-pointer border-2 transition-all duration-500 ${
                activePlaylist?.id === playlist.id ? 'border-primary shadow-[0_0_40px_rgba(19,236,91,0.15)]' : 'border-transparent hover:border-white/10'
              }`}
            >
              <img 
                src={playlist.coverArt} 
                alt={playlist.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {playlist.trackCount} Tracks
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tighter mb-1 group-hover:text-primary transition-colors">{playlist.name}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ID: {playlist.id}</p>
              </div>

              {activePlaylist?.id === playlist.id && (
                <div className="absolute top-6 right-6 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <span className="material-icons text-background-dark text-sm">check</span>
                </div>
              )}
            </div>
          ))}

          {playlists.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-white/5 rounded-3xl">
              <span className="material-icons text-4xl mb-4 opacity-20">library_music</span>
              <p className="font-bold text-sm">No playlists found</p>
              <p className="text-xs mt-1">Check your database connection or inject manually</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistsView;
