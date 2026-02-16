
import React from 'react';
import { Candidate, Track } from '../types';

interface CandidateDetailModalProps {
  candidate: Candidate;
  track: Track;
  onClose: () => void;
}

const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({ candidate, track, onClose }) => {
  return (
    <div className="fixed inset-0 bg-background-dark/80 backdrop-blur-xl flex items-center justify-center z-[110] p-6 animate-in fade-in zoom-in duration-200">
      <div className="max-w-2xl w-full bg-surface-light border border-primary/20 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
        <header className="p-6 border-b border-primary/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-primary/30">
              <span className="material-icons">info</span>
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">Technical Specifications</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Candidate Inspection View</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400">
            <span className="material-icons text-sm">close</span>
          </button>
        </header>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 border border-white/5 p-4 rounded-2xl">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Submission ID</span>
              <span className="font-mono text-primary font-bold">JS-{candidate.id}</span>
            </div>
            <div className="bg-black/20 border border-white/5 p-4 rounded-2xl">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">File Source ID</span>
              <span className="font-mono text-blue-400 font-bold">DLF-{candidate.fileId}</span>
            </div>
          </div>

          <div className="space-y-4">
             <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Full Directory Path</span>
                <div className="bg-background-dark p-4 rounded-xl border border-white/5 font-mono text-xs text-slate-400 break-all leading-relaxed whitespace-pre-wrap">
                  {candidate.filename}
                </div>
             </div>

             <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                <div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Provider Username</span>
                   <span className="text-sm font-bold text-slate-200">{candidate.username}</span>
                </div>
                <div className="text-right">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Match Confidence</span>
                   <span className={`text-xl font-black font-mono ${candidate.score >= 0.85 ? 'text-primary' : 'text-yellow-500'}`}>
                      {Math.round(candidate.score * 100)}%
                   </span>
                </div>
             </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl">
             <div className="flex items-center gap-3 mb-4">
                <span className="material-icons text-primary text-sm">settings_suggest</span>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Engine Context</span>
             </div>
             <p className="text-xs text-slate-400 leading-relaxed italic">
                This candidate was indexed by the <span className="text-slate-200 font-bold">judge_submissions</span> process as part of 
                the <span className="text-slate-200 font-bold">"{track.title}"</span> search cycle. 
                Similarity was calculated using the fuzzy-matching heuristic against Spotify metadata.
             </p>
          </div>
        </div>

        <footer className="p-6 bg-black/20 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/5 text-slate-400 transition-all"
          >
            Close Inspector
          </button>
          <button className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-background-dark shadow-lg shadow-primary/20">
            Manual Select
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CandidateDetailModal;
