import { useEffect, useState } from "react";
import type { LibraryItem, SearchResults } from "@/lib/api-client";
import { data } from "@/lib/data";
import { useFormat, useT } from "@/lib/i18n";
import { collectionPath } from "@/lib/routes";
import { Skeleton } from "@/components/ui/skeleton";
import { Cover } from "@/components/Cover";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StatusCell } from "@/components/collection/StatusCell";
import { useApp } from "@/components/shell/AppContext";
import { cn } from "@/lib/utils";

/** Spotify search with your token: songs (with their state), albums, playlists. */
export function SearchView({ q }: { q: string }) {
  const t = useT();
  const format = useFormat();
  const { navigate, openTrack, download } = useApp();
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const query = q.trim();
    if (!query) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    const timer = window.setTimeout(() => {
      data
        .search(query)
        .then((next) => !cancelled && setResults(next))
        .catch(() => !cancelled && setError(true))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q, attempt]);

  const empty = results && results.tracks.length === 0 && results.albums.length === 0 && results.playlists.length === 0;

  return (
    <div className="px-4 pb-16 pt-6 md:px-7">
      <h1 className="text-base font-medium">{t.search.results(q)}</h1>
      {error ? (
        <ErrorState message={t.search.error} retryLabel={t.common.retry} onRetry={() => setAttempt((n) => n + 1)} />
      ) : loading && !results ? (
        <div className="mt-5 space-y-3" aria-label={t.search.searching}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : empty ? (
        <EmptyState title={t.search.none(q)} detail={t.search.noneHint} />
      ) : results ? (
        <div className={cn("transition-opacity", loading && "opacity-60")}>
          {results.tracks.length > 0 ? (
            <section className="mt-5">
              <h2 className="mb-1 text-2xs uppercase tracking-[0.04em] text-muted-foreground">{t.search.songs}</h2>
              <ul>
                {results.tracks.map((track) => {
                  const open = () => openTrack(track.spotifyId, { title: track.title, artist: track.artist, album: track.album, imageUrl: track.imageUrl });
                  return (
                    <li
                      key={track.spotifyId}
                      className="group grid h-11 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 hover:bg-hover sm:grid-cols-[28px_minmax(0,1.4fr)_minmax(0,1fr)_44px_148px]"
                    >
                      <Cover src={track.imageUrl} name={track.album || track.title} className="h-7 w-7" />
                      <button type="button" onClick={open} className="flex min-w-0 flex-col text-left">
                        <span className="truncate">{track.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{track.artist}</span>
                      </button>
                      <span className="hidden truncate text-xs text-muted-foreground sm:block">{track.album}</span>
                      <span className="tabular hidden text-right text-xs text-muted-foreground sm:block">{format.trackDuration(track.durationMs)}</span>
                      <StatusCell
                        status={track}
                        onOpen={open}
                        onDownload={() => void download({ kind: "track", id: track.spotifyId })}
                        fileUrl={track.state === "owned" ? data.trackFileUrl(track.spotifyId) : undefined}
                        fileLabel={t.status.downloadFileOf(track.title)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
          <CoverGrid title={t.search.albums} items={results.albums} onOpen={(item) => navigate(collectionPath(item.kind, item.id))} />
          <CoverGrid title={t.search.playlists} items={results.playlists} onOpen={(item) => navigate(collectionPath(item.kind, item.id))} />
        </div>
      ) : null}
    </div>
  );
}

function CoverGrid({ title, items, onOpen }: { title: string; items: LibraryItem[]; onOpen: (item: LibraryItem) => void }) {
  const t = useT();
  if (items.length === 0) return null;
  return (
    <section className="mt-7">
      <h2 className="mb-2 text-2xs uppercase tracking-[0.04em] text-muted-foreground">{title}</h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-x-4 gap-y-5">
        {items.map((item) => (
          <li key={`${item.kind}:${item.id}`}>
            <button type="button" onClick={() => onOpen(item)} className="group flex w-full flex-col gap-2 text-left">
              <Cover src={item.imageUrl} name={item.name} className="aspect-square h-auto w-full rounded group-hover:opacity-90 [&_span]:text-[34px]" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{item.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {item.owner} · {t.common.songs(item.trackCount)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
