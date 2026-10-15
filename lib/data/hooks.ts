import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BadgeCounts,
  CollectionCounts,
  CollectionKind,
  CollectionMeta,
  CollectionTrack,
  JudgingDetail,
  Library,
  LibraryItem,
  Queue,
  TrackStatus,
} from "@/lib/api-client";
import type { JudgementFeedItem, JudgementSummary } from "@/types";
import { data } from "./index";
import { useAddedCollections } from "./added";

export const POLL_MS = 1500;
const HIDDEN_POLL_MS = 10_000;
const LIBRARY_POLL_MS = 60_000;
const PAGE = 500;

/**
 * Run `tick` every `ms` while `enabled`; every 10 s while the tab is hidden, and right away when
 * it comes back. A slow tick never overlaps the next one.
 */
export function usePolling(tick: () => unknown, ms: number, enabled = true) {
  const ref = useRef(tick);
  ref.current = tick;
  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    let stopped = false;
    let running = false;
    const schedule = () => {
      const delay = document.visibilityState === "hidden" ? Math.max(ms, HIDDEN_POLL_MS) : ms;
      timer = window.setTimeout(run, delay);
    };
    const run = async () => {
      if (running) return;
      running = true;
      window.clearTimeout(timer);
      try {
        await ref.current();
      } catch {
        /* the next tick retries */
      } finally {
        running = false;
        if (!stopped) schedule();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ms, enabled]);
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

// ------------------------------------------------------------------------------- library

export interface LibraryState {
  items: LibraryItem[];
  /** In this browser's added list but not in the Spotify library. */
  addedIds: Set<string>;
  stale: boolean;
  loading: boolean;
  error: string | null;
  badges: Record<string, BadgeCounts>;
  reload: () => void;
  refreshBadges: () => void;
}

export const itemKey = (item: { kind: string; id: string }) => `${item.kind}:${item.id}`;

export function useLibrary(): LibraryState {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [badges, setBadges] = useState<Record<string, BadgeCounts>>({});
  const added = useAddedCollections();

  const load = useCallback(async (refresh = false) => {
    try {
      setLibrary(await data.getLibrary({ refresh }));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  usePolling(() => load(), LIBRARY_POLL_MS);

  const { items, addedIds } = useMemo(() => {
    const own = library?.items ?? [];
    const ownKeys = new Set(own.map(itemKey));
    const extra = added.filter((item) => !ownKeys.has(itemKey(item)));
    // Liked Songs first, then what was added from a link, then the rest of the library.
    const [liked, ...rest] = own[0]?.kind === "liked" ? own : [undefined, ...own];
    return {
      items: [...(liked ? [liked] : []), ...extra, ...rest].filter((item): item is LibraryItem => !!item),
      addedIds: new Set(extra.map(itemKey)),
    };
  }, [library, added]);

  const keysRef = useRef<{ kind: string; id: string }[]>([]);
  keysRef.current = items.map(({ kind, id }) => ({ kind, id }));
  const refreshBadges = useCallback(async () => {
    if (keysRef.current.length === 0) return;
    setBadges(await data.getCollectionsStatus(keysRef.current));
  }, []);
  const itemsSignature = items.map(itemKey).join(",");
  useEffect(() => {
    void refreshBadges().catch(() => {});
  }, [itemsSignature, refreshBadges]);
  const anyInFlight = Object.values(badges).some((badge) => badge.inFlight > 0);
  usePolling(refreshBadges, anyInFlight ? 4000 : 30_000, items.length > 0);

  return {
    items,
    addedIds,
    stale: library?.stale ?? false,
    loading,
    error,
    badges,
    reload: () => void load(true),
    refreshBadges: () => void refreshBadges().catch(() => {}),
  };
}

// ------------------------------------------------------------------------------- collection

export interface CollectionState {
  meta: CollectionMeta | null;
  folder: { name: string; exists: boolean } | null;
  counts: CollectionCounts | null;
  tracks: CollectionTrack[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Optimistic update after a request; the next poll confirms it. */
  patch: (ids: string[], status: TrackStatus) => void;
  poll: () => void;
}

export function useCollection(kind: CollectionKind, id: string): CollectionState {
  const [meta, setMeta] = useState<CollectionMeta | null>(null);
  const [folder, setFolder] = useState<{ name: string; exists: boolean } | null>(null);
  const [counts, setCounts] = useState<CollectionCounts | null>(null);
  const [tracks, setTracks] = useState<CollectionTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = useRef<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const mine = ++generation.current;
    setLoading(true);
    setError(null);
    setTracks([]);
    setMeta(null);
    setCounts(null);
    token.current = null;
    try {
      let cursor: number | undefined = 0;
      let all: CollectionTrack[] = [];
      while (cursor != null) {
        const page = await data.getCollection(kind, id, { limit: PAGE, cursor });
        if (mine !== generation.current) return;
        all = [...all, ...(page.tracks ?? [])];
        setMeta(page.collection);
        setCounts(page.counts);
        setTracks(all);
        if (page.folder !== undefined) setFolder(page.folder ? { name: page.folder, exists: !!page.folderExists } : null);
        setLoading(false);
        token.current = page.stateToken;
        cursor = page.nextCursor ?? undefined;
      }
    } catch (err) {
      if (mine === generation.current) {
        setError(errorMessage(err));
        setLoading(false);
      }
    }
  }, [kind, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const poll = useCallback(async () => {
    const since = token.current;
    if (!since) return;
    const mine = generation.current;
    const page = await data.getCollection(kind, id, { since });
    if (mine !== generation.current) return;
    if (page.tracks) {
      // The snapshot expired and the server sent a full page instead; start over.
      void load();
      return;
    }
    token.current = page.stateToken;
    setCounts(page.counts);
    const changes = page.changes ?? [];
    if (changes.length === 0) return;
    const byId = new Map(changes.map((change) => [change.spotifyId, change]));
    setTracks((current) =>
      current.map((track) => {
        const change = byId.get(track.spotifyId);
        if (!change) return track;
        const { spotifyId: _, ...status } = change;
        return { ...track, progress: undefined, judging: undefined, requestedBy: undefined, ...status };
      }),
    );
  }, [kind, id, load]);

  usePolling(poll, POLL_MS, !loading && !error);

  const patch = useCallback((ids: string[], status: TrackStatus) => {
    const wanted = new Set(ids);
    setTracks((current) => current.map((track) => (wanted.has(track.spotifyId) ? { ...track, ...status } : track)));
  }, []);

  const reload = useCallback(() => void load(), [load]);
  const pollNow = useCallback(() => void poll().catch(() => {}), [poll]);
  return { meta, folder, counts, tracks, loading, error, reload, patch, poll: pollNow };
}

// ------------------------------------------------------------------------------- queue

const EMPTY_QUEUE: Queue = { downloading: [], comparing: [], searching: [], queued: [] };

export interface QueueState {
  queue: Queue;
  paused: boolean;
  setPaused: (paused: boolean) => Promise<void>;
  refresh: () => void;
}

export function useQueue(): QueueState {
  const [queue, setQueue] = useState<Queue>(EMPTY_QUEUE);
  const [paused, setPausedState] = useState(false);

  const loadQueue = useCallback(async () => setQueue(await data.getQueue()), []);
  const loadPipeline = useCallback(async () => setPausedState((await data.getPipeline()).downloadsPaused), []);

  useEffect(() => {
    void loadQueue().catch(() => {});
    void loadPipeline().catch(() => {});
  }, [loadQueue, loadPipeline]);
  usePolling(loadQueue, POLL_MS);
  usePolling(loadPipeline, POLL_MS * 4);

  const setPaused = useCallback(async (next: boolean) => {
    const state = await data.setDownloadsPaused(next);
    setPausedState(state.downloadsPaused);
  }, []);

  return { queue, paused, setPaused, refresh: () => void loadQueue().catch(() => {}) };
}

// ------------------------------------------------------------------------------- judging

const IN_FLIGHT = new Set(["queued", "searching", "comparing", "downloading"]);

export function useJudging(spotifyId: string | null) {
  const [detail, setDetail] = useState<JudgingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!spotifyId) return;
    const next = await data.getJudging(spotifyId);
    setDetail(next);
    setError(null);
  }, [spotifyId]);

  useEffect(() => {
    setDetail(null);
    if (!spotifyId) return;
    setLoading(true);
    load()
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [spotifyId, load]);

  // Live while the song is still being worked on, so verdicts show up as they land.
  const live = !!detail && IN_FLIGHT.has(detail.status.state);
  usePolling(load, POLL_MS, !!spotifyId && live);

  return { detail, loading, error, reload: () => void load().catch((err) => setError(errorMessage(err))) };
}

// ------------------------------------------------------------------------------- verdicts

const VERDICTS_PAGE = 60;
const emptySummary: JudgementSummary = { total: 0, accepted: 0, errors: 0, avgLatencyMs: 0, p95LatencyMs: 0, labels: [], judges: [] };

function mergeFeed(existing: JudgementFeedItem[], incoming: JudgementFeedItem[]) {
  const byId = new Map<number, JudgementFeedItem>();
  for (const item of existing) byId.set(item.id, item);
  for (const item of incoming) byId.set(item.id, item);
  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
}

export function useVerdicts(filters: { label: string | null; judge: string | null }) {
  const [summary, setSummary] = useState<JudgementSummary>(emptySummary);
  const [items, setItems] = useState<JudgementFeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    (cursor?: number) =>
      data.getJudgements({ limit: VERDICTS_PAGE, cursor, label: filters.label ?? undefined, judge: filters.judge ?? undefined }),
    [filters.label, filters.judge],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPage()
      .then((page) => {
        if (cancelled) return;
        setSummary(page.summary);
        setItems(page.items);
        setNextCursor(page.nextCursor);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  usePolling(async () => {
    const page = await fetchPage();
    setSummary(page.summary);
    setItems((current) => mergeFeed(current, page.items));
  }, 5000);

  const loadMore = useCallback(async () => {
    if (nextCursor == null) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(nextCursor);
      setItems((current) => mergeFeed(current, page.items));
      setNextCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, nextCursor]);

  return { summary, items, loading, loadingMore, error, canLoadMore: nextCursor != null, loadMore };
}
