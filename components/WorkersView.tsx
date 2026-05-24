import React, { useEffect, useState } from "react";
import { Activity, ExternalLink, Loader2, Power, Server, Square, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { useAppConfig } from "@/hooks/useAppConfig";
import { StartRequest, WorkerInfo } from "@/types";
import { api } from "@/lib/api-client";

const numberOrUndefined = (value: string) => (value.trim() ? Number.parseInt(value, 10) : undefined);

const WorkersView: React.FC = () => {
  const { tuning } = useAppConfig();
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [queueLen, setQueueLen] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [workerCount, setWorkerCount] = useState("1");
  const [usernamePrefix, setUsernamePrefix] = useState("worker");
  const [portBase, setPortBase] = useState("41000");
  const [runIdPrefix, setRunIdPrefix] = useState("web-trigger");
  const [playlistId, setPlaylistId] = useState("");
  const [chunkSize, setChunkSize] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const fetchWorkers = async () => {
    try {
      const data = await api.getWorkers();
      setWorkers(data.workers);
      setQueueLen(data.queue_len);
      setFailedCount(data.failed_count);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch workers");
    } finally {
      setInitialLoading(false);
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
        worker_count: Number.parseInt(workerCount, 10),
        username_prefix: usernamePrefix,
        port_base: Number.parseInt(portBase, 10),
        run_id_prefix: runIdPrefix,
        playlist_id: playlistId.trim() || undefined,
        chunk_size: numberOrUndefined(chunkSize),
        playlist_range_start: numberOrUndefined(rangeStart),
        playlist_range_end: numberOrUndefined(rangeEnd),
      };
      await api.startWorkers(req);
      await fetchWorkers();
    } catch (err: any) {
      setError(err.message || "Failed to start workers");
    } finally {
      setLoading(false);
    }
  };

  const handleStopAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.stopWorkers({});
      await fetchWorkers();
    } catch (err: any) {
      setError(err.message || "Failed to stop workers");
    } finally {
      setLoading(false);
    }
  };

  const handleStopOne = async (id: number) => {
    setError(null);
    try {
      await api.stopWorkers({ pids: [id] });
      await fetchWorkers();
    } catch (err: any) {
      setError(err.message || "Failed to stop worker");
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Diagnostics</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Start, stop, and inspect synchronization workers.
          </p>
        </div>
        <div className="flex gap-2">
          {workers.length > 0 && (
            <Button variant="outline" asChild>
              <a href="http://localhost:16686" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Traces
              </a>
            </Button>
          )}
          <Button variant="destructive" disabled={loading || workers.length === 0} onClick={handleStopAll}>
            <Square className="h-4 w-4" aria-hidden="true" />
            Stop All
          </Button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={fetchWorkers} />}

      <div className="grid gap-6 lg:grid-cols-[24rem_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Power className="h-4 w-4 text-primary" aria-hidden="true" />
              Deployment Config
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2 text-xs text-muted-foreground">
                Worker Count
                <Input type="number" value={workerCount} min={1} max={32} onChange={(event) => setWorkerCount(event.target.value)} />
              </label>
              <label className="space-y-2 text-xs text-muted-foreground">
                Port Base
                <Input type="number" value={portBase} min={10000} max={65000} onChange={(event) => setPortBase(event.target.value)} />
              </label>
            </div>

            <label className="space-y-2 text-xs text-muted-foreground">
              Playlist ID
              <Input value={playlistId} onChange={(event) => setPlaylistId(event.target.value)} placeholder="Required by API" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2 text-xs text-muted-foreground">
                Username Prefix
                <Input value={usernamePrefix} onChange={(event) => setUsernamePrefix(event.target.value)} />
              </label>
              <label className="space-y-2 text-xs text-muted-foreground">
                Run ID Prefix
                <Input value={runIdPrefix} onChange={(event) => setRunIdPrefix(event.target.value)} />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="space-y-2 text-xs text-muted-foreground">
                Chunk
                <Input type="number" value={chunkSize} onChange={(event) => setChunkSize(event.target.value)} placeholder="15" />
              </label>
              <label className="space-y-2 text-xs text-muted-foreground">
                Start
                <Input type="number" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} placeholder="0" />
              </label>
              <label className="space-y-2 text-xs text-muted-foreground">
                End
                <Input type="number" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} placeholder="End" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-4">
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Search</p>
                <p className="mt-1 font-mono text-sm">{tuning.searchConcurrency}</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Downloads</p>
                <p className="mt-1 font-mono text-sm">{tuning.downloadConcurrency}</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Timeout</p>
                <p className="mt-1 font-mono text-sm">{tuning.searchTimeoutSecs}s</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Empty Cutoff</p>
                <p className="mt-1 font-mono text-sm">{tuning.searchEmptyResultCutoff}</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Candidates</p>
                <p className="mt-1 font-mono text-sm">{tuning.maxCandidatesPerTrack}</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Attempts</p>
                <p className="mt-1 font-mono text-sm">{tuning.maxDownloadAttemptsPerTrack}</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Search Passes</p>
                <p className="mt-1 font-mono text-sm">{tuning.maxSearchPassesPerTrack}</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Request Cap</p>
                <p className="mt-1 font-mono text-sm">{tuning.maxRequestsPerTrack}</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Collect</p>
                <p className="mt-1 font-mono text-sm">{tuning.candidateCollectionSecs}s</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Ports</p>
                <p className="mt-1 truncate font-mono text-sm">{tuning.workerPortRange}</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Share</p>
                <p className="mt-1 truncate font-mono text-sm">{tuning.shareMode}</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Share Status</p>
                <p className="mt-1 truncate font-mono text-sm">{tuning.shareStatus}</p>
              </div>
            </div>

            <Button className="w-full" disabled={loading || !playlistId.trim()} onClick={handleStart}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Power className="h-4 w-4" aria-hidden="true" />}
              Deploy Workers
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Active</span>
                <span className="font-mono text-lg font-semibold">{workers.length}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Queue</span>
                <span className="font-mono text-lg font-semibold text-primary">{queueLen}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Failed</span>
                <span className="font-mono text-lg font-semibold text-destructive">{failedCount}</span>
              </CardContent>
            </Card>
          </div>

          {initialLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-40" />)}
            </div>
          ) : workers.length === 0 ? (
            <EmptyState icon={Server} title="No active workers" detail="Deploy workers to start synchronization." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {workers.map((worker) => (
                <Card key={worker.id} className="bg-card/80">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-primary">
                          <Server className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{worker.username}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">{worker.run_id}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" aria-label={`Stop ${worker.username}`} onClick={() => handleStopOne(worker.id)}>
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border bg-background/40 p-3">
                        <p className="text-xs text-muted-foreground">Port</p>
                        <p className="mt-1 font-mono text-sm text-primary">{worker.port}</p>
                      </div>
                      <div className="rounded-lg border bg-background/40 p-3">
                        <p className="text-xs text-muted-foreground">Uptime</p>
                        <p className="mt-1 font-mono text-sm">{Math.floor((Date.now() / 1000 - worker.started_at_epoch_secs) / 60)}m</p>
                      </div>
                    </div>

                    <Badge variant="outline" className="gap-1">
                      <Activity className="h-3 w-3" aria-hidden="true" />
                      Running
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default WorkersView;
