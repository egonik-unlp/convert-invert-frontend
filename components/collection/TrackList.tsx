import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Clock3 } from "lucide-react";
import type { CollectionTrack } from "@/lib/api-client";
import { useFormat, useT } from "@/lib/i18n";
import { Cover } from "@/components/Cover";
import { PlayCover } from "@/components/PlayCover";
import { usePlayer } from "@/lib/player";
import { useApp } from "@/components/shell/AppContext";
import { data } from "@/lib/data";
import { StatusCell, statusText } from "./StatusCell";
import { cn } from "@/lib/utils";

const ROW = 44;
const GRID = "grid grid-cols-[28px_minmax(0,1fr)_auto] gap-3 sm:grid-cols-[24px_28px_minmax(0,1.4fr)_minmax(0,1fr)_44px_148px]";

interface TrackListProps {
  tracks: CollectionTrack[];
  /** Position in the full collection, shown in the number column. */
  positions?: Map<string, number>;
  selected: Set<string>;
  onToggle: (spotifyId: string) => void;
  onOpen: (track: CollectionTrack) => void;
  onDownload: (track: CollectionTrack) => void;
  /** Play a downloaded song (the list decides the queue). */
  onPlay?: (track: CollectionTrack) => void;
  label: string;
}

/**
 * The songs of a collection: virtualized against the main scroll area, 44px rows, keys by Spotify
 * id so rows that change state every poll don't remount. Keyboard: ↑/↓ move, Enter opens the
 * judging panel, Space selects, d downloads.
 */
