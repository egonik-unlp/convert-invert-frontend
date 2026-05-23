import React, { useMemo, useState } from "react";
import { AlertCircle, Check, Link2, ListMusic, Loader2, Music2, Play, Settings2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { Playlist, StartRequest } from "@/types";
import { cn } from "@/lib/utils";

interface PlaylistsViewProps {
  playlists: Playlist[];
  activePlaylist: Playlist | null;
  onSelect: (playlist: Playlist) => void;
  onManualStart: (request: StartRequest) => Promise<void>;
}

export function normalizeSpotifyPlaylistInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const uriMatch = trimmed.match(/^spotify:playlist:([A-Za-z0-9]+)$/);
  if (uriMatch) return uriMatch[1];

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const playlistIndex = parts.indexOf("playlist");
    if (playlistIndex >= 0 && parts[playlistIndex + 1]) {
      return parts[playlistIndex + 1];
    }
  } catch {
    // Not a URL; treat it as a raw playlist ID below.
  }

  return trimmed.replace(/[?#].*$/, "");
}

export function isLikelySpotifyPlaylistId(id: string): boolean {
  return /^[A-Za-z0-9]{10,}$/.test(id);
}

const PlaylistsView: React.FC<PlaylistsViewProps> = ({ playlists, activePlaylist, onSelect, onManualStart }) => {
  const [manualId, setManualId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [workerCount, setWorkerCount] = useState("4");
  const [chunkSize, setChunkSize] = useState("15");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const normalizedPlaylistId = useMemo(() => normalizeSpotifyPlaylistInput(manualId), [manualId]);
  const playlistIdValid = isLikelySpotifyPlaylistId(normalizedPlaylistId);
  const visiblePlaylists = playlists.map((playlist) => ({
    ...playlist,
    coverArt: playlist.coverArt === "/favicon.svg" ? "" : playlist.coverArt,
  }));

  const openConfirm = () => {
    setLaunchError(null);
    if (playlistIdValid) setDialogOpen(true);
  };

  const numericValue = (value: string) => (value.trim() ? Number.parseInt(value, 10) : undefined);

  const rangeIsValid = () => {
    const start = numericValue(rangeStart);
    const end = numericValue(rangeEnd);
    return start === undefined || end === undefined || start < end;
  };

  const submitLaunch = async () => {
    const workers = Number.parseInt(workerCount, 10);
    const chunk = Number.parseInt(chunkSize, 10);
    if (!playlistIdValid || workers < 1 || workers > 32 || chunk < 1 || chunk > 1000 || !rangeIsValid()) return;

    setLaunching(true);
    setLaunchError(null);
    try {
      await onManualStart({
        playlist_id: normalizedPlaylistId,
        worker_count: workers,
        chunk_size: chunk,
        playlist_range_start: numericValue(rangeStart),
        playlist_range_end: numericValue(rangeEnd),
        username_prefix: "worker",
        port_base: 41000,
        run_id_prefix: "web-trigger",
      });
      setDialogOpen(false);
    } catch (err: any) {
      setLaunchError(err.message || "Failed to launch playlist download");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-2 border-b pb-5">
        <h2 className="text-2xl font-semibold">Playlists</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Select a source playlist or start a worker run from an explicit playlist ID.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
                Start Spotify Playlist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block space-y-2 text-sm font-medium">
                Spotify playlist URL or ID
                <Input
                  autoFocus
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Spotify playlist URL or ID"
                  value={manualId}
                  onChange={(event) => setManualId(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") openConfirm();
                  }}
                  className="h-12 text-base"
                  placeholder="https://open.spotify.com/playlist/..."
                />
              </label>
              <div className="rounded-md border bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">Normalized playlist ID</p>
                <p className={cn("mt-1 truncate font-mono text-xs", playlistIdValid ? "text-primary" : "text-muted-foreground")}>
                  {normalizedPlaylistId || "Waiting for input"}
                </p>
              </div>
              {manualId.trim() && !playlistIdValid && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                  Enter a Spotify playlist URL or a raw playlist ID.
                </div>
              )}
              <Button className="h-11 w-full disabled:cursor-not-allowed" disabled={!playlistIdValid} onClick={openConfirm}>
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                Configure Download
              </Button>
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-secondary/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
              <Sparkles className="h-4 w-4 text-secondary" aria-hidden="true" />
              Partitioned runs
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Worker defaults come from the API. Use Diagnostics for explicit concurrency, range, and port settings.
            </p>
          </div>
        </div>

        {playlists.length === 0 ? (
          <EmptyState icon={ListMusic} title="No playlists found" detail="The API returned no playlist summaries. You can still start a run manually." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visiblePlaylists.map((playlist) => {
              const selected = activePlaylist?.id === playlist.id;
              return (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => onSelect(playlist)}
                  className={cn(
                    "group overflow-hidden rounded-lg border bg-card text-left transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected && "border-primary",
                  )}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {playlist.coverArt ? (
                      <img
                        src={playlist.coverArt}
                        alt=""
                        className="h-full w-full object-cover opacity-80 transition-transform group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 bg-secondary/10">
                        <Music2 className="h-12 w-12 text-secondary" aria-hidden="true" />
                        <span className="text-xs font-medium text-muted-foreground">Library snapshot</span>
                      </div>
                    )}
                    {selected && (
                      <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="truncate text-sm font-semibold">{playlist.name}</h3>
                      <Badge variant="secondary">{playlist.trackCount}</Badge>
                    </div>
                    <p className="truncate font-mono text-xs text-muted-foreground">{playlist.id}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{playlist.quality}</span>
                      <span aria-hidden="true">/</span>
                      <span>{playlist.totalSize}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" aria-hidden="true" />
              Launch playlist download
            </DialogTitle>
            <DialogDescription>
              Review worker settings before starting the download pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-background/50 p-4">
              <p className="text-xs text-muted-foreground">Spotify playlist ID</p>
              <p className="mt-1 break-all font-mono text-sm text-primary">{normalizedPlaylistId}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2 text-xs text-muted-foreground">
                Worker Count
                <Input type="number" min={1} max={32} value={workerCount} onChange={(event) => setWorkerCount(event.target.value)} />
              </label>
              <label className="space-y-2 text-xs text-muted-foreground">
                Chunk Size
                <Input type="number" min={1} max={1000} value={chunkSize} onChange={(event) => setChunkSize(event.target.value)} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2 text-xs text-muted-foreground">
                Range Start
                <Input type="number" min={0} value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} placeholder="Optional" />
              </label>
              <label className="space-y-2 text-xs text-muted-foreground">
                Range End
                <Input type="number" min={0} value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} placeholder="Optional" />
              </label>
            </div>

            {!rangeIsValid() && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-muted-foreground">
                Range start must be less than range end.
              </div>
            )}

            {launchError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-muted-foreground">
                {launchError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={launching}>
              Cancel
            </Button>
            <Button onClick={submitLaunch} disabled={launching || !playlistIdValid || !rangeIsValid()}>
              {launching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              Start Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PlaylistsView;
