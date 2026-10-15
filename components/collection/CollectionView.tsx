import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { ArrowDown } from "lucide-react";
import type { CollectionKind, CollectionTrack } from "@/lib/api-client";
import { data } from "@/lib/data";
import { rememberLastCollection } from "@/lib/data/added";
import { useCollection } from "@/lib/data/hooks";
import { useFormat, useT } from "@/lib/i18n";
import { collectionPath } from "@/lib/routes";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Cover } from "@/components/Cover";
import { ErrorState } from "@/components/ErrorState";
import { Spinner } from "@/components/Spinner";
import { useApp } from "@/components/shell/AppContext";
import { CollectionMenu } from "./CollectionMenu";
import { TrackList } from "./TrackList";

type Tab = "all" | "owned" | "missing" | "failed" | "uncertain";

const inTab = (tab: Tab, track: CollectionTrack) => {
  switch (tab) {
    case "all":
      return true;
    case "owned":
      return track.state === "owned";
    case "missing":
      return track.state !== "owned" && track.state !== "failed";
    case "failed":
      return track.state === "failed";
    case "uncertain":
      return track.state === "owned" && !!track.judging?.uncertain;
  }
};

const RETRIES_KEY = "ci-retries";

export function CollectionView({ kind, id }: { kind: CollectionKind; id: string }) {
  const t = useT();
  const format = useFormat();
  const { me } = useAuth();
  const { download, openTrack } = useApp();
  const collection = useCollection(kind, id);
  const { meta, counts, tracks, folder } = collection;
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [retries, setRetries] = useState(() => {
    try {
      return localStorage.getItem(`${RETRIES_KEY}:${kind}:${id}`) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setTab("all");
    setSelected(new Set());
    rememberLastCollection(collectionPath(kind, id));
  }, [kind, id]);

  const changeRetries = (value: boolean) => {
    setRetries(value);
    try {
      localStorage.setItem(`${RETRIES_KEY}:${kind}:${id}`, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const tabCounts = useMemo(() => {
    const result: Record<Tab, number> = { all: tracks.length, owned: 0, missing: 0, failed: 0, uncertain: 0 };
    for (const track of tracks) {
      for (const key of ["owned", "missing", "failed", "uncertain"] as Tab[]) if (inTab(key, track)) result[key] += 1;
    }
    return result;
  }, [tracks]);
  const visible = useMemo(() => tracks.filter((track) => inTab(tab, track)), [tracks, tab]);
  const positions = useMemo(() => new Map(tracks.map((track, index) => [track.spotifyId, index + 1])), [tracks]);
  // If a tab empties out (say the last failed song got downloaded), fall back to "Todas".
  useEffect(() => {
    if ((tab === "failed" || tab === "uncertain") && tabCounts[tab] === 0) setTab("all");
  }, [tab, tabCounts]);

  const source = useMemo(() => ({ kind, id }), [kind, id]);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const { patch, poll } = collection;
  const queueNow = useCallback(
    async (trackIds?: string[], extendCount?: number) => {
      const wanted = trackIds ? new Set(trackIds) : null;
      const ids = tracksRef.current
        .filter((track) => (track.state === "missing" || track.state === "failed") && (!wanted || wanted.has(track.spotifyId)))
        .map((track) => track.spotifyId);
      const queued = await download(source, { trackIds, options: { enhancedRetries: retries || undefined, extendCount } });
      if (queued > 0) patch(ids, { state: "queued", requestedBy: me ? { id: me.id, name: me.name, avatarUrl: me.avatarUrl } : undefined });
      poll();
      return queued;
    },
    [download, source, retries, patch, poll, me],
  );

  const toggle = useCallback((spotifyId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(spotifyId)) next.delete(spotifyId);
      else next.add(spotifyId);
      return next;
    });
  }, []);
  const open = useCallback(
    (track: CollectionTrack) => openTrack(track.spotifyId, { title: track.title, artist: track.artist, album: track.album, imageUrl: track.imageUrl }),
    [openTrack],
  );
  const downloadOne = useCallback((track: CollectionTrack) => void queueNow([track.spotifyId]), [queueNow]);

  if (collection.error) {
    return (
      <div className="px-4 pt-8 md:px-7">
        <ErrorState message={t.collection.loadError(kind)} retryLabel={t.common.retry} onRetry={collection.reload} />
      </div>
    );
  }

  if (collection.loading || !meta || !counts) return <CollectionSkeleton />;

  const needs = counts.missing + counts.failed;
  const nothingYet = counts.owned === 0 && counts.inFlight === 0 && counts.failed === 0;
  const name = kind === "liked" ? t.nav.liked : meta.name;

  let action: React.ReactNode;
  if (needs > 0) {
    action = (
      <Button
        variant="accent"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await queueNow();
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Spinner /> : <ArrowDown aria-hidden />}
        {nothingYet ? t.collection.downloadAll(needs) : t.collection.downloadMissing(needs)}
      </Button>
    );
  } else {
    action = (
      <Button variant="outline" disabled>
        {counts.inFlight > 0 ? (
          <>
            <Spinner className="text-accent" />
            {t.collection.working(counts.inFlight)}
          </>
        ) : (
          t.collection.haveAll
        )}
      </Button>
    );
  }

  const zipReady = !!folder?.exists && counts.owned > 0;
  const total = Math.max(1, counts.total);
  const tabs: Tab[] = ["all", "owned", "missing", "failed", "uncertain"];

  return (
    <div className="pb-24">
      <header className="flex items-end gap-4 px-4 pb-4 pt-6 md:gap-5 md:px-7 md:pt-7">
        <Cover src={meta.imageUrl} name={name} liked={kind === "liked"} className="h-20 w-20 rounded md:h-[104px] md:w-[104px] [&_span]:text-[34px]" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-2xs text-muted-foreground">{t.kind[kind]}</span>
          <h1 className="text-balance break-words text-xl font-semibold tracking-[-0.01em]">{name}</h1>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>{meta.owner}</span>
            <span aria-hidden>·</span>
            <span>{t.common.songs(meta.total)}</span>
            <span aria-hidden>·</span>
            <span>{format.totalDuration(meta.durationMs)}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="flex h-[3px] w-40 overflow-hidden rounded-full bg-line" aria-hidden>
              <i className="block h-full bg-ok" style={{ width: `${(counts.owned / total) * 100}%` }} />
              <i className="block h-full bg-accent" style={{ width: `${(counts.inFlight / total) * 100}%` }} />
              <i className="block h-full bg-bad" style={{ width: `${(counts.failed / total) * 100}%` }} />
            </div>
            <p className="flex flex-wrap gap-x-2 text-[12.5px]" aria-live="polite">
              <span>{t.collection.have(counts.owned, counts.total)}</span>
              {counts.inFlight > 0 ? <span className="text-muted-foreground">{t.collection.inFlight(counts.inFlight)}</span> : null}
              {counts.failed > 0 ? <span className="text-bad">{t.collection.failed(counts.failed)}</span> : null}
            </p>
          </div>
        </div>
      </header>

      <Tabs.Root value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3 md:px-7">
          {action}
          {zipReady ? (
            <Button variant="outline" asChild title={t.collection.zipHint}>
              <a href={data.folderZipUrl(folder!.name)} download>
                {t.collection.zip}
              </a>
            </Button>
          ) : (
            <Button variant="outline" disabled title={t.collection.zipNone}>
              {t.collection.zip}
            </Button>
          )}
          <CollectionMenu
            kind={kind}
            id={id}
            retries={retries}
            onRetriesChange={changeRetries}
            onExtend={async (count) => {
              await queueNow(undefined, count);
            }}
          />
          <Tabs.List aria-label={t.collection.tabsLabel} className="flex w-full flex-wrap gap-0.5 pt-2 md:ml-auto md:w-auto md:pt-0">
            {tabs
              .filter((key) => key === "all" || key === "owned" || key === "missing" || tabCounts[key] > 0)
              .map((key) => (
                <Tabs.Trigger
                  key={key}
                  value={key}
                  className="rounded-sm px-2 py-1 text-xs text-muted-foreground hover:text-foreground data-[state=active]:bg-raised data-[state=active]:text-foreground"
                >
                  {t.collection.tabs[key]} <span className="tabular text-muted-foreground">{tabCounts[key]}</span>
                </Tabs.Trigger>
              ))}
          </Tabs.List>
        </div>

        <Tabs.Content value={tab} className="px-2 outline-none md:px-5" tabIndex={-1}>
          {visible.length === 0 ? (
            <p className="px-2 py-8 text-sm text-muted-foreground">{t.collection.emptyTab}</p>
          ) : (
            <TrackList
              tracks={visible}
              positions={positions}
              selected={selected}
              onToggle={toggle}
              onOpen={open}
              onDownload={downloadOne}
              label={name}
            />
          )}
        </Tabs.Content>
      </Tabs.Root>

      {selected.size > 0 ? (
        <div className="sticky bottom-3 z-10 mx-auto mt-4 flex w-fit items-center gap-3 rounded-lg border border-line bg-background py-1.5 pl-3 pr-1.5 shadow-float">
          <span className="text-sm">{t.collection.selected(selected.size)}</span>
          <Button
            variant="accent"
            size="sm"
            onClick={async () => {
              const ids = [...selected];
              setSelected(new Set());
              await queueNow(ids);
            }}
          >
            <ArrowDown aria-hidden />
            {t.collection.downloadSelection}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            {t.collection.clearSelection}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CollectionSkeleton() {
  const t = useT();
  return (
    <div className="px-4 pt-7 md:px-7" aria-busy="true" aria-label={t.common.loading}>
      <div className="flex items-end gap-5">
        <Skeleton className="h-20 w-20 md:h-[104px] md:w-[104px]" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
