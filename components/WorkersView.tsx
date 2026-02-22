
import React, { useState, useEffect } from 'react';
import { WorkerInfo, StartRequest } from '../types';
import { api } from '../api';

const WorkersView: React.FC = () => {
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Start form state
  const [workerCount, setWorkerCount] = useState(4);
  const [usernamePrefix, setUsernamePrefix] = useState('worker');
  const [portBase, setPortBase] = useState(41000);
  const [runIdPrefix, setRunIdPrefix] = useState('web-trigger');
  const [playlistParts, setPlaylistParts] = useState<number | undefined>(undefined);
  const [playlistPartOffset, setPlaylistPartOffset] = useState(0);
  const [rangeStart, setRangeStart] = useState<number | undefined>(undefined);
  const [rangeEnd, setRangeEnd] = useState<number | undefined>(undefined);

  const fetchWorkers = async () => {
    try {
      const data = await api.getWorkers();
      setWorkers(data);
    } catch (err) {
      console.error("Failed to fetch workers", err);
    }
  };

  useEffect(() => {
    fetchWorkers();
    const interval = setInterval(fetchWorkers, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const req: StartRequest = {
        worker_count: workerCount,
        username_prefix: usernamePrefix,
        port_base: portBase,
        run_id_prefix: runIdPrefix,
        playlist_parts: playlistParts,
        playlist_part_offset: playlistPartOffset,
        playlist_range_start: rangeStart,
        playlist_range_end: rangeEnd
      };
      await api.startWorkers(req);
      await fetchWorkers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStopAll = async () => {
    setLoading(true);
    try {
      await api.stopWorkers({});
      await fetchWorkers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStopOne = async (pid: number) => {
    try {
      await api.stopWorkers({ pids: [pid] });
      await fetchWorkers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black mb-1 capitalize tracking-tighter">Distributed Workers</h2>
          <p className="text-slate-500 font-medium max-w-lg">
            Manage parallel synchronization nodes. Each worker operates as an independent Soulseek client.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleStopAll}
            disabled={loading || workers.length === 0}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black px-6 py-3 rounded-2xl text-[10px] uppercase tracking-widest border border-red-500/20 transition-all disabled:opacity-50"
          >
            Terminate All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Control Panel */}
        <div className="bg-surface/30 border border-white/5 rounded-3xl p-8 space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Deployment Config</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Worker Count</label>
              <input 
                type="number" 
                value={workerCount}
                onChange={(e) => setWorkerCount(parseInt(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 focus:border-primary/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Username Prefix</label>
              <input 
                type="text" 
                value={usernamePrefix}
                onChange={(e) => setUsernamePrefix(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 focus:border-primary/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Port Base</label>
              <input 
                type="number" 
                value={portBase}
                onChange={(e) => setPortBase(parseInt(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 focus:border-primary/50 outline-none transition-all"
              />
            </div>
            
            <div className="pt-4 border-t border-white/5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Partitioning</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Total Parts</label>
                  <input 
                    type="number" 
                    placeholder="Auto"
                    value={playlistParts || ''}
                    onChange={(e) => setPlaylistParts(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Part Offset</label>
                  <input 
                    type="number" 
                    value={playlistPartOffset}
                    onChange={(e) => setPlaylistPartOffset(parseInt(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Range Filter</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Start Index</label>
                  <input 
                    type="number" 
                    placeholder="None"
                    value={rangeStart ?? ''}
                    onChange={(e) => setRangeStart(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">End Index</label>
                  <input 
                    type="number" 
                    placeholder="None"
                    value={rangeEnd ?? ''}
                    onChange={(e) => setRangeEnd(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <button 
            onClick={handleStart}
            disabled={loading}
            className="w-full bg-primary text-background-dark font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(19,236,91,0.2)] disabled:opacity-50"
          >
            {loading ? 'Deploying...' : 'Deploy Workers'}
          </button>
        </div>

        {/* Workers List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Active Nodes ({workers.length})</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workers.map((worker) => (
              <div key={worker.pid} className="bg-surface/40 border border-white/5 rounded-3xl p-6 flex flex-col group hover:border-primary/20 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                      <span className="material-icons text-primary text-xl">memory</span>
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-100">{worker.username}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PID: {worker.pid}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleStopOne(worker.pid)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center transition-all"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Port</div>
                    <div className="text-xs font-mono font-bold text-primary">{worker.port}</div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Uptime</div>
                    <div className="text-xs font-mono font-bold text-slate-300">
                      {Math.floor((Date.now() / 1000 - worker.started_at_epoch_secs) / 60)}m
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {workers.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-white/5 rounded-3xl">
                <span className="material-icons text-4xl mb-4 opacity-20">sensors_off</span>
                <p className="font-bold text-sm">No active workers detected</p>
                <p className="text-xs mt-1">Deploy workers to start synchronization</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkersView;
