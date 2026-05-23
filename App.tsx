import React, { useEffect, useMemo, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import { api, HealthStatus } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Table, TableBody } from "@/components/ui/table";
import { AppConfigProvider } from "@/hooks/useAppConfig";
import { TrackStatus, Track, Playlist, NetworkStats, GlobalStats, LogEntry, StartRequest, DownloadedFile } from "@/types";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import Sidebar from "@/components/Sidebar";
import StatsHeader from "@/components/StatsHeader";
import TrackRow from "@/components/TrackRow";
import GlobalFooter from "@/components/GlobalFooter";
import SimilarityModal from "@/components/SimilarityModal";
import WorkersView from "@/components/WorkersView";
import PlaylistsView from "@/components/PlaylistsView";
import { DownloadsBrowser } from "@/components/DownloadsBrowser";

type View = "dashboard" | "playlists" | "downloads" | "rejected" | "history" | "settings" | "logs";
const viewValues: View[] = ["dashboard", "playlists", "downloads", "rejected", "history", "settings", "logs"];

const getInitialView = (): View => {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return viewValues.includes(hash as View) ? (hash as View) : "dashboard";
};

const fallbackNetwork: NetworkStats = { status: "DISCONNECTED", user: "...", latency: "...", node: "...", totalBandwidth: "..." };
const fallbackStats: GlobalStats = {
  totalTracks: 0,
  pending: 0,
  downloading: 0,
  completed: 0,
  failed: 0,
  globalProgress: 0,
  remainingTime: "...",
  tableCounts: {},
};

const Dashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(getInitialView);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [network, setNetwork] = useState<NetworkStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [downloads, setDownloads] = useState<DownloadedFile[]>([]);
  const [downloadsLoading, setDownloadsLoading] = useState(false);
  const [downloadsTab, setDownloadsTab] = useState<"files" | "pipeline">("files");

  const fetchDownloads = async () => {
    setDownloadsLoading(true);
    try {
      const data = await api.getDownloads();
      setDownloads(data);
    } catch (err) {
      console.warn("Failed to load completed downloads", err);
    } finally {
      setDownloadsLoading(false);
    }
  };

  const loadDashboardData = async () => {
      const [s, n, l] = await Promise.all([api.getStats(), api.getNetwork(), api.getLogs()]);
      setStats(s);
      setNetwork(n);
      setLogs(l);
    if (activePlaylist) {
      setActivePlaylist(await api.getPlaylist(activePlaylist.id));
    }
  };

  const checkHealthAndLoad = async () => {
    setIsBooting(true);
    setError(null);
    try {
      const h = await api.getHealth();
      setHealth(h);
      if (h.api !== "ONLINE" || h.db !== "CONNECTED") {
        throw new Error(h.error || `Database bridge reported as ${h.db || "OFFLINE"}`);
      }

      const [s, n, p, l] = await Promise.all([api.getStats(), api.getNetwork(), api.getPlaylists(), api.getLogs()]);
      setStats(s);
      setNetwork(n);
      setPlaylists(p);
      setLogs(l);
      if (p.length > 0) setActivePlaylist(await api.getPlaylist(p[0].id));
      setIsBooting(false);
    } catch (err: any) {
      setError(err.message || "Fatal error connecting to DB bridge.");
      setStats(fallbackStats);
      setNetwork(fallbackNetwork);
      setPlaylists([]);
      setLogs([]);
      setActivePlaylist(null);
      setIsBooting(false);
    }
  };

  useEffect(() => {
    checkHealthAndLoad();
  }, []);

  useEffect(() => {
    const handleHashChange = () => setCurrentView(getInitialView());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const nextHash = currentView === "dashboard" ? "" : `#${currentView}`;
    if (window.location.hash !== nextHash) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === "downloads") {
      fetchDownloads();
    }
  }, [currentView]);

  useEffect(() => {
    if (isBooting) return;
    const interval = setInterval(() => {
      loadDashboardData().catch((err) => console.warn("Poll failed", err));
    }, 1500);
    return () => clearInterval(interval);
  }, [isBooting, activePlaylist?.id]);

  const filteredTracks = useMemo(() => {
    if (!activePlaylist) return [];
    switch (currentView) {
      case "downloads":
        return activePlaylist.tracks.filter((t) => [TrackStatus.SEARCHING, TrackStatus.FILTERING, TrackStatus.DOWNLOADING, TrackStatus.FINALIZING].includes(t.status));
      case "rejected":
        return activePlaylist.tracks.filter((t) => t.status === TrackStatus.FAILED);
      case "history":
        return activePlaylist.tracks.filter((t) => t.status === TrackStatus.COMPLETED || t.status === TrackStatus.FAILED);
      default:
        return activePlaylist.tracks;
    }
  }, [activePlaylist, currentView]);

  const handleTrackClick = (track: Track) => {
    setSelectedTrack(track);
    setIsModalOpen(true);
  };

  const handlePlaylistSelect = async (playlist: Playlist) => {
    setActivePlaylist(await api.getPlaylist(playlist.id));
  };

  const handleManualStart = async (request: StartRequest) => {
    const workers = await api.startWorkers(request);
    await loadDashboardData();
    setNotice(`Started ${workers.length} worker${workers.length === 1 ? "" : "s"} for playlist ${request.playlist_id}.`);
    setDownloadsTab("pipeline");
    setCurrentView("downloads");
  };

  if (isBooting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg border bg-card text-primary">
          <Database className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Initializing Sync Engine Dashboard</p>
        {health?.targetUrl && <p className="mt-2 font-mono text-xs text-muted-foreground">{health.targetUrl}</p>}
        {error ? (
          <div className="mt-6 max-w-lg rounded-lg border border-destructive/30 bg-destructive/10 p-5">
            <p className="break-words text-sm text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={checkHealthAndLoad}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} network={network || fallbackNetwork} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {stats && <StatsHeader stats={stats} />}

        <div className="flex-1 overflow-y-auto p-4 pb-24 custom-scrollbar md:p-6">
          {error && (
            <div className="mx-auto mb-4 max-w-7xl">
              <ErrorState message={error} onRetry={checkHealthAndLoad} />
            </div>
          )}
          {notice && (
            <div className="mx-auto mb-4 max-w-7xl rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
              <div className="flex items-center justify-between gap-4">
                <span>{notice}</span>
                <Button variant="ghost" size="sm" onClick={() => setNotice(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {currentView === "settings" ? (
            <WorkersView />
          ) : currentView === "playlists" ? (
            <PlaylistsView playlists={playlists} activePlaylist={activePlaylist} onSelect={handlePlaylistSelect} onManualStart={handleManualStart} />
          ) : currentView === "logs" ? (
            <section className="mx-auto max-w-7xl">
              <h2 className="text-2xl font-semibold">Live System Telemetry</h2>
              <div className="mt-4 min-h-[60vh] rounded-lg border bg-card p-4 font-mono text-xs">
                {logs.length === 0 ? (
                  <EmptyState icon={Database} title="No events captured" detail="Jaeger logs have not returned entries for this dashboard session." />
                ) : (
                  <div className="space-y-1">
                    {logs.map((log) => (
                      <div key={log.id} className="grid grid-cols-[8rem_6rem_1fr] gap-3 rounded px-2 py-1 hover:bg-muted/30">
                        <span className="text-muted-foreground">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className="text-primary">{log.trackId ? `#${log.trackId}` : log.level}</span>
                        <span className="truncate">{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ) : currentView === "downloads" ? (
            <section className="mx-auto max-w-7xl space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold capitalize">Downloads</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Manage your completed audio files and active background download pipeline.</p>
                </div>
                
                <div className="flex rounded-lg border bg-card/50 p-1 shrink-0">
                  <Button
                    variant={downloadsTab === "files" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setDownloadsTab("files")}
                    className="h-8 text-xs px-4 font-medium"
                  >
                    Completed Files ({downloads.length})
                  </Button>
                  <Button
                    variant={downloadsTab === "pipeline" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setDownloadsTab("pipeline")}
                    className="h-8 text-xs px-4 font-medium"
                  >
                    Active Pipeline ({filteredTracks.length})
                  </Button>
                </div>
              </div>

              {downloadsTab === "files" ? (
                <DownloadsBrowser 
                  downloads={downloads} 
                  loading={downloadsLoading} 
                  onRefresh={fetchDownloads} 
                />
              ) : (
                filteredTracks.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border bg-card">
                    <Table>
                      <TableBody>
                        {filteredTracks.map((track) => (
                          <TrackRow key={track.id} track={track} onClick={() => handleTrackClick(track)} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <EmptyState icon={Database} title="No active pipeline tracks" detail="There are currently no tracks actively searching or downloading." />
                )
              )}
            </section>
          ) : (
            <section className="mx-auto max-w-7xl">
              <div className="mb-5">
                <h2 className="text-2xl font-semibold capitalize">{currentView}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{activePlaylist?.name || "Library synchronization state"}</p>
              </div>

              {filteredTracks.length > 0 ? (
                <div className="overflow-hidden rounded-lg border bg-card">
                  <Table>
                    <TableBody>
                      {filteredTracks.map((track) => (
                        <TrackRow key={track.id} track={track} onClick={() => handleTrackClick(track)} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState icon={Database} title="No records found" detail="The current filter returned no tracks from the active playlist." />
              )}
            </section>
          )}
        </div>

        {stats && network && <GlobalFooter stats={stats} network={network} />}
      </main>

      {isModalOpen && <SimilarityModal track={selectedTrack} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <AppConfigProvider>
      <Dashboard />
    </AppConfigProvider>
  </ErrorBoundary>
);

export default App;
