
import React from 'react';
import { Track, TrackStatus } from '../types';

interface TrackRowProps {
  track: Track;
  onClick: () => void;
}

const TrackRow: React.FC<TrackRowProps> = ({ track, onClick }) => {
  const isSuccess = track.status === TrackStatus.COMPLETED;
  const isFailed = track.status === TrackStatus.FAILED;
  const isDownloading = track.status === TrackStatus.DOWNLOADING;

  /**
   * Translates technical engine enums into human-readable descriptions
   */
  const formatRejectReason = (reason?: string) => {
    if (!reason) return 'Unknown Engine Error';
    
    const mapping: Record<string, string> = {
      'LOW_SIMILARITY': 'Match confidence was below the 85% fidelity threshold',
      'NO_CANDIDATES': 'No matching files were found on the Soulseek network',
      'BAD_QUALITY': 'Available versions did not meet bitrate or sample rate requirements',
      'FILE_SIZE_MISMATCH': 'Candidate file size deviated significantly from expected duration',
      'USER_BLACKLISTED': 'Source provider is currently on the engine ignore list',
      'ALREADY_EXISTS': 'This track is already present in your local destination library',
      'TIMEOUT': 'Search cycle exceeded the maximum time allotment',
      'MANUAL_REJECT': 'This track was manually excluded from the sync cycle',
      'PARSING_ERROR': 'Metadata extraction from the source failed',
      'BITRATE_TOO_LOW': 'Candidates were rejected for insufficient audio quality (Low Bitrate)',
      'WRONG_EXTENSION': 'Filtered out non-audio or incompatible container formats'
    };

    return mapping[reason.toUpperCase()] || `Engine Error: ${reason.replace(/_/g, ' ').toLowerCase()}`;
  };

  return (
    <div 
      onClick={onClick}
      className={`grid grid-cols-12 items-center px-6 py-5 bg-surface/30 border border-white/5 rounded-2xl hover:bg-surface/50 hover:border-primary/20 transition-all cursor-pointer group relative overflow-hidden active:scale-[0.99] ${isFailed ? 'hover:border-red-500/30' : ''}`}
    >
      {/* Background Progress Indicator for Downloading Tracks */}
      {isDownloading && (
        <div 
          className="absolute inset-0 bg-primary/5 transition-all duration-700 ease-out" 
          style={{ width: `${track.progress}%`, zIndex: 0 }}
        ></div>
      )}

      <div className="col-span-4 flex items-center gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-all ${isFailed ? 'text-red-500' : 'text-primary'}`}>
          <span className={`material-icons ${isFailed ? 'text-red-900' : 'text-slate-700'}`}>{isFailed ? 'dangerous' : 'music_note'}</span>
        </div>
        <div className="overflow-hidden">
          <div className={`font-bold text-sm truncate group-hover:text-primary transition-colors ${isFailed ? 'group-hover:text-red-400' : ''}`}>{track.title}</div>
          <div className="text-[11px] text-slate-500 font-medium uppercase tracking-tighter truncate">{track.artist}</div>
        </div>
      </div>

      <div className="col-span-6 relative z-10">
        <div className="flex items-center gap-6">
          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${
            isSuccess ? 'bg-primary/10 border-primary/30 text-primary' :
            isFailed ? 'bg-red-500/10 border-red-500/30 text-red-400' :
            isDownloading ? 'bg-primary/20 border-primary text-primary' :
            'bg-blue-500/10 border-blue-500/30 text-blue-400 animate-pulse'
          }`}>
            {track.status}
          </div>
          
          {isDownloading ? (
            <div className="flex-1 max-w-[150px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Live Progress</span>
                <span className="text-[10px] font-bold text-slate-200 font-mono">{track.progress}%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary shadow-[0_0_8px_#13ec5b] transition-all duration-500" 
                  style={{ width: `${track.progress}%` }}
                ></div>
              </div>
            </div>
          ) : isFailed ? (
            <div className="flex items-center gap-2">
              <span className="material-icons text-red-500 text-[14px]">report_problem</span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest truncate max-w-sm">
                {formatRejectReason(track.rejectReason)}
              </span>
            </div>
          ) : track.candidatesCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Candidates:</span>
              <span className="px-2 py-0.5 rounded-lg bg-white/5 text-[10px] text-slate-400 font-mono font-bold">{track.candidatesCount}</span>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-2 text-right relative z-10">
        {isSuccess ? (
          <div className="flex flex-col items-end">
             <span className="material-icons text-primary text-xl">check_circle</span>
             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Verified</span>
          </div>
        ) : (
          <div className="flex flex-col items-end">
            <span className={`text-sm font-black font-mono italic ${isFailed ? 'text-red-500/50' : 'text-slate-300'}`}>
              {track.score !== null && track.score !== undefined ? `${Math.round(track.score * 100)}%` : '--%'}
            </span>
            <span className="text-[9px] font-bold text-slate-600 uppercase">Match Score</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackRow;
