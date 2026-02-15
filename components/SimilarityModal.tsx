
import React, { useEffect, useState } from 'react';
import { Track, Candidate } from '../types';
import { api } from '../api';

interface SimilarityModalProps {
  track: Track | null;
  onClose: () => void;
}

const SimilarityModal: React.FC<SimilarityModalProps> = ({ track, onClose }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (track) {
      setCandidates([]); // Clear stale data immediately
      setLoading(true);
      
      api.getCandidates(track.id)
        .then(data => {
          setCandidates(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load candidates", err);
          setLoading(false);
        });
    } else {
      setCandidates([]);
      setLoading(false);
    }
  }, [track]);

  if (!track) return null;

  return (
    <div className="fixed inset-0 bg-background-dark/95 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="max-w-6xl w-full bg-surface border border-primary/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        <header className="p-8 border-b border-primary/10 flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
              <span className="material-icons text-3xl">travel_explore</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">{track.title}</h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Candidate Matching Log • Database ID: {track.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-slate-400 transition-colors">
            <span className="material-icons">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col p-8">
          <div className="grid grid-cols-12 px-6 text-[10px] font-black text-slate-600 uppercase tracking-widest pb-4 border-b border-white/5">
            <div className="col-span-1">Rank</div>
            <div className="col-span-2">User</div>
            <div className="col-span-7">Candidate Filename</div>
            <div className="col-span-2 text-right">Similarity</div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar mt-4 space-y-2">
            {loading ? (
              <div className="py-20 text-center animate-pulse">
                <span className="material-icons text-4xl text-primary/40 mb-4">query_stats</span>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching Soulseek Query Results...</p>
              </div>
            ) : candidates.length > 0 ? (
              candidates.map((c, i) => (
                <div key={c.id} className="grid grid-cols-12 items-center px-6 py-4 rounded-xl bg-white/5 border border-transparent hover:border-primary/20 transition-all group">
                  <div className="col-span-1 font-mono text-xs text-slate-500">#{i + 1}</div>
                  <div className="col-span-2 text-xs font-bold text-primary/80 truncate pr-2">{c.username}</div>
                  <div 
                    className="col-span-7 text-[11px] font-mono text-slate-400 truncate pr-8 group-hover:text-slate-100 transition-colors cursor-help"
                    title={c.filename}
                  >
                    {c.filename}
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`text-xs font-black font-mono ${c.score >= 0.8 ? 'text-primary' : 'text-yellow-500'}`}>
                      {Math.round(c.score * 100)}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center">
                <span className="material-icons text-4xl text-slate-800 mb-4">search_off</span>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No candidate metadata found for this track</p>
              </div>
            )}
          </div>
        </div>

        <footer className="p-8 border-t border-primary/10 bg-background-dark/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Match Threshold</span>
                <span className="text-xs font-bold text-slate-400">0.85 (High Fidelity Logic)</span>
             </div>
          </div>
          <div className="flex gap-4">
            <button className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-primary/20 hover:bg-primary/5 text-slate-300 transition-all">
              Manual Override
            </button>
            <button className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-background-dark shadow-[0_0_20px_rgba(19,236,91,0.3)] transition-all">
              Force Reprocess
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SimilarityModal;
