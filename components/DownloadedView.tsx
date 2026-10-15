import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ChevronLeft, Search } from "lucide-react";
import { toast } from "sonner";
import type { DownloadedCollection, DownloadedPage, DownloadedSong, DownloadedSort } from "@/lib/api-client";
import { data } from "@/lib/data";
import { useFormat, useT } from "@/lib/i18n";
import { downloadedCollectionPath, type DownloadedTab } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/Avatar";
import { Cover } from "@/components/Cover";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Spinner } from "@/components/Spinner";
import { useApp } from "@/components/shell/AppContext";
import { cn } from "@/lib/utils";

const SORTS: DownloadedSort[] = ["recent", "artist", "album", "title"];
const UNTAGGED = "untagged";
/** Title, album, requested by · arrived, length. The download link sits outside, in its own column. */
const ROW = "grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[28px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_44px]";

/**
 * "Descargadas": everything already on disk, for everyone, as songs (search, sort, download each)
 * or grouped by the playlist/album they came from. No Spotify access to those playlists needed.
 */
export function DownloadedView({ tab }: { tab: DownloadedTab }) {
  const t = useT();
  const format = useFormat();
  const { navigate } = useApp();
  const [totals, setTotals] = useState<{ songs: number; bytes: number } | null>(null);

  return (
    <div className="px-4 pb-24 pt-6 md:px-7">
      <h1 className="text-xl font-semibold tracking-[-0.01em]">{t.downloaded.title}</h1>
      <p className="mt-1 h-4 text-xs text-muted-foreground">{totals ? t.downloaded.summary(totals.songs, format.size(totals.bytes)) : null}</p>

      <div role="tablist" aria-label={t.downloaded.title} className="mt-4 flex gap-0.5 border-b border-line pb-2">
        {(["songs", "collections"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => navigate(key === "songs" ? "/downloaded" : "/downloaded/collections", { replace: true })}
            className={cn("rounded-sm px-2 py-1 text-xs text-muted-foreground hover:text-foreground", tab === key && "bg-raised text-foreground")}
          >
            {key === "songs" ? t.downloaded.songsTab : t.downloaded.collectionsTab}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="pt-4">
        {tab === "songs" ? <SongBrowser onTotals={setTotals} /> : <CollectionGrid />}
      </div>
    </div>
  );
}

/** One playlist/album's downloaded songs, with its folder's .zip. */
export function DownloadedCollectionView({ id }: { id: string }) {
  const t = useT();
  const { navigate } = useApp();
  const [page, setPage] = useState<DownloadedPage | null>(null);
  const [zipping, setZipping] = useState(false);
  const collection = page?.collection;
  const name = id === UNTAGGED ? t.downloaded.untagged : collection?.name ?? "";
  const covers = uniqueCovers(page?.songs ?? []);

  const downloadZip = async () => {
    setZipping(true);
    try {
      const filled = await data.fillDownloadedFolder(id);
      const link = document.createElement("a");
      link.href = data.folderZipUrl(filled.folder);
      link.download = "";
      link.click();
    } catch (err) {
      console.warn("Could not prepare the .zip", err);
      toast.error(t.common.somethingFailed);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 md:px-7">
        <button
          type="button"
          onClick={() => navigate("/downloaded/collections")}
          className="-ml-1 inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          {t.downloaded.back}
        </button>
      </div>
      <header className="flex items-end gap-4 px-4 pb-4 pt-3 md:gap-5 md:px-7">
        <Mosaic covers={covers} name={name || "?"} className="h-20 w-20 md:h-[104px] md:w-[104px]" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-2xs text-muted-foreground">{t.downloaded.title}</span>
          <h1 className="text-balance break-words text-xl font-semibold tracking-[-0.01em]">{name || <Skeleton className="h-6 w-48" />}</h1>
          <p className="text-xs text-muted-foreground">{page ? t.downloaded.collectionSongs(page.total) : null}</p>
          {collection?.folder ? (
            <div className="mt-1.5">
              <Button variant="outline" onClick={() => void downloadZip()} disabled={zipping} title={t.collection.zipHint}>
                {zipping ? <Spinner /> : null}
                {t.collection.zip}
              </Button>
            </div>
          ) : null}
        </div>
      </header>
      <div className="px-4 md:px-7">
        <SongBrowser collection={id} onPage={setPage} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------------- songs

function useDownloadedSongs(q: string, sort: DownloadedSort, collection?: string) {
  const [songs, setSongs] = useState<DownloadedSong[]>([]);
  const [page, setPage] = useState<DownloadedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const request = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    setLoading(true);
    setError(false);
    const timer = window.setTimeout(() => {
      data
        .getDownloadedSongs({ q: q.trim() || undefined, sort, collection })
        .then((next) => {
          if (id !== request.current) return;
          setSongs(next.songs);
          setPage(next);
        })
        .catch(() => id === request.current && setError(true))
        .finally(() => id === request.current && setLoading(false));
    }, q ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [q, sort, collection, attempt]);

  const loadMore = useCallback(() => {
    if (loading || page?.nextCursor == null) return;
    const id = request.current;
    setLoading(true);
    data
      .getDownloadedSongs({ q: q.trim() || undefined, sort, collection, cursor: page.nextCursor })
      .then((next) => {
        if (id !== request.current) return;
        setSongs((current) => [...current, ...next.songs]);
        setPage(next);
      })
      .catch(() => id === request.current && setError(true))
      .finally(() => id === request.current && setLoading(false));
  }, [loading, page, q, sort, collection]);

  return { songs, page, loading, error, loadMore, retry: () => setAttempt((n) => n + 1) };
}

function SongBrowser({
  collection,
  onTotals,
  onPage,
}: {
  collection?: string;
  onTotals?: (totals: { songs: number; bytes: number }) => void;
  onPage?: (page: DownloadedPage) => void;
}) {
  const t = useT();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<DownloadedSort>("recent");
  const { songs, page, loading, error, loadMore, retry } = useDownloadedSongs(q, sort, collection);

  useEffect(() => {
    if (!page) return;
    onTotals?.({ songs: page.totalAll, bytes: page.totalBytes });
    onPage?.(page);
  }, [page, onTotals, onPage]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <label className="relative block w-full max-w-[18rem]">
          <span className="sr-only">{t.downloaded.filter}</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={t.downloaded.filter}
            className="h-[30px] w-full rounded-md border border-line bg-transparent pl-[29px] pr-2.5 text-[12.5px] outline-none placeholder:text-faint focus:border-muted-foreground"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {t.downloaded.sortLabel}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as DownloadedSort)}
            className="h-[30px] rounded-md border border-line bg-background px-1.5 text-[12.5px] text-foreground outline-none focus:border-muted-foreground"
          >
            {SORTS.map((key) => (
              <option key={key} value={key}>
                {t.downloaded.sorts[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && songs.length === 0 ? (
        <ErrorState message={t.downloaded.loadError} retryLabel={t.common.retry} onRetry={retry} />
      ) : !page ? (
        <div className="space-y-3" aria-label={t.downloaded.loading}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : songs.length === 0 ? (
        q.trim() ? (
          <EmptyState title={t.downloaded.noMatch(q.trim())} detail={t.downloaded.noMatchHint} />
        ) : (
          <EmptyState title={t.downloaded.empty} detail={t.downloaded.emptyHint} />
        )
      ) : (
        <SongList songs={songs} hasMore={page.nextCursor != null} loading={loading} onLoadMore={loadMore} dimmed={loading && songs.length > 0 && !page.nextCursor} />
      )}
    </div>
  );
}

function SongList({
  songs,
  hasMore,
  loading,
  onLoadMore,
  dimmed,
}: {
  songs: DownloadedSong[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  dimmed: boolean;
}) {
  const t = useT();
  const { scrollRef } = useApp();
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !hasMore) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onLoadMore(), {
      root: scrollRef.current,
      rootMargin: "600px",
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, scrollRef]);

  return (
    <div className={cn("transition-opacity", dimmed && "opacity-60")}>
      <div className="hidden h-8 items-center gap-3 border-b border-line px-2 text-2xs text-muted-foreground sm:flex">
        <div className={cn(ROW, "flex-1")}>
          <span aria-hidden />
          <span>{t.downloaded.columns.title}</span>
          <span>{t.downloaded.columns.album}</span>
          <span>{t.downloaded.columns.from}</span>
          <span className="text-right">{t.collection.columns.duration}</span>
        </div>
        <span className="w-7" aria-hidden />
      </div>
      <ul>
        {songs.map((song) => (
          <SongRow key={song.spotifyId} song={song} />
        ))}
      </ul>
      <div ref={sentinel} className="flex h-10 items-center justify-center">
        {loading && hasMore ? <Spinner className="text-muted-foreground" /> : null}
      </div>
    </div>
  );
}

function SongRow({ song }: { song: DownloadedSong }) {
  const t = useT();
  const format = useFormat();
  const { openTrack } = useApp();
  const open = () => openTrack(song.spotifyId, { title: song.title, artist: song.artist, album: song.album, imageUrl: song.imageUrl });
  const meta = [song.format?.toUpperCase(), song.size ? format.size(song.size) : null].filter(Boolean).join(" · ");

  return (
    <li className="group flex items-center gap-3 rounded-md px-2 hover:bg-hover">
      <button type="button" onClick={open} className={cn(ROW, "h-11 min-w-0 flex-1 text-left outline-none focus-visible:underline")}>
        <Cover src={song.imageUrl} name={song.album || song.title} className="h-7 w-7" />
        <span className={cn("flex min-w-0 flex-col", !song.available && "opacity-60")}>
          <span className="truncate">{song.title}</span>
          <span className="truncate text-xs text-muted-foreground">{song.artist}</span>
        </span>
        <span className="hidden min-w-0 flex-col sm:flex">
          <span className="truncate text-xs text-muted-foreground">{song.album}</span>
          {meta ? <span className="tabular truncate text-2xs text-muted-foreground">{meta}</span> : null}
        </span>
        <span className="hidden min-w-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          {song.requestedBy ? <Avatar name={song.requestedBy.name} src={song.requestedBy.avatarUrl} className="h-4 w-4 shrink-0 text-[9px]" /> : null}
          <span className="truncate">
            {[song.requestedBy?.name, song.addedAt ? format.relative(song.addedAt) : null].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="tabular hidden text-right text-xs text-muted-foreground sm:block">{song.durationMs ? format.trackDuration(song.durationMs) : ""}</span>
      </button>
      {song.available ? (
        <a
          href={data.trackFileUrl(song.spotifyId)}
          download
          aria-label={t.status.downloadFileOf(song.title)}
          title={t.status.downloadFile}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-raised hover:text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5"
        >
          <ArrowDownToLine aria-hidden />
        </a>
      ) : (
        <span className="w-7 shrink-0 text-center text-2xs text-muted-foreground" title={t.downloaded.unavailable}>
          —
        </span>
      )}
    </li>
  );
}

// ----------------------------------------------------------------------------------- collections

function CollectionGrid() {
  const t = useT();
  const format = useFormat();
  const { navigate } = useApp();
  const [items, setItems] = useState<DownloadedCollection[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    data
      .getDownloadedCollections()
      .then((next) => !cancelled && setItems(next))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (error) return <ErrorState message={t.downloaded.loadError} retryLabel={t.common.retry} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!items)
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    );
  if (items.length === 0) return <EmptyState title={t.downloaded.empty} detail={t.downloaded.emptyHint} />;

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-5">
      {items.map((item) => {
        const name = item.id === UNTAGGED ? t.downloaded.untagged : item.name;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => navigate(downloadedCollectionPath(item.id))}
              className="group flex w-full flex-col gap-2 text-left"
            >
              <Mosaic covers={item.covers} name={name} className="aspect-square h-auto w-full group-hover:opacity-90" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {[t.downloaded.collectionSongs(item.songs), item.updatedAt ? t.downloaded.updated(format.relative(item.updatedAt)) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function uniqueCovers(songs: DownloadedSong[]): string[] {
  const covers: string[] = [];
  for (const song of songs) {
    if (song.imageUrl && !covers.includes(song.imageUrl)) covers.push(song.imageUrl);
    if (covers.length === 4) break;
  }
  return covers;
}

/** Spotify-style cover: four album covers in a grid, or one, or a lettered placeholder. */
function Mosaic({ covers, name, className }: { covers: string[]; name: string; className?: string }) {
  if (covers.length >= 4) {
    return (
      <span aria-hidden className={cn("grid shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded", className)}>
        {covers.slice(0, 4).map((src) => (
          <img key={src} src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
        ))}
      </span>
    );
  }
  return <Cover src={covers[0]} name={name} className={cn("rounded [&_span]:text-[34px]", className)} />;
}
