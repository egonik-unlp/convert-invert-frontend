
import React from 'react';

interface SimilarityModalProps {
  onClose: () => void;
}

const SimilarityModal: React.FC<SimilarityModalProps> = ({ onClose }) => {
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
              <h1 className="text-xl font-bold tracking-tight">Similarity Details</h1>
              <p className="text-sm text-slate-400">Comparing Spotify source metadata against Soulseek search index</p>
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
              <div className="relative w-32 h-32 flex items-center justify-center rounded-full radial-progress mb-4 border-8 border-surface-light">
                {/* Simplified radial progress for visual demo */}
                <div className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent border-r-transparent -rotate-45"></div>
                <span className="text-3xl font-black text-primary">92%</span>
              </div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Similarity Score</h3>
              <p className="text-[10px] text-primary mt-2 font-bold italic tracking-wider">HIGH CONFIDENCE MATCH</p>
            </div>

            <div className="lg:col-span-2 bg-background-dark/50 p-6 rounded-2xl border border-primary/10">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Verdict Log</h3>
              <div className="space-y-3">
                {[
                  { icon: 'check_circle', color: 'text-primary', text: 'Title Match: Exact string match found (100% weight)', val: '+60%' },
                  { icon: 'check_circle', color: 'text-primary', text: 'Artist Match: Fuzzy match successful (95% similarity)', val: '+30%' },
                  { icon: 'warning', color: 'text-red-500', text: 'Duration Delta: +8 seconds difference detected', val: '-8%' },
                  { icon: 'check_circle', color: 'text-primary', text: 'Bitrate Check: 320kbps meets quality threshold', val: 'PASS' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className={`material-icons ${item.color} text-xs`}>{item.icon}</span>
                    <span className="flex-1 text-slate-300">{item.text}</span>
                    <span className={`${item.color} font-mono font-bold`}>{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-primary/10 rounded-2xl border border-primary/10 overflow-hidden">
            <div className="bg-surface p-6">
              <div className="flex items-center gap-2 mb-6">
                <img className="w-5 h-5 opacity-70" src="https://picsum.photos/seed/spotify/32/32" alt="Source" />
                <h2 className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Spotify Source</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Artist</label>
                  <div className="text-lg font-medium">Daft Punk</div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Track Title</label>
                  <div className="text-lg font-medium">One More Time</div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Duration</label>
                    <div className="text-lg font-mono">05:20</div>
                  </div>
                  <div className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded">SOURCE</div>
                </div>
              </div>
            </div>

            <div className="bg-surface-light p-6">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-icons text-primary text-lg">folder_shared</span>
                <h2 className="font-bold text-slate-200 uppercase tracking-widest text-[10px]">Soulseek Result</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Matched Artist</label>
                  <div className="text-lg font-medium flex items-center gap-2">
                    Daft Punk <span className="material-icons text-primary text-sm">verified</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">File Name</label>
                  <div className="text-sm font-medium truncate">01. Daft_Punk-One_More_Time.mp3</div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Duration & Quality</label>
                    <div className="text-lg font-mono flex items-center gap-2">
                      <span className="text-red-500">05:28</span>
                      <span className="text-slate-500 text-xs">|</span>
                      <span className="text-primary">320kbps MP3</span>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-red-500/20 text-red-500 text-[10px] font-bold rounded">DISCREPANCY</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-6 border-t border-primary/10 bg-background-dark/80 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-medium text-slate-400">Pending Verification</span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button onClick={onClose} className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold border border-primary/20 hover:bg-primary/5 text-slate-300 transition-all">
              Manual Search
            </button>
            <button className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl text-sm font-bold bg-primary text-background-dark hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
              Accept Match
              <span className="material-icons text-sm">done_all</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SimilarityModal;
