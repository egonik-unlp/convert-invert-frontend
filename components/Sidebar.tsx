
import React from 'react';
import { NetworkStats } from '../types';

interface SidebarProps {
  network: NetworkStats;
}

const Sidebar: React.FC<SidebarProps> = ({ network }) => {
  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', active: true },
    { id: 'playlists', icon: 'queue_music', label: 'Playlists' },
    { id: 'downloads', icon: 'download', label: 'Downloads' },
    { id: 'history', icon: 'history', label: 'History' },
  ];

  return (
    <aside className="w-64 border-r border-primary/10 bg-background-dark/50 flex flex-col z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(19,236,91,0.2)]">
          <span className="material-icons text-background-dark font-bold">sync</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-primary">SyncDash</h1>
      </div>

      <nav className="flex-1 px-4 space-y-2 py-4">
        {navItems.map(item => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              item.active 
                ? 'bg-primary/10 text-primary active-glow' 
                : 'text-slate-500 hover:bg-primary/5 hover:text-primary'
            }`}
          >
            <span className="material-icons text-[20px]">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </a>
        ))}

        <div className="pt-8 pb-2 px-4 text-xs font-semibold text-slate-600 uppercase tracking-widest">
          System
        </div>
        <a className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-primary/5 hover:text-primary transition-all" href="#settings">
          <span className="material-icons text-[20px]">settings</span>
          <span className="font-medium">Settings</span>
        </a>
      </nav>

      <div className="p-4 mt-auto border-t border-primary/10">
        <div className="bg-surface/40 rounded-xl p-4 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${network.status === 'CONNECTED' ? 'bg-primary animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Soulseek Network</span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-[10px] text-slate-500">Connected as {network.user}</span>
            <span className="text-[10px] text-primary font-mono">{network.latency}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