export function TrackList({ tracks, positions, selected, onToggle, onOpen, onDownload, onPlay, label }: TrackListProps) {
  const t = useT();
  const player = usePlayer();
  const playingId = player.current?.spotifyId;
  const { scrollRef } = useApp();
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);

  useLayoutEffect(() => {
    const measure = () => setScrollMargin(listRef.current?.offsetTop ?? 0);
    measure();
    const observer = new ResizeObserver(measure);
    if (scrollRef.current?.firstElementChild) observer.observe(scrollRef.current.firstElementChild);
    return () => observer.disconnect();
  }, [scrollRef]);

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW,
    overscan: 12,
    scrollMargin,
    getItemKey: (index) => tracks[index]?.spotifyId ?? index,
  });

  const focusRow = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(tracks.length - 1, index));
      setFocusIndex(next);
      virtualizer.scrollToIndex(next, { align: "auto" });
      requestAnimationFrame(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-row="${next}"]`)?.focus();
      });
    },
    [tracks.length, virtualizer],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    const track = tracks[focusIndex];
    if (!track) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusRow(focusIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusRow(focusIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusRow(0);
        break;
      case "End":
        event.preventDefault();
        focusRow(tracks.length - 1);
        break;
      case "Enter":
        event.preventDefault();
        onOpen(track);
        break;
      case " ":
        event.preventDefault();
        onToggle(track.spotifyId);
        break;
      case "d":
        if (track.state === "missing" || track.state === "failed") {
          event.preventDefault();
          onDownload(track);
        }
        break;
    }
  };

  const safeFocus = Math.min(focusIndex, Math.max(0, tracks.length - 1));

  return (
    <div role="grid" aria-label={label} aria-rowcount={tracks.length + 1} onKeyDown={onKeyDown}>
      <div role="row" aria-rowindex={1} className={cn(GRID, "hidden h-8 items-center border-b border-line px-2 text-2xs text-muted-foreground sm:grid")}>
        <span role="columnheader" className="text-right">
          #
        </span>
        <span role="columnheader" aria-hidden />
        <span role="columnheader">{t.collection.columns.title}</span>
        <span role="columnheader">{t.collection.columns.album}</span>
        <span role="columnheader" className="flex justify-end" aria-label={t.collection.columns.duration}>
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span role="columnheader" className="pl-1.5">
          {t.collection.columns.status}
        </span>
      </div>
      <div ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const track = tracks[item.index];
          return (
            <Row
              key={item.key}
              track={track}
              index={item.index}
              position={positions?.get(track.spotifyId) ?? item.index + 1}
              top={item.start - scrollMargin}
              focusable={item.index === safeFocus}
              selected={selected.has(track.spotifyId)}
              selecting={selected.size > 0}
              statusLabel={statusText(t, track)}
              fileLabel={t.status.downloadFileOf(track.title)}
              playState={track.spotifyId === playingId ? (player.playing ? "playing" : "paused") : "none"}
              playLabel={track.spotifyId === playingId && player.playing ? t.player.pauseSong(track.title) : t.player.playSong(track.title)}
              onPlay={onPlay}
              selectLabel={t.collection.selectRow(track.title)}
              onFocus={setFocusIndex}
              onToggle={onToggle}
              onOpen={onOpen}
              onDownload={onDownload}
            />
          );
        })}
      </div>
    </div>
  );
}

interface RowProps {
  track: CollectionTrack;
  index: number;
  position: number;
  top: number;
  focusable: boolean;
  selected: boolean;
  selecting: boolean;
  statusLabel: string;
  fileLabel: string;
  playState: "none" | "playing" | "paused";
  playLabel: string;
  onPlay?: (track: CollectionTrack) => void;
  selectLabel: string;
  onFocus: (index: number) => void;
  onToggle: (spotifyId: string) => void;
  onOpen: (track: CollectionTrack) => void;
  onDownload: (track: CollectionTrack) => void;
}

const Row = memo(function Row({
  track,
  index,
  position,
  top,
  focusable,
  selected,
  selecting,
  statusLabel,
  fileLabel,
  playState,
  playLabel,
  onPlay,
  selectLabel,
  onFocus,
  onToggle,
  onOpen,
  onDownload,
}: RowProps) {
  const format = useFormat();
  const dim = track.state === "missing" || track.state === "failed";
  return (
    <div
      role="row"
      data-row={index}
      aria-rowindex={index + 2}
      aria-selected={selected}
      aria-label={`${track.title}, ${track.artist}, ${statusLabel}`}
      tabIndex={focusable ? 0 : -1}
      onFocus={() => onFocus(index)}
      onClick={() => onOpen(track)}
      className={cn(
        GRID,
        "group absolute inset-x-0 h-11 cursor-default items-center rounded-md px-2 outline-none hover:bg-hover focus-visible:bg-hover focus-visible:outline-1 focus-visible:outline-offset-[-1px]",
        selected && "bg-raised hover:bg-raised",
      )}
      style={{ transform: `translateY(${top}px)` }}
    >
      <span role="gridcell" className="hidden justify-end sm:flex">
        <input
          type="checkbox"
          tabIndex={-1}
          checked={selected}
          aria-label={selectLabel}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onToggle(track.spotifyId)}
          className={cn("h-3.5 w-3.5 accent-[hsl(var(--accent))]", selected || selecting ? "block" : "hidden group-hover:block")}
        />
        <span className={cn("tabular text-xs text-muted-foreground", selected || selecting ? "hidden" : "group-hover:hidden")}>{position}</span>
      </span>
      <span role="gridcell" className={cn(dim && "opacity-50")}>
        {onPlay && track.state === "owned" ? (
          <PlayCover src={track.imageUrl} name={track.album || track.title} state={playState} onPlay={() => onPlay(track)} label={playLabel} className="h-7 w-7" />
        ) : (
          <Cover src={track.imageUrl} name={track.album || track.title} className="h-7 w-7" />
        )}
      </span>
      <span role="gridcell" className={cn("flex min-w-0 flex-col", dim && "opacity-60")}>
        <span className={cn("truncate", playState === "none" ? "text-foreground" : "text-accent")}>{track.title}</span>
        <span className="truncate text-xs text-muted-foreground">{track.artist}</span>
      </span>
      <span role="gridcell" className={cn("hidden truncate text-xs text-muted-foreground sm:block", dim && "opacity-60")}>
        {track.album}
      </span>
      <span role="gridcell" className="tabular hidden text-right text-xs text-muted-foreground sm:block">
        {format.trackDuration(track.durationMs)}
      </span>
      <span role="gridcell" className="flex min-w-0 justify-end sm:justify-start">
        <StatusCell
          status={track}
          onDownload={() => onDownload(track)}
          onOpen={() => onOpen(track)}
          fileUrl={track.state === "owned" ? data.trackFileUrl(track.spotifyId) : undefined}
          fileLabel={fileLabel}
        />
      </span>
    </div>
  );
});
