import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  DownloadCloud,
  ListMusic,
  Loader2,
  Menu,
  Pause,
  Play,
  RotateCw,
  Terminal,
  Waves,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api, type HealthStatus } from "@/lib/api-client";
import { AppConfigProvider } from "@/hooks/useAppConfig";
import { ThemeProvider } from "@/lib/theme";
import { isView, type View } from "@/lib/nav";
import {
  TrackStatus,
  type DownloadedFile,
  type GlobalStats,
  type LogEntry,
  type NetworkStats,
  type StartRequest,
  type Track,
} from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Sidebar } from "@/components/Sidebar";
import { StatCard } from "@/components/StatCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TrackTable } from "@/components/TrackTable";
import { PlaylistsView } from "@/components/PlaylistsView";
import { DownloadsBrowser } from "@/components/DownloadsBrowser";
import { WorkersView } from "@/components/WorkersView";
import { CandidateModal } from "@/components/CandidateModal";

const LIBRARY_ID = "all";
const PAGE_SIZE = 100;
const POLL_MS = 1500;

const IN_FLIGHT: TrackStatus[] = [
  TrackStatus.SEARCHING,
  TrackStatus.FILTERING,
  TrackStatus.DOWNLOADING,
  TrackStatus.FINALIZING,
];

const emptyStats: GlobalStats = {
  totalTracks: 0,
  pending: 0,
  downloading: 0,
  completed: 0,
  failed: 0,
  globalProgress: 0,
  remainingTime: "—",
  tableCounts: {},
};
const emptyNetwork: NetworkStats = { status: "DISCONNECTED", user: "—", latency: "—", node: "—", totalBandwidth: "—" };

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Run health and active transfers" },
  library: { title: "Library", subtitle: "Every track and its current stage" },
  playlists: { title: "Playlists", subtitle: "Start a new Spotify sync" },
  downloads: { title: "Downloads", subtitle: "Completed audio files" },
  diagnostics: { title: "Diagnostics", subtitle: "Workers and server tuning" },
  logs: { title: "Logs", subtitle: "Live system telemetry" },
};

type LibraryFilter = "all" | "active" | "completed" | "failed";

function getInitialView(): View {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return isView(hash) ? hash : "overview";
}

/** Merge track pages by id, newest (highest id) first, letting fresh entries win. */
function mergeTracks(existing: Track[], incoming: Track[]): Track[] {
  const byId = new Map<string, Track>();
  for (const track of existing) byId.set(String(track.id), track);
  for (const track of incoming) byId.set(String(track.id), track);
  return Array.from(byId.values()).sort((a, b) => Number(b.id) - Number(a.id));
}

