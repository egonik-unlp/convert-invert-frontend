
import React from 'react';
import { Track, TrackStatus } from '../types';

interface TrackRowProps {
  track: Track;
  onClick: () => void;
}

const TrackRow: React.FC<TrackRowProps> = ({ track, onClick }) => {
  const isSuccess = track.status === TrackStatus.COMPLETED;
  const isFailed = track.status === TrackStatus.FAILED;
  const isSyncing = !isSuccess && !isFailed;

  return (
    <div 
      onClick={onClick}
      className={`grid grid-cols-12 items-center px-6 py-5 bg-surface/30 border border-white/5 rounded-2xl hover:bg-surface/50 hover:border-primary/20 transition-all cursor-pointer group relative overflow-hidden active:scale-[0.99]`}
    >
      <div className="col-span-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-primary border border-white/5 group-hover:border-primary/30 transition-all">
          <span className="material-icons text-slate-700">music_note</span>
        </div>
        <div className="overflow-hidden">
          <div className="font-bold text-sm truncate group-hover:text-primary transition-colors">{track.title}</div>
          <div className="text-[11px] text-slate-500 font-medium uppercase tracking-tighter truncate">{track.artist}</div>
        </div>
      </div>

      <div className="col-span-6">
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
            isSuccess ? 'bg-primary/10 border-primary/30 text-primary' :
            isFailed ? 'bg-red-500/10 border-red-500/30 text-red-400' :
            'bg-blue-500/10 border-blue-500/30 text-blue-400 animate-pulse'
          }`}>
            {track.status}
          </div>
          {track.candidatesCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Candidates Found:</span>
              <span className="px-2 py-0.5 rounded-lg bg-white/5 text-[10px] text-slate-400 font-mono font-bold">{track.candidatesCount}</span>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-2 text-right">
        {isSuccess ? (
          <div className="flex flex-col items-end">
             <span className="material-icons text-primary text-xl">check_circle</span>
             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Verified</span>
          </div>
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-sm font-black text-slate-300 font-mono italic">
              {track.score ? `${Math.round(track.score * 100)}%` : '--%'}
            </span>
            <span className="text-[9px] font-bold text-slate-600 uppercase">Match Score</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackRow;
