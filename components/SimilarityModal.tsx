
import React from 'react';
import { Track, TrackStatus } from '../types';

interface SimilarityModalProps {
  track: Track | null;
  onClose: () => void;
}

const SimilarityModal: React.FC<SimilarityModalProps> = ({ track, onClose }) => {
  if (!track) return null;

  const hasAnalysis = track.score !== undefined && track.score !== null;
  const scorePercent = hasAnalysis ? Math.round(track.score * 100) : 0;
  
  const getConfidenceLevel = (score: number) => {
    if (score >= 90) return { label: 'VERIFIED MATCH', color: 'text-primary' };
    if (score >= 70) return { label: 'HIGH CONFIDENCE', color: 'text-primary/80' };
    if (score >= 40) return { label: 'LOW CONFIDENCE', color: 'text-yellow-500' };
    return { label: 'CRITICAL FAILURE', color: 'text-red-500' };
  };

  const confidence = hasAnalysis ? getConfidenceLevel(scorePercent) : { label: 'AWAITING ANALYSIS', color: 'text-slate-500' };

  return (
    <div className="fixed inset-0 bg-background-dark/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="max-w-5xl w-full bg-surface border border-primary/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <header className="p-6 border-b border-primary/10 flex items-center justify-between bg-primary/5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 p-2 rounded-lg">
              <span className="material-icons text-primary">analytics</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Similarity Analysis</h1>
              <p className="text-sm text-slate-400">Analysis for ID: {track.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <span className="material-icons">close</span>
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-background-dark/50 p-8 rounded-2xl border border-primary/10 flex flex-col items-center justify-center text-center">
              <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-surface-light mb-4">
                <div 
                  className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent border-r-transparent transition-all duration-1000"
                  style={{ 
                    opacity: hasAnalysis ? 1 : 0.1,
                    transform: `rotate(${Math.min(360, scorePercent * 3.6) - 45}deg)` 
                  }}
                ></div>
                <span className={`text-3xl font-black ${hasAnalysis ? 'text-primary' : 'text-slate-700'}`}>
                  {hasAnalysis ? `${scorePercent}%` : '--'}
                </span>
              </div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Confidence Score</h3>
              <p className={`text-[10px] ${confidence.color} mt-2 font-bold italic tracking-wider animate-pulse`}>
                {confidence.label}
              </p>
            </div>

            <div className="lg:col-span-2 bg-background-dark/50 p-6 rounded-2xl border border-primary/10">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Verdict Log</h3>
              <div className="space-y-3">
                {hasAnalysis ? (
                  <>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="material-icons text-primary text-xs">check_circle</span>
                      <span className="flex-1 text-slate-300">Levenshtein Distance Check</span>
                      <span className="text-primary font-mono font-bold">PASS</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="material-icons text-primary text-xs">check_circle</span>
                      <span className="flex-1 text-slate-300">Artist Metadata Match</span>
                      <span className="text-primary font-mono font-bold">{scorePercent}%</span>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <span className="material-icons text-slate-700 mb-2">hourglass_empty</span>
                    <p className="text-xs text-slate-600 font-medium italic">Waiting for judging cycle to calculate metrics...</p>
                  </div>
                )}
                
                {track.rejectReason && (
                  <div className="flex items-center gap-3 text-sm border-t border-red-500/10 pt-3 mt-3">
                    <span className="material-icons text-red-500 text-xs">error</span>
                    <span className="flex-1 text-slate-300">Rejection Flag</span>
                    <span className="text-red-500 font-mono font-bold uppercase">{track.rejectReason}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-primary/10 rounded-2xl border border-primary/10 overflow-hidden">
            <div className="bg-surface p-6">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-icons text-green-500">source</span>
                <h2 className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Sync Source</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Artist</label>
                  <div className="text-lg font-medium">{track.artist}</div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Track Title</label>
                  <div className="text-lg font-medium">{track.title}</div>
                </div>
              </div>
            </div>

            <div className="bg-surface-light p-6">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-icons text-primary text-lg">folder_shared</span>
                <h2 className="font-bold text-slate-200 uppercase tracking-widest text-[10px]">Soulseek Candidate</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Matched User</label>
                  <div className={`text-lg font-medium flex items-center gap-2 ${!track.username ? 'text-slate-600 italic animate-pulse' : ''}`}>
                    {track.username || 'Searching Network...'} 
                    {track.status === TrackStatus.COMPLETED && <span className="material-icons text-primary text-sm">verified</span>}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">File Result</label>
                  <div className={`text-sm font-medium truncate ${!track.filename ? 'text-slate-600 italic' : ''}`}>
                    {track.filename || 'Waiting for query results...'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-6 border-t border-primary/10 bg-background-dark/80 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${track.status === TrackStatus.SEARCHING ? 'bg-primary animate-pulse' : 'bg-slate-600'}`}></span>
              <span className="text-xs font-medium text-slate-400">Phase: {track.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button onClick={onClose} className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold border border-primary/20 hover:bg-primary/5 text-slate-300 transition-all">
              Manual Override
            </button>
            <button className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl text-sm font-bold bg-primary text-background-dark hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
              Force Retry
              <span className="material-icons text-sm">refresh</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SimilarityModal;
