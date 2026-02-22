
import React from 'react';
import { NetworkStats } from '../types';
import { HealthStatus } from '../api';

interface SidebarProps {
  network: NetworkStats;
  health: HealthStatus | null;
  currentView: string;
  onViewChange: (view: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ network, health, currentView, onViewChange }) => {
  const navItems = [
    { id: 'dashboard', icon: 'grid_view', label: 'Dashboard' },
    { id: 'playlists', icon: 'library_music', label: 'Playlists' },
    { id: 'workers', icon: 'hub', label: 'Workers' },
    { id: 'downloads', icon: 'cloud_download', label: 'Downloads' },
    { id: 'rejected', icon: 'report_problem', label: 'Rejected' },
    { id: 'history', icon: 'auto_graph', label: 'History' },
    { id: 'logs', icon: 'terminal', label: 'System Logs' },
  ];

  return (
    <aside className="w-72 border-r border-white/5 bg-background-dark/90 flex flex-col z-30">
      <div className="p-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(19,236,91,0.2)] rotate-3 group hover:rotate-0 transition-transform duration-500">
          <span className="material-icons text-background-dark font-black text-2xl">sync_alt</span>
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-100 italic font-serif">SyncDash</h1>
          <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em] block -mt-1">Enterprise</span>
        </div>
      </div>

      <nav className="flex-1 px-6 space-y-2 py-4">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-5 px-6 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden ${
              currentView === item.id
                ? 'bg-primary text-background-dark shadow-[0_10px_20px_rgba(19,236,91,0.15)]' 
                : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <span className={`material-icons text-[22px] z-10 ${currentView === item.id ? 'text-background-dark' : 'group-hover:text-primary'}`}>
              {item.icon}
            </span>
            <span className="font-black text-[11px] uppercase tracking-widest z-10">{item.label}</span>
            {currentView === item.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-emerald-400 opacity-90"></div>
            )}
          </button>
        ))}

        <div className="pt-12 pb-4 px-8 text-[9px] font-black text-slate-700 uppercase tracking-[0.3em]">
          System Diagnostics
        </div>
        <button 
          onClick={() => onViewChange('settings')}
          className={`w-full flex items-center gap-5 px-6 py-4 rounded-2xl transition-all duration-500 group ${
            currentView === 'settings' ? 'bg-white/10 text-white' : 'text-slate-500 hover:bg-white/5'
          }`}
        >
          <span className="material-icons text-[22px]">analytics</span>
          <span className="font-black text-[11px] uppercase tracking-widest">Performance</span>
        </button>
      </nav>

      <div className="p-6 mt-auto">
        <div className="bg-black/40 rounded-[2rem] p-6 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-1.5 h-1.5 rounded-full ${network.status === 'CONNECTED' ? 'bg-primary animate-pulse shadow-[0_0_8px_rgba(19,236,91,0.8)]' : 'bg-red-500'}`}></div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Soulseek Node</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mb-1">Session: <span className="text-slate-100">{network.user}</span></p>
          <div className="text-[11px] text-primary font-mono font-black tracking-tight">{network.node}</div>
          
          {health && (
            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Jaeger</span>
              <div className={`flex items-center gap-2 ${health.jaeger === 'ONLINE' ? 'text-primary' : 'text-slate-700'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${health.jaeger === 'ONLINE' ? 'bg-primary shadow-[0_0_8px_rgba(19,236,91,0.5)]' : 'bg-slate-800'}`}></div>
                <span className="text-[10px] font-black uppercase tracking-tight">{health.jaeger || 'OFFLINE'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
