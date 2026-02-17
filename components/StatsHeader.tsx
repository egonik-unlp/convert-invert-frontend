
import React from 'react';
import { GlobalStats } from '../types';

interface StatsHeaderProps {
  stats: GlobalStats;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({ stats }) => {
  return (
    <header className="h-20 border-b border-primary/10 flex items-center justify-between px-8 bg-background-dark/30 backdrop-blur-md z-10 shrink-0">
      <div className="flex items-center gap-8">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Tracks</span>
          <span className="text-2xl font-bold">{stats.totalTracks}</span>
        </div>
        <div className="h-8 w-px bg-primary/20"></div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending</span>
          <span className="text-2xl font-bold text-slate-400">{stats.pending}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Downloading</span>
          <span className="text-2xl font-bold text-primary">{stats.downloading}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed</span>
          <span className="text-2xl font-bold text-primary/80">{stats.completed}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rejected</span>
          <span className="text-2xl font-bold text-red-500">{stats.failed}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm group-focus-within:text-primary transition-colors">search</span>
          <input 
            className="bg-background-dark/50 border border-primary/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none w-64 transition-all" 
            placeholder="Search tracks..." 
            type="text"
          />
        </div>
        <button className="bg-primary hover:bg-primary/90 text-background-dark font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all shadow-[0_4px_12px_rgba(19,236,91,0.2)]">
          <span className="material-icons text-sm">add</span>
          Sync New
        </button>
      </div>
    </header>
  );
};

export default StatsHeader;
