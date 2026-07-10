import { useMemo, useState } from "react";
import { CircleAlert, Link2, Loader2, Play, RotateCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LastRun } from "@/lib/api-client";
import type { StartRequest } from "@/types";

interface PlaylistsViewProps {
  onLaunch: (request: StartRequest) => Promise<void>;
  lastRun?: LastRun | null;
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

const numericValue = (value: string) => (value.trim() ? Number.parseInt(value, 10) : undefined);

export function PlaylistsView({ onLaunch, lastRun }: PlaylistsViewProps) {
  const [rawInput, setRawInput] = useState("");
  const [workerCount, setWorkerCount] = useState("1");
  const [chunkSize, setChunkSize] = useState("15");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playlistId = useMemo(() => normalizeSpotifyPlaylistInput(rawInput), [rawInput]);
  const idValid = isLikelySpotifyPlaylistId(playlistId);
  const touched = rawInput.trim().length > 0;

  const rangeValid = () => {
    const start = numericValue(rangeStart);
    const end = numericValue(rangeEnd);
    return start === undefined || end === undefined || start < end;
  };

  const resume = async () => {
    if (!lastRun) return;
    setLaunching(true);
    setError(null);
    try {
      await onLaunch({
        playlist_id: lastRun.playlistId,
        worker_count: lastRun.workerCount,
        chunk_size: lastRun.chunkSize,
        username_prefix: "worker",
        port_base: lastRun.portBase,
        run_id_prefix: "web-trigger",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume last run");
    } finally {
      setLaunching(false);
    }
  };

  const launch = async () => {
    const workers = Number.parseInt(workerCount, 10);
    const chunk = Number.parseInt(chunkSize, 10);
    if (!idValid || workers < 1 || workers > 32 || chunk < 1 || chunk > 1000 || !rangeValid()) return;

    setLaunching(true);
    setError(null);
    try {
      await onLaunch({
        playlist_id: playlistId,
        worker_count: workers,
        chunk_size: chunk,
        playlist_range_start: numericValue(rangeStart),
        playlist_range_end: numericValue(rangeEnd),
        username_prefix: "worker",
        port_base: 41000,
        run_id_prefix: "web-trigger",
      });
      setRawInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch playlist download");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {lastRun ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <RotateCw className="h-4 w-4 text-primary" aria-hidden />
              Resume last run
            </p>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground" title={lastRun.playlistId}>
              {lastRun.playlistId} · {lastRun.workerCount} worker{lastRun.workerCount === 1 ? "" : "s"} · chunk {lastRun.chunkSize}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Already-downloaded tracks are skipped, so this safely continues where it stopped.</p>
          </div>
          <Button variant="outline" className="shrink-0" disabled={launching} onClick={() => void resume()}>
            {launching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RotateCw className="h-4 w-4" aria-hidden />}
            Resume
          </Button>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Link2 className="h-4 w-4 text-primary" aria-hidden />
          Start a Spotify sync
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a Spotify playlist link or ID. Workers fetch its tracks, search Soulseek, and download the best match.
        </p>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="playlist-input" className="text-sm font-medium text-foreground">
              Playlist URL or ID
            </label>
            <Input
              id="playlist-input"
              autoFocus
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && idValid && !launching) void launch();
              }}
              placeholder="https://open.spotify.com/playlist/…"
              className="h-11"
            />
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Resolved ID:</span>
              <span className={cn("truncate font-mono", idValid ? "text-primary" : "text-muted-foreground")}>
                {playlistId || "waiting for input"}
              </span>
            </div>
            {touched && !idValid ? (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Enter a Spotify playlist URL or a raw playlist ID.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Workers
              <Input type="number" min={1} max={32} value={workerCount} onChange={(e) => setWorkerCount(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Chunk
              <Input type="number" min={1} max={1000} value={chunkSize} onChange={(e) => setChunkSize(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Range start
              <Input type="number" min={0} value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} placeholder="0" />
            </label>
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Range end
              <Input type="number" min={0} value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} placeholder="all" />
            </label>
          </div>

          {!rangeValid() ? (
            <p className="text-xs text-destructive">Range start must be less than range end.</p>
          ) : null}
          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          ) : null}

          <Button className="w-full" disabled={!idValid || launching || !rangeValid()} onClick={() => void launch()}>
            {launching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            {launching ? "Starting…" : "Start sync"}
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Worker account, ports, and pacing defaults come from the server. Tune them in{" "}
          <span className="font-medium text-foreground">Diagnostics</span>, and watch progress live under{" "}
          <span className="font-medium text-foreground">Library</span> once a run starts.
        </p>
      </div>
    </div>
  );
}
