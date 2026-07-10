import { useEffect, useState } from "react";
import { Copy, FileAudio, Gauge, Trophy, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppConfig } from "@/hooks/useAppConfig";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Candidate, Track } from "@/types";

interface CandidateModalProps {
  track: Track | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ScoreMeter({ score, threshold }: { score: number; threshold: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(score * 100)));
  const accepted = score >= threshold;
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted" title={`Judge threshold ${Math.round(threshold * 100)}%`}>
      <div className={cn("h-full rounded-full", accepted ? "bg-success" : "bg-warning")} style={{ width: `${pct}%` }} />
      <span
        className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-foreground/50"
        style={{ left: `${Math.round(threshold * 100)}%` }}
        aria-hidden
      />
    </div>
  );
}

export function CandidateModal({ track, open, onOpenChange }: CandidateModalProps) {
  const { judgeThreshold } = useAppConfig();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !track) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getCandidates(track.id)
      .then((rows) => {
        if (!cancelled) setCandidates(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load candidates");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, track]);

  const copy = async (filename: string) => {
    try {
      await navigator.clipboard.writeText(filename);
      toast.success("Filename copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="truncate">{track?.title || "Track"}</DialogTitle>
            {track ? <StatusBadge status={track.status} /> : null}
          </div>
          <DialogDescription className="truncate">
            {track?.artist}
            {track?.album ? ` · ${track.album}` : ""}
          </DialogDescription>
        </DialogHeader>

        {track?.rejectReason ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{track.rejectReason}</p>
        ) : null}

        <div className="min-h-[8rem]">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" aria-hidden />
            Candidates ranked by judge score
            <span className="ml-auto inline-flex items-center gap-1 font-normal">
              <Gauge className="h-3.5 w-3.5" aria-hidden />
              threshold {Math.round(judgeThreshold * 100)}%
            </span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} />
          ) : candidates.length === 0 ? (
            <EmptyState
              icon={FileAudio}
              title="No candidates recorded"
              detail="The judge has not stored any Soulseek matches for this track yet."
            />
          ) : (
            <ul className="max-h-[46vh] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              {candidates.map((candidate) => (
                <li key={candidate.id} className="rounded-lg border border-border bg-card/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-foreground">
                      {candidate.filename}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => copy(candidate.filename)}
                      aria-label="Copy filename"
                      title="Copy filename"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate font-mono">{candidate.username}</span>
                    </span>
                    <div className="flex-1">
                      <ScoreMeter score={candidate.score} threshold={judgeThreshold} />
                    </div>
                    <span className="tabular w-9 text-right text-xs font-medium text-foreground">
                      {Math.round(candidate.score * 100)}%
                    </span>
                    {typeof candidate.relativeMiScore === "number" ? (
                      <span
                        className="tabular w-14 text-right text-[0.7rem] text-muted-foreground"
                        title="Experimental relative-MI score"
                      >
                        MI {Math.round(candidate.relativeMiScore * 100)}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