function Dashboard() {
  const [view, setView] = useState<View>(getInitialView);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<GlobalStats>(emptyStats);
  const [network, setNetwork] = useState<NetworkStats>(emptyNetwork);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [nextCursor, setNextCursor] = useState<number | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(true);

  const [downloads, setDownloads] = useState<DownloadedFile[]>([]);
  const [downloadsLoading, setDownloadsLoading] = useState(false);

  const [downloadsPaused, setDownloadsPaused] = useState(false);
  const [pipelineBusy, setPipelineBusy] = useState(false);

  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const navigate = useCallback((next: View) => setView(next), []);

  // Keep the URL hash in sync with the active view (deep-linkable, survives refresh).
  useEffect(() => {
    const onHashChange = () => setView(getInitialView());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  useEffect(() => {
    const nextHash = view === "overview" ? "" : `#${view}`;
    if (window.location.hash !== nextHash) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  }, [view]);

  const refreshStats = useCallback(async () => {
    const [s, n, l] = await Promise.all([api.getStats(), api.getNetwork(), api.getLogs()]);
    setStats(s);
    setNetwork(n);
    setLogs(l);
  }, []);

  const loadLibrary = useCallback(async () => {
    const playlist = await api.getPlaylist(LIBRARY_ID, { limit: PAGE_SIZE });
    setTracks(playlist.tracks ?? []);
    setNextCursor(playlist.nextCursor);
    setLibraryLoading(false);
  }, []);

  const pollLibrary = useCallback(async () => {
    // Refresh the newest page and merge, so live status updates without dropping
    // older pages the user loaded via "Load more".
    const playlist = await api.getPlaylist(LIBRARY_ID, { limit: PAGE_SIZE });
    setTracks((current) => mergeTracks(current, playlist.tracks ?? []));
    setNextCursor((current) => playlist.nextCursor ?? current);
  }, []);

  const refreshPipeline = useCallback(async () => {
    const { downloadsPaused: paused } = await api.getPipeline();
    setDownloadsPaused(paused);
  }, []);

  const toggleDownloads = useCallback(async () => {
    setPipelineBusy(true);
    const next = !downloadsPaused;
    try {
      const res = await api.setDownloadsPaused(next);
      setDownloadsPaused(res.downloadsPaused);
      toast.success(res.downloadsPaused ? "Downloads paused" : "Downloads resumed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle downloads");
    } finally {
      setPipelineBusy(false);
    }
  }, [downloadsPaused]);

  const loadMore = useCallback(async () => {
    if (nextCursor == null) return;
    setLoadingMore(true);
    try {
      const playlist = await api.getPlaylist(LIBRARY_ID, { limit: PAGE_SIZE, cursor: nextCursor });
      setTracks((current) => mergeTracks(current, playlist.tracks ?? []));
      setNextCursor(playlist.nextCursor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load more tracks");
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor]);

  const fetchDownloads = useCallback(async () => {
    setDownloadsLoading(true);
    try {
      setDownloads(await api.getDownloads());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load downloads");
    } finally {
      setDownloadsLoading(false);
    }
  }, []);

  const boot = useCallback(async () => {
    setBooting(true);
    setBootError(null);
    try {
      const h = await api.getHealth();
      setHealth(h);
      if (h.api !== "ONLINE" || h.db !== "CONNECTED") {
        throw new Error(h.error || `Backend reported API ${h.api}, DB ${h.db}`);
      }
      await Promise.all([refreshStats(), loadLibrary()]);
      setStale(false);
      setBooting(false);
    } catch (err) {
      setBootError(err instanceof Error ? err.message : "Could not reach the backend");
      setBooting(false);
    }
  }, [refreshStats, loadLibrary]);

  useEffect(() => {
    void boot();
  }, [boot]);

  // Live polling of stats + library once booted.
  useEffect(() => {
    if (booting || bootError) return;
    const tick = () =>
      Promise.all([refreshStats(), pollLibrary()])
        .then(() => setStale(false))
        .catch(() => setStale(true));
    void refreshPipeline();
    const interval = setInterval(tick, POLL_MS);
    // Pipeline pause state changes rarely; poll it less often than stats/library.
    const pipelineInterval = setInterval(() => void refreshPipeline().catch(() => {}), POLL_MS * 4);
    return () => {
      clearInterval(interval);
      clearInterval(pipelineInterval);
    };
  }, [booting, bootError, refreshStats, pollLibrary, refreshPipeline]);

  // Downloads are fetched lazily when their view opens.
  useEffect(() => {
    if (view === "downloads" && !booting && !bootError) void fetchDownloads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, booting, bootError]);

  const filteredTracks = useMemo(() => {
    switch (libraryFilter) {
      case "active":
        return tracks.filter((t) => IN_FLIGHT.includes(t.status));
      case "completed":
        return tracks.filter((t) => t.status === TrackStatus.COMPLETED);
      case "failed":
        return tracks.filter((t) => t.status === TrackStatus.FAILED);
      default:
        return tracks;
    }
  }, [tracks, libraryFilter]);

  const activeTracks = useMemo(() => tracks.filter((t) => IN_FLIGHT.includes(t.status)), [tracks]);

  const openTrack = (track: Track) => {
    setSelectedTrack(track);
    setModalOpen(true);
  };

  const handleLaunch = async (req: StartRequest) => {
    const started = await api.startWorkers(req);
    toast.success(`Started ${started.length} worker${started.length === 1 ? "" : "s"} for ${req.playlist_id}`);
    await Promise.all([refreshStats(), loadLibrary()]).catch(() => setStale(true));
    navigate("library");
  };

  const manualRefresh = () => {
    if (view === "downloads") {
      void fetchDownloads();
      return;
    }
    Promise.all([refreshStats(), loadLibrary()])
      .then(() => setStale(false))
      .catch(() => setStale(true));
  };

  if (booting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Waves className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Starting console…</p>
          {health?.targetUrl ? <p className="mt-1 font-mono text-xs text-muted-foreground">{health.targetUrl}</p> : null}
        </div>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 rounded-full bg-primary/70 animate-indeterminate" />
        </div>
      </div>
    );
  }

  const meta = VIEW_META[view];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        currentView={view}
        onNavigate={navigate}
        network={network}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-foreground">{meta.title}</h1>
            <p className="truncate text-xs text-muted-foreground">{meta.subtitle}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span
              className={cn(
                "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex",
                stale ? "bg-warning/15 text-warning" : "bg-success/12 text-success",
              )}
              title={stale ? "Reconnecting to the backend" : "Receiving live updates"}
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", stale ? "bg-warning" : "bg-success", !stale && "animate-pulse")}
                aria-hidden
              />
              {stale ? "Reconnecting" : "Live"}
            </span>
            <Button
              variant={downloadsPaused ? "default" : "ghost"}
              size="icon"
              onClick={toggleDownloads}
              disabled={pipelineBusy}
              aria-label={downloadsPaused ? "Resume downloads" : "Pause downloads"}
              aria-pressed={downloadsPaused}
              title={downloadsPaused ? "Resume downloads" : "Pause downloads (manual stop)"}
            >
              {pipelineBusy ? (
                <Loader2 className="h-[1.15rem] w-[1.15rem] animate-spin" aria-hidden />
              ) : downloadsPaused ? (
                <Play className="h-[1.15rem] w-[1.15rem]" aria-hidden />
              ) : (
                <Pause className="h-[1.15rem] w-[1.15rem]" aria-hidden />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={manualRefresh} aria-label="Refresh" title="Refresh">
              <RotateCw className="h-[1.15rem] w-[1.15rem]" aria-hidden />
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {downloadsPaused ? (
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-warning/30 bg-warning/10 px-4 py-1.5 text-center text-xs font-medium text-warning">
            <span className="inline-flex items-center gap-1.5">
              <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Downloads paused — workers stay up and in-flight transfers are held (no attempts spent).
            </span>
            <button type="button" onClick={toggleDownloads} disabled={pipelineBusy} className="underline underline-offset-2 hover:no-underline disabled:opacity-50">
              Resume
            </button>
          </div>
        ) : null}

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
            {bootError ? (
              <div className="mb-6">
                <ErrorState title="Backend unreachable" message={bootError} onRetry={() => void boot()} />
              </div>
            ) : null}

            {view === "overview" ? (
              <OverviewView
                stats={stats}
                activeTracks={activeTracks}
                onSelect={openTrack}
                onStart={() => navigate("playlists")}
              />
            ) : view === "library" ? (
              <LibraryView
                tracks={filteredTracks}
                loading={libraryLoading}
                filter={libraryFilter}
                onFilter={setLibraryFilter}
                onSelect={openTrack}
                canLoadMore={libraryFilter === "all" && nextCursor != null}
                loadingMore={loadingMore}
                onLoadMore={loadMore}
              />
            ) : view === "playlists" ? (
              <PlaylistsView onLaunch={handleLaunch} />
            ) : view === "downloads" ? (
              <DownloadsBrowser downloads={downloads} loading={downloadsLoading} onRefresh={fetchDownloads} />
            ) : view === "diagnostics" ? (
              <WorkersView />
            ) : (
              <LogsView logs={logs} />
            )}
          </div>
        </main>
      </div>

      <CandidateModal track={selectedTrack} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function OverviewView({
  stats,
  activeTracks,
  onSelect,
  onStart,
}: {
  stats: GlobalStats;
  activeTracks: Track[];
  onSelect: (t: Track) => void;
  onStart: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total tracks" value={stats.totalTracks} Icon={ListMusic} tone="primary" />
        <StatCard label="Downloading" value={stats.downloading} Icon={DownloadCloud} tone="info" />
        <StatCard label="Completed" value={stats.completed} Icon={CheckCircle2} tone="success" />
        <StatCard label="Failed" value={stats.failed} Icon={XCircle} tone={stats.failed > 0 ? "danger" : "muted"} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Overall progress</p>
            <p className="text-xs text-muted-foreground">
              {stats.completed} of {stats.totalTracks} tracks · est. {stats.remainingTime}
            </p>
          </div>
          <span className="tabular text-2xl font-semibold tracking-tight text-foreground">{stats.globalProgress}%</span>
        </div>
        <Progress value={stats.globalProgress} className="mt-4 h-2" />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Active transfers</h2>
          <Button variant="outline" size="sm" onClick={onStart}>
            Start a sync
          </Button>
        </div>
        <TrackTable
          tracks={activeTracks}
          onSelect={onSelect}
          emptyTitle="Nothing in flight"
          emptyDetail="No tracks are currently searching or downloading. Start a sync from Playlists."
          emptyIcon={DownloadCloud}
        />
      </section>
    </div>
  );
}

function LibraryView({
  tracks,
  loading,
  filter,
  onFilter,
  onSelect,
  canLoadMore,
  loadingMore,
  onLoadMore,
}: {
  tracks: Track[];
  loading: boolean;
  filter: LibraryFilter;
  onFilter: (f: LibraryFilter) => void;
  onSelect: (t: Track) => void;
  canLoadMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const filters: { id: LibraryFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "completed", label: "Completed" },
    { id: "failed", label: "Failed" },
  ];
  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilter(f.id)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <TrackTable
        tracks={tracks}
        loading={loading}
        onSelect={onSelect}
        emptyTitle="No tracks here yet"
        emptyDetail="Start a sync from Playlists to populate the library, then watch each track move through its stages."
      />

      {canLoadMore ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Load older tracks
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function LogsView({ logs }: { logs: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  if (logs.length === 0) {
    return (
      <EmptyState
        icon={Terminal}
        title="No log events yet"
        detail="Telemetry from the backend appears here as workers search, judge, and download."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto scrollbar-thin p-2 font-mono text-xs">
        {logs.map((log) => (
          <div key={log.id} className="grid grid-cols-[auto_auto_1fr] items-baseline gap-3 rounded px-2 py-1 hover:bg-muted/40">
            <span className="tabular text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className={cn("uppercase", log.level === "debug" ? "text-muted-foreground" : "text-info")}>{log.level}</span>
            <span className="break-words text-foreground">{log.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppConfigProvider>
          <Dashboard />
          <Toaster />
        </AppConfigProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
