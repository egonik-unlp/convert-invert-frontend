
import React from 'react';
import { GlobalStats } from '../types';

interface StatsHeaderProps {
  stats: GlobalStats;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({ stats }) => {
  return (
    <header className="h-24 border-b border-white/5 flex items-center justify-between px-12 bg-background-dark/50 backdrop-blur-xl z-20 shrink-0">
      <div className="flex items-center gap-12">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Library Index</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black italic font-serif">{stats.totalTracks}</span>
            <span className="text-[10px] font-bold text-slate-600 uppercase">Items</span>
          </div>
        </div>
        
        <div className="h-10 w-[1px] bg-white/5"></div>

        <div className="flex items-center gap-10">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Queue</span>
            <span className="text-xl font-black font-mono text-slate-400">{stats.pending}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1">Active</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black font-mono text-primary">{stats.downloading}</span>
              {stats.downloading > 0 && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Synced</span>
            <span className="text-xl font-black font-mono text-slate-200">{stats.completed}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-red-500/60 uppercase tracking-[0.2em] mb-1">Rejected</span>
            <span className="text-xl font-black font-mono text-red-500/80">{stats.failed}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group">
          <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-sm group-focus-within:text-primary transition-colors">search</span>
          <input 
            className="bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-xs font-bold text-slate-300 focus:border-primary/50 outline-none w-72 transition-all placeholder:text-slate-700" 
            placeholder="Search Global Index..." 
            type="text"
          />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Global Progress</span>
          <div className="flex items-center gap-3">
             <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary shadow-[0_0_10px_rgba(19,236,91,0.5)] transition-all duration-1000" style={{ width: `${stats.globalProgress}%` }}></div>
             </div>
             <span className="text-xs font-black font-mono text-primary">{stats.globalProgress}%</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default StatsHeader;
