import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, ListMusic, type LucideIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_META, TONE_SOLID } from "@/lib/status";
import { cn } from "@/lib/utils";
import { TrackStatus, type Track } from "@/types";

interface TrackTableProps {
  tracks: Track[];
  loading?: boolean;
  onSelect: (track: Track) => void;
  emptyTitle: string;
  emptyDetail?: string;
  emptyIcon?: LucideIcon;
}

const ROW_HEIGHT = 60;
const IN_FLIGHT = new Set<TrackStatus>([TrackStatus.DOWNLOADING, TrackStatus.FINALIZING]);

function HeaderCell({ children, className }: { children: import("react").ReactNode; className?: string }) {
  return (
    <div className={cn("text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground", className)}>
      {children}
    </div>
  );
}

function TrackRow({ track, onSelect }: { track: Track; onSelect: (t: Track) => void }) {
  const meta = STATUS_META[track.status];
  const inFlight = IN_FLIGHT.has(track.status);
  return (
    <button
      type="button"
      onClick={() => onSelect(track)}
      className={cn(
        "flex h-[60px] w-full items-center gap-4 border-b border-border px-4 text-left transition-colors last:border-0",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
      )}
    >
      <span className={cn("h-8 w-1 shrink-0 rounded-full", meta ? TONE_SOLID[meta.tone] : "bg-muted")} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{track.title || "Untitled"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {track.artist}
          {track.album ? <span className="text-muted-foreground/60"> · {track.album}</span> : null}
        </p>
      </div>

      <div className="hidden w-[7.5rem] shrink-0 sm:block">
        <StatusBadge status={track.status} />
      </div>

      <div className="hidden w-12 shrink-0 text-right lg:block">
        {typeof track.score === "number" ? (
          <span className="tabular text-xs font-medium text-foreground">{Math.round(track.score * 100)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      <div className="hidden w-40 shrink-0 md:block">
        {inFlight ? (
          <div className="flex items-center gap-2">
            <Progress value={track.progress} className="h-1.5" />
            <span className="tabular w-9 text-right text-xs text-muted-foreground">{track.progress}%</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{track.candidatesCount} cand.</span>
        )}
      </div>

      <div className="hidden w-32 shrink-0 xl:block">
        <span className="block truncate font-mono text-xs text-muted-foreground">{track.username || "—"}</span>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
    </button>
  );
}

export function TrackTable({ tracks, loading, onSelect, emptyTitle, emptyDetail, emptyIcon }: TrackTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex h-[60px] items-center gap-4 border-b border-border px-4 last:border-0">
            <Skeleton className="h-8 w-1 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="hidden h-5 w-24 rounded-full sm:block" />
            <Skeleton className="hidden h-2 w-40 md:block" />
          </div>
        ))}
      </div>
    );
  }

  if (tracks.length === 0) {
    return <EmptyState icon={emptyIcon ?? ListMusic} title={emptyTitle} detail={emptyDetail} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-2.5">
        <span className="w-1 shrink-0" aria-hidden />
        <HeaderCell className="flex-1">Track</HeaderCell>
        <HeaderCell className="hidden w-[7.5rem] shrink-0 sm:block">Stage</HeaderCell>
        <HeaderCell className="hidden w-12 shrink-0 text-right lg:block">Match</HeaderCell>
        <HeaderCell className="hidden w-40 shrink-0 md:block">Progress</HeaderCell>
        <HeaderCell className="hidden w-32 shrink-0 xl:block">Peer</HeaderCell>
        <span className="h-4 w-4 shrink-0" aria-hidden />
      </div>

      <div ref={scrollRef} className="max-h-[calc(100vh-16rem)] overflow-y-auto scrollbar-thin">
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {virtualizer.getVirtualItems().map((row) => {
            const track = tracks[row.index];
            return (
              <div
                key={track.id ?? row.key}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${row.start}px)` }}
              >
                <TrackRow track={track} onSelect={onSelect} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
