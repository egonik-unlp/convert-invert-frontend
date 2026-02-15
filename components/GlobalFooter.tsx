
import React from 'react';
import { GlobalStats, NetworkStats } from '../types';

interface GlobalFooterProps {
  stats: GlobalStats;
  network: NetworkStats;
}

const GlobalFooter: React.FC<GlobalFooterProps> = ({ stats, network }) => {
  return (
    <footer className="h-16 bg-background-dark border-t border-primary/10 px-8 flex items-center justify-between shrink-0 sticky bottom-0 z-20 backdrop-blur-lg">
      <div className="flex items-center gap-6 w-1/3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Global Progress</span>
        <div className="flex-1 h-1.5 bg-primary/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary shadow-[0_0_10px_#13ec5b] transition-all duration-1000 ease-out" 
            style={{ width: `${stats.globalProgress}%` }}
          ></div>
        </div>
        <span className="text-xs font-bold text-primary font-mono">{stats.globalProgress}%</span>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <span className="material-icons text-primary text-sm animate-pulse">downloading</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Bandwidth: <span className="text-primary">{network.totalBandwidth}</span>
          </span>
        </div>
        <div className="h-4 w-px bg-slate-800"></div>
        <div className="flex items-center gap-2">
          <span className="material-icons text-slate-500 text-sm">schedule</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Remaining: <span className="text-slate-100">{stats.remainingTime}</span>
          </span>
        </div>
        <div className="h-4 w-px bg-slate-800"></div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
            Node: <span className="text-slate-300">{network.node}</span>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default GlobalFooter;
