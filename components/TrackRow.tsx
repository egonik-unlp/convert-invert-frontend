
import React from 'react';
import { Track, TrackStatus } from '../types';

interface TrackRowProps {
  track: Track;
  onClick: () => void;
}

const TrackRow: React.FC<TrackRowProps> = ({ track, onClick }) => {
  const isSuccess = track.status === TrackStatus.COMPLETED;
  const isFailed = track.status === TrackStatus.FAILED;
  const isSearching = track.status === TrackStatus.SEARCHING;
  const isFiltering = track.status === TrackStatus.FILTERING;
  const isDownloading = track.status === TrackStatus.DOWNLOADING;
  const isFinalizing = track.status === 'FINALIZING';

  const stages = [
    { key: 'SEARCH', label: 'Search', active: !isSearching, current: isSearching },
    { key: 'JUDGE', label: 'Judge', active: isFiltering || isDownloading || isFinalizing || isSuccess, current: isFiltering },
    { key: 'TRANSFER', label: 'Transfer', active: isDownloading || isFinalizing || isSuccess, current: isDownloading },
    { key: 'LIBRARY', label: 'Library', active: isSuccess, current: isFinalizing || isSuccess },
  ];

  return (
    <div 
      onClick={onClick}
      className={`relative group bg-surface/30 border border-white/5 rounded-2xl p-5 hover:bg-surface/50 hover:border-primary/20 transition-all cursor-pointer overflow-hidden active:scale-[0.99] ${isFailed ? 'hover:border-red-500/30' : ''}`}
    >
      <div className="flex items-center gap-6 relative z-10">
        {/* Track Info */}
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-primary/30 transition-all ${isFailed ? 'text-red-500' : 'text-primary'}`}>
            <span className="material-icons text-lg">{isFailed ? 'dangerous' : 'music_note'}</span>
          </div>
          <div className="truncate">
            <h4 className={`font-bold text-sm truncate group-hover:text-primary transition-colors ${isFailed ? 'group-hover:text-red-400' : ''}`}>{track.title}</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{track.artist}</p>
          </div>
        </div>

        {/* Sync Pipeline */}
        <div className="flex-[2] flex items-center gap-2">
          {stages.map((stage, idx) => (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
                <div className={`h-6 px-3 rounded-full flex items-center justify-center text-[8px] font-black uppercase tracking-widest border transition-all duration-500 ${
                  stage.current ? 'bg-primary text-background-dark border-primary shadow-[0_0_15px_rgba(19,236,91,0.4)] animate-pulse' :
                  stage.active ? 'bg-primary/10 border-primary/30 text-primary' :
                  'bg-white/5 border-white/10 text-slate-600'
                }`}>
                  {stage.label}
                </div>
                {stage.key === 'TRANSFER' && isDownloading && (
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-primary" style={{ width: `${track.progress}%` }}></div>
                  </div>
                )}
              </div>
              {idx < stages.length - 1 && (
                <div className={`h-[1px] flex-1 min-w-[10px] transition-colors duration-500 ${stage.active ? 'bg-primary/30' : 'bg-white/5'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Action/Result */}
        <div className="flex-1 flex flex-col items-end shrink-0">
          {isSuccess ? (
             <div className="flex items-center gap-2 text-primary">
                <span className="text-[10px] font-black uppercase tracking-widest">In Library</span>
                <span className="material-icons text-xl">verified</span>
             </div>
          ) : isFailed ? (
            <div className="text-right">
              <span className="text-[9px] font-black text-red-500/60 uppercase block mb-0.5">Rejected</span>
              <span className="text-[10px] text-slate-500 font-medium truncate max-w-[150px] block italic">
                {track.rejectReason || 'Threshold mismatch'}
              </span>
            </div>
          ) : (
            <div className="text-right">
              <span className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">Match Confidence</span>
              <span className="text-lg font-black font-mono italic text-slate-300">
                {track.score ? `${Math.round(track.score * 100)}%` : '--'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Background Subtle Progress */}
      {isDownloading && (
        <div 
          className="absolute bottom-0 left-0 h-[2px] bg-primary/40 transition-all duration-700 ease-out" 
          style={{ width: `${track.progress}%` }}
        ></div>
      )}
    </div>
  );
};

export default TrackRow;
