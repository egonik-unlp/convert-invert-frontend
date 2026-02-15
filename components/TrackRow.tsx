
import React from 'react';
import { Track, TrackStatus } from '../types';

interface TrackRowProps {
  track: Track;
  onClick: () => void;
}

const TrackRow: React.FC<TrackRowProps> = ({ track, onClick }) => {
  const statusMap: Record<TrackStatus, number> = {
    [TrackStatus.PARSING]: 0,
    [TrackStatus.SEARCHING]: 1,
    [TrackStatus.FILTERING]: 2,
    [TrackStatus.DOWNLOADING]: 3,
    [TrackStatus.FINALIZING]: 4,
    [TrackStatus.COMPLETED]: 5,
    [TrackStatus.FAILED]: -1,
    [TrackStatus.IN_QUEUE]: -2,
  };

  const steps = ['Parsing', 'Searching', 'Judging', 'Downloading', 'Done'];
  const currentStepIndex = statusMap[track.status] ?? 0;

  const renderStep = (index: number, label: string) => {
    const isCompleted = currentStepIndex > index || track.status === TrackStatus.COMPLETED;
    const isActive = currentStepIndex === index;
    const isSuccess = track.status === TrackStatus.COMPLETED;

    return (
      <div key={label} className="flex items-center group/step">
        <div className="flex flex-col items-center relative">
          <div 
            className={`w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
              isSuccess 
                ? 'bg-primary active-glow' 
                : isCompleted 
                  ? 'bg-primary' 
                  : isActive 
                    ? 'border-2 border-primary bg-primary/20 animate-pulse' 
                    : 'border-2 border-slate-700 bg-background-dark opacity-30'
            }`}
          >
            {isCompleted || isSuccess ? (
              <span className="material-icons text-background-dark text-[14px] font-bold">check</span>
            ) : isActive ? (
              <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
            ) : null}
          </div>
          <span className={`text-[9px] absolute -bottom-5 font-bold uppercase tracking-tighter whitespace-nowrap ${
            isCompleted || isActive ? 'text-primary' : 'text-slate-600'
          }`}>
            {label}
          </span>
        </div>
        {index < steps.length - 1 && (
          <div className={`h-0.5 w-10 transition-colors duration-500 ${isCompleted ? 'bg-primary' : 'bg-slate-800'}`}></div>
        )}
      </div>
    );
  };

  return (
    <div 
      onClick={onClick}
      className={`grid grid-cols-12 items-center px-6 py-5 bg-surface/30 border rounded-xl hover:bg-surface/50 transition-all cursor-pointer group relative overflow-hidden ${
        track.status === TrackStatus.DOWNLOADING ? 'border-primary/20 active-glow' : 'border-white/5'
      }`}
    >
      <div className="col-span-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-primary overflow-hidden border border-white/5 relative group-hover:border-primary/30 transition-all">
          {track.coverArt ? (
             <img className="object-cover w-full h-full" src={track.coverArt} alt={track.title} />
          ) : (
            <span className="material-icons text-slate-600">music_note</span>
          )}
        </div>
        <div className="overflow-hidden">
          <div className="font-bold text-sm truncate group-hover:text-primary transition-colors">{track.title}</div>
          <div className="text-xs text-slate-500 truncate flex items-center gap-2">
            {track.artist}
            {track.username && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                <span className="text-primary/70 italic text-[10px]">from {track.username}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="col-span-6 flex items-center h-full">
        {track.status === TrackStatus.COMPLETED ? (
          <div className="flex items-center gap-4 text-primary">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
               <span className="material-icons text-background-dark text-[14px] font-bold">done_all</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Verified Match</span>
              <span className="text-[9px] text-primary/60 truncate max-w-[200px] mt-1 font-mono italic">{track.filename}</span>
            </div>
          </div>
        ) : track.status === TrackStatus.FAILED ? (
          <div className="flex items-center gap-4 text-red-500">
             <span className="material-icons text-sm">error_outline</span>
             <span className="text-xs font-bold uppercase tracking-widest">Rejected: {track.rejectReason || 'Low Score'}</span>
          </div>
        ) : (
          <div className="flex items-center gap-0 w-full mb-2">
            {steps.map((label, idx) => renderStep(idx, label))}
          </div>
        )}
      </div>

      <div className="col-span-2 text-right">
        {track.status === TrackStatus.DOWNLOADING ? (
          <div>
            <div className="text-sm font-bold text-primary animate-pulse">{track.downloadSpeed || '0.0 MB/s'}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">{track.format || 'PCM'} • {track.fileSize || '...'}</div>
          </div>
        ) : track.status === TrackStatus.COMPLETED ? (
          <button className="text-slate-500 hover:text-primary transition-all p-2 rounded-full hover:bg-primary/10 group-hover:scale-110">
            <span className="material-icons text-xl">file_download_done</span>
          </button>
        ) : (
          <div className="text-xs font-bold text-slate-600">
             <span className="material-icons text-sm align-middle mr-1">history</span>
             {track.status === TrackStatus.SEARCHING ? 'Scanning...' : 'In Queue'}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackRow;
