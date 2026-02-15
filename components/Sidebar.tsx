
import React from 'react';
import { NetworkStats } from '../types';

interface SidebarProps {
  network: NetworkStats;
  currentView: string;
  onViewChange: (view: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ network, currentView, onViewChange }) => {
  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'playlists', icon: 'queue_music', label: 'Playlists' },
    { id: 'downloads', icon: 'download', label: 'Downloads' },
    { id: 'history', icon: 'history', label: 'History' },
  ];

  return (
    <aside className="w-64 border-r border-primary/10 bg-background-dark/80 flex flex-col z-20">
      <div className="p-8 flex items-center gap-4">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(19,236,91,0.25)]">
          <span className="material-icons text-background-dark font-black">sync</span>
        </div>
        <h1 className="text-xl font-black tracking-tighter text-slate-100">SyncDash</h1>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 py-4">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 group ${
              currentView === item.id
                ? 'bg-primary/10 text-primary active-glow' 
                : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <span className={`material-icons text-[20px] transition-transform ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
            </span>
            <span className="font-bold text-sm tracking-tight">{item.label}</span>
          </button>
        ))}

        <div className="pt-8 pb-4 px-6 text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">
          Engine System
        </div>
        <button 
          onClick={() => onViewChange('settings')}
          className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all ${
            currentView === 'settings' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-white/5'
          }`}
        >
          <span className="material-icons text-[20px]">settings</span>
          <span className="font-bold text-sm">Diagnostics</span>
        </button>
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-surface/50 rounded-2xl p-5 border border-primary/5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-2 h-2 rounded-full ${network.status === 'CONNECTED' ? 'bg-primary animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Soulseek Status</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">Session: <span className="text-slate-200">{network.user}</span></p>
          <div className="mt-2 text-[11px] text-primary font-mono font-bold tracking-tight">{network.node}</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
