import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Copy, Cpu, FileAudio, Gauge, Trophy, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { JudgementBadge } from "@/components/JudgementBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppConfig } from "@/hooks/useAppConfig";
import { api } from "@/lib/api-client";
import {
  LABEL_ORDER,
  decidingJudgement,
  formatJudgeName,
  formatLatency,
  labelMeta,
} from "@/lib/judgement";
import { TONE_SOLID } from "@/lib/status";
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

/**
 * Exactly what the judge saw, in the shape it saw it.
 *
 * When a model decides what gets downloaded, "why did it reject this" is the
 * first question — and the answer usually turns out to be the request side, not
 * the file: a mis-tagged album, an artist string with a featured act glued on.
 * Showing the inputs verbatim makes that visible without reading the logs.
 */
function JudgePrompt({ track }: { track: Track }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <Cpu className="h-3.5 w-3.5 shrink-0" aria-hidden />
        What the judge was asked
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <pre className="overflow-x-auto border-t border-border px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground scrollbar-thin">
          {`Requested:\n  artist: ${track.artist}\n  track:  ${track.title}\n  album:  ${track.album}\n\nCandidate file:\n  <each candidate below>`}
        </pre>
      ) : null}
    </div>
  );
}

function CandidateRow({ candidate, threshold }: { candidate: Candidate; threshold: number }) {
  const [open, setOpen] = useState(false);
  const deciding = decidingJudgement(candidate.judgements);
  const meta = labelMeta(candidate.label);
  const hasDetail = (candidate.judgements?.length ?? 0) > 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(candidate.filename);
      toast.success("Filename copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <li className="rounded-lg border border-border bg-card/60">
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-foreground">
            {candidate.filename}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={copy}
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
            <ScoreMeter score={candidate.score} threshold={threshold} />
          </div>
          <span className="tabular w-9 text-right text-xs font-medium text-foreground">
            {Math.round(candidate.score * 100)}%
          </span>
          {typeof candidate.relativeMiScore === "number" ? (
            <span
              className="tabular w-12 text-right text-[0.7rem] text-muted-foreground"
              title="Experimental relative-MI score"
            >
              MI {Math.round(candidate.relativeMiScore * 100)}
            </span>
          ) : null}
          {deciding?.latencyMs ? (
            <span className="tabular w-12 text-right text-[0.7rem] text-muted-foreground" title="Judge latency">
              {formatLatency(deciding.latencyMs)}
            </span>
          ) : null}
        </div>

        {meta ? <p className="mt-2 text-[0.7rem] text-muted-foreground">{meta.detail}</p> : null}

        {hasDetail ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="mt-2 inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} aria-hidden />
            {open ? "Hide" : "Show"} what the judge replied
          </button>
        ) : null}
      </div>

      {open ? (
        <ul className="space-y-2 border-t border-border bg-muted/20 px-3 py-2.5">
          {candidate.judgements.map((judgement) => (
            <li key={judgement.id} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium text-foreground">{formatJudgeName(judgement.judge)}</span>
                {judgement.model ? (
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[0.7rem] text-muted-foreground">
                    {judgement.model}
                  </code>
                ) : null}
                {judgement.label ? <JudgementBadge label={judgement.label} showIcon={false} /> : null}
                <span className="tabular ml-auto text-muted-foreground">{judgement.score.toFixed(2)}</span>
                <span className="tabular w-12 text-right text-muted-foreground">
                  {formatLatency(judgement.latencyMs)}
                </span>
              </div>
              {judgement.raw ? (
                <pre className="overflow-x-auto rounded bg-background px-2 py-1 font-mono text-[0.7rem] text-muted-foreground scrollbar-thin">
                  {judgement.raw}
                </pre>
              ) : null}
              {judgement.error ? (
                <p className="rounded bg-destructive/10 px-2 py-1 text-[0.7rem] text-destructive">
                  Judge failed — fallback score used. {judgement.error}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CandidateModal({ track, open, onOpenChange }: CandidateModalProps) {
  const { judgeThreshold, judge: judgeConfig } = useAppConfig();
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

  // Grouped by verdict when there are verdicts to group by; a scalar judge has
  // no labels, and a flat ranked list is the honest way to show that.
  const groups = useMemo(() => {
    const labelled = candidates.filter((candidate) => candidate.label);
    if (labelled.length === 0) return null;
    const seen = new Set<number>();
    const byLabel = LABEL_ORDER.map((label) => {
      const rows = candidates.filter((candidate) => candidate.label === label);
      rows.forEach((row) => seen.add(row.id));
      return { label: label as string, rows };
    }).filter((group) => group.rows.length > 0);
    const rest = candidates.filter((candidate) => !seen.has(candidate.id));
    return rest.length > 0 ? [...byLabel, { label: "", rows: rest }] : byLabel;
  }, [candidates]);

  const judgedBy = useMemo(
    () => decidingJudgement(candidates.flatMap((candidate) => candidate.judgements ?? [])),
    [candidates],
  );

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

        {track && judgeConfig.isLlm ? <JudgePrompt track={track} /> : null}

        <div className="min-h-[8rem]">
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" aria-hidden />
            {groups ? "Candidates grouped by verdict" : "Candidates ranked by judge score"}
            <span className="ml-auto inline-flex items-center gap-2 font-normal">
              {judgedBy?.model ? (
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.7rem]">{judgedBy.model}</code>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5" aria-hidden />
                threshold {Math.round(judgeThreshold * 100)}%
              </span>
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
          ) : groups ? (
            <div className="max-h-[46vh] space-y-4 overflow-y-auto pr-1 scrollbar-thin">
              {groups.map((group) => {
                const meta = labelMeta(group.label);
                return (
                  <section key={group.label || "unlabelled"} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("h-2 w-2 shrink-0 rounded-full", TONE_SOLID[meta?.tone ?? "muted"])}
                        aria-hidden
                      />
                      <h3 className="text-xs font-semibold text-foreground">
                        {meta?.label ?? "Not labelled"}
                      </h3>
                      <span className="tabular text-xs text-muted-foreground">{group.rows.length}</span>
                    </div>
                    <ul className="space-y-2">
                      {group.rows.map((candidate) => (
                        <CandidateRow key={candidate.id} candidate={candidate} threshold={judgeThreshold} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : (
            <ul className="max-h-[46vh] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              {candidates.map((candidate) => (
                <CandidateRow key={candidate.id} candidate={candidate} threshold={judgeThreshold} />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
