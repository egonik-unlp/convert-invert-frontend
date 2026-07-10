import { useEffect, useState } from "react";
import { Activity, ExternalLink, Loader2, Power, Server, Square, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StatCard } from "@/components/StatCard";
import { useAppConfig } from "@/hooks/useAppConfig";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { StartRequest, WorkerInfo } from "@/types";

const numberOrUndefined = (value: string) => (value.trim() ? Number.parseInt(value, 10) : undefined);

export function WorkersView() {
  const { tuning } = useAppConfig();
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [queueLen, setQueueLen] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [workerCount, setWorkerCount] = useState("1");
  const [portBase, setPortBase] = useState("41000");
  const [playlistId, setPlaylistId] = useState("");
  const [chunkSize, setChunkSize] = useState("");

  const fetchWorkers = async () => {
    try {
      const data = await api.getWorkers();
      setWorkers(data.workers);
      setQueueLen(data.queue_len);
      setFailedCount(data.failed_count);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch workers");
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    const interval = setInterval(fetchWorkers, 3000);
    return () => clearInterval(interval);
  }, []);

  const deploy = async () => {
    setBusy(true);
    try {
      const req: StartRequest = {
        worker_count: Number.parseInt(workerCount, 10),
        port_base: Number.parseInt(portBase, 10),
        playlist_id: playlistId.trim() || undefined,
        chunk_size: numberOrUndefined(chunkSize),
        username_prefix: "worker",
        run_id_prefix: "web-trigger",
      };
      const started = await api.startWorkers(req);
      toast.success(`Deployed ${started.length} worker${started.length === 1 ? "" : "s"}`);
      await fetchWorkers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start workers");
    } finally {
      setBusy(false);
    }
  };

  const stopAll = async () => {
    setBusy(true);
    try {
      const stopped = await api.stopWorkers({});
      toast.success(`Stopped ${stopped.length} worker${stopped.length === 1 ? "" : "s"}`);
      await fetchWorkers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to stop workers");
    } finally {
      setBusy(false);
    }
  };

  const stopOne = async (id: number) => {
    try {
      await api.stopWorkers({ pids: [id] });
      toast.success(`Stopped worker #${id}`);
      await fetchWorkers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to stop worker");
    }
  };

  const tracesUrl = typeof window !== "undefined" ? `http://${window.location.hostname}:16686` : "http://localhost:16686";
  const accountConflict = tuning.shareStatus === "account_conflict";

  const tuningItems: { label: string; value: import("react").ReactNode }[] = [
    { label: "Search conc.", value: tuning.searchConcurrency },
    { label: "Download conc.", value: tuning.downloadConcurrency },
    { label: "Search timeout", value: `${tuning.searchTimeoutSecs}s` },
    { label: "Empty cutoff", value: tuning.searchEmptyResultCutoff },
    { label: "Candidates", value: tuning.maxCandidatesPerTrack },
    { label: "Attempts", value: tuning.maxDownloadAttemptsPerTrack },
    { label: "Search passes", value: tuning.maxSearchPassesPerTrack },
    { label: "Request cap", value: tuning.maxRequestsPerTrack },
    { label: "Collect wait", value: `${tuning.candidateCollectionSecs}s` },
    { label: "Retry backoff", value: `${tuning.retryBackoffMs}ms` },
    { label: "Search pacing", value: `${tuning.searchPacingMs}ms` },
    { label: "Peer cooldown", value: `${tuning.peerCooldownSecs}s` },
    { label: "Worker ports", value: tuning.workerPortRange },
    { label: "Share mode", value: tuning.shareMode },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-3 gap-3">
          <StatCard label="Active workers" value={workers.length} Icon={Server} tone="primary" />
          <StatCard label="Queued chunks" value={queueLen} Icon={Activity} tone="info" />
          <StatCard label="Failed" value={failedCount} Icon={TriangleAlert} tone={failedCount > 0 ? "danger" : "muted"} />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" asChild>
            <a href={tracesUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden />
              Traces
            </a>
          </Button>
          <Button variant="destructive" disabled={busy || workers.length === 0} onClick={stopAll}>
            <Square className="h-4 w-4" aria-hidden />
            Stop all
          </Button>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={fetchWorkers} /> : null}
      {accountConflict ? (
        <p className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          The sharing sidecar and a worker are configured with the same Soulseek account, which can trigger a ban.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Power className="h-4 w-4 text-primary" aria-hidden />
            Advanced deploy
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Workers
              <Input type="number" min={1} max={32} value={workerCount} onChange={(e) => setWorkerCount(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Port base
              <Input type="number" min={10000} max={65000} value={portBase} onChange={(e) => setPortBase(e.target.value)} />
            </label>
          </div>
          <label className="block space-y-1.5 text-xs text-muted-foreground">
            Playlist ID
            <Input value={playlistId} onChange={(e) => setPlaylistId(e.target.value)} placeholder="Spotify playlist ID" />
          </label>
          <label className="block space-y-1.5 text-xs text-muted-foreground">
            Chunk size
            <Input type="number" value={chunkSize} onChange={(e) => setChunkSize(e.target.value)} placeholder="15" />
          </label>
          <Button className="w-full" disabled={busy || !playlistId.trim()} onClick={deploy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Power className="h-4 w-4" aria-hidden />}
            Deploy workers
          </Button>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Server tuning</p>
            <div className="grid grid-cols-2 gap-2">
              {tuningItems.map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[0.7rem] text-muted-foreground">{item.label}</p>
                  <p className="tabular mt-0.5 truncate font-mono text-sm text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          {initialLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : workers.length === 0 ? (
            <EmptyState
              icon={Server}
              title="No active workers"
              detail="Start a sync from Playlists, or deploy workers with the advanced form."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {workers.map((worker) => {
                const uptimeMin = Math.max(0, Math.floor(Date.now() / 1000 - worker.started_at_epoch_secs) / 60);
                return (
                  <div key={worker.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                          <Server className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{worker.username}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">{worker.run_id}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Stop ${worker.username}`}
                        onClick={() => stopOne(worker.id)}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                        Running
                      </span>
                      <span className="tabular font-mono">port {worker.port}</span>
                      <span className={cn("tabular font-mono")}>{Math.round(uptimeMin)}m up</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
