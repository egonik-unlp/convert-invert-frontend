
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

  const steps = ['Parsing', 'Searching', 'Filtering', 'Downloading', 'Finalizing'];
  const currentStepIndex = statusMap[track.status];

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
          <div className={`h-0.5 w-12 transition-colors duration-500 ${isCompleted ? 'bg-primary' : 'bg-slate-800'}`}></div>
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
        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-primary overflow-hidden border border-white/5">
          <img className="object-cover w-full h-full" src={track.coverArt} alt={track.title} />
        </div>
        <div className="overflow-hidden">
          {/* Fix: Property 'trackTitle' does not exist on type 'Track'. Using 'title' directly. */}
          <div className="font-bold text-sm truncate">{track.title}</div>
          <div className="text-xs text-slate-500 truncate">{track.artist}</div>
        </div>
      </div>

      <div className="col-span-6 flex items-center h-full">
        {track.status === TrackStatus.COMPLETED ? (
          <div className="flex items-center gap-4 text-primary">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
               <span className="material-icons text-background-dark text-[14px] font-bold">done_all</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">Download Successful</span>
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
            <div className="text-sm font-bold text-primary animate-pulse">{track.downloadSpeed}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">{track.format} • {track.fileSize}</div>
          </div>
        ) : track.status === TrackStatus.COMPLETED ? (
          <button className="text-slate-500 hover:text-primary transition-all p-2 rounded-full hover:bg-primary/10">
            <span className="material-icons text-xl">folder_open</span>
          </button>
        ) : (
          <div className="text-xs font-bold text-slate-600">
            {track.status === TrackStatus.IN_QUEUE ? 'Queued #4' : 'Awaiting Match...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackRow;
