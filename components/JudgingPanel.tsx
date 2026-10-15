import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, Check, ChevronRight, Copy, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import type { JudgingCandidate, JudgingDetail } from "@/lib/api-client";
import { data } from "@/lib/data";
import { useJudging } from "@/lib/data/hooks";
import { useFormat, useT } from "@/lib/i18n";
import { decidingJudgement, formatJudgeName, scorePct, verdictDetail, verdictLabel, verdictTone } from "@/lib/judgement";
import { useAppConfig } from "@/hooks/useAppConfig";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/Avatar";
import { Cover } from "@/components/Cover";
import { ErrorState } from "@/components/ErrorState";
import { Spinner } from "@/components/Spinner";
import { statusText } from "@/components/collection/StatusCell";
import { useApp, type TrackInfo } from "@/components/shell/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * How a song was judged, in a side panel opened from any row (`?track=` in the hash): the query,
 * the chosen file or why none passed, and every candidate with each judge's verdict and raw reply.
 */
export function JudgingPanel({ spotifyId, info, onClose }: { spotifyId: string | null; info?: TrackInfo; onClose: () => void }) {
  const t = useT();
  return (
    <Dialog open={!!spotifyId} onOpenChange={(open) => !open && onClose()}>
      {spotifyId ? (
        <SheetContent aria-describedby={undefined}>
          <PanelBody spotifyId={spotifyId} info={info} />
          <DialogClose
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
            aria-label={t.common.close}
          >
            <X className="h-[15px] w-[15px]" aria-hidden />
          </DialogClose>
        </SheetContent>
      ) : null}
    </Dialog>
  );
}

function PanelBody({ spotifyId, info }: { spotifyId: string; info?: TrackInfo }) {
  const t = useT();
  const { me } = useAuth();
  const { download } = useApp();
  const { detail, loading, error, reload } = useJudging(spotifyId);
  const [busy, setBusy] = useState<string | null>(null);

  const title = detail?.attempted ? detail.title : info?.title ?? "";
  const artist = detail?.attempted ? detail.artist : info?.artist ?? "";
  const album = detail?.attempted ? detail.album : info?.album;

  const retry = async () => {
    setBusy("retry");
    try {
      const queued = await download({ kind: "track", id: spotifyId }, { options: { enhancedRetries: true }, quiet: true });
      if (queued > 0) toast(t.judging.retrying);
      reload();
    } finally {
      setBusy(null);
    }
  };

  const useAnyway = async (candidate: JudgingCandidate) => {
    setBusy(`use:${candidate.id}`);
    try {
      await data.acceptCandidate(spotifyId, candidate.id);
      toast(t.judging.usingIt);
      reload();
    } catch (err) {
      console.warn("Accept failed", err);
      toast.error(t.common.somethingFailed);
    } finally {
      setBusy(null);
    }
  };

  const requester = detail?.status.requestedBy;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-start gap-3 border-b border-line px-4 pb-3 pt-4 pr-12">
        <Cover src={info?.imageUrl} name={album || title || "?"} className="h-11 w-11" />
        <div className="min-w-0">
          <DialogTitle className="truncate text-base font-medium">{title || t.judging.title}</DialogTitle>
          <DialogDescription className="truncate text-xs text-muted-foreground">{[artist, album].filter(Boolean).join(" · ")}</DialogDescription>
          {detail ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{statusText(t, detail.status)}</span>
              {requester ? (
                <>
                  <span aria-hidden>·</span>
                  <Avatar name={requester.name} src={requester.avatarUrl} className="h-4 w-4 text-[9px]" />
                  <span>{t.judging.requestedBy(requester.id === me?.id ? t.common.you : requester.name)}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        {loading && !detail ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <ErrorState message={t.judging.loadError} retryLabel={t.common.retry} onRetry={reload} />
        ) : detail ? (
          <Detail
            detail={detail}
            busy={busy}
            onRetry={retry}
            onUseAnyway={useAnyway}
            onDownload={async () => {
              setBusy("download");
              try {
                await download({ kind: "track", id: spotifyId });
                reload();
              } finally {
                setBusy(null);
              }
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function Detail({
  detail,
  busy,
  onRetry,
  onUseAnyway,
  onDownload,
}: {
  detail: JudgingDetail;
  busy: string | null;
  onRetry: () => void;
  onUseAnyway: (candidate: JudgingCandidate) => void;
  onDownload: () => void;
}) {
  const t = useT();
  const { judgeThreshold } = useAppConfig();

  if (!detail.attempted) {
    if (detail.status.state === "queued") {
      return <p className="text-sm text-muted-foreground">{t.status.queued}</p>;
    }
    return (
      <div className="space-y-2 text-sm">
        <p>{t.judging.notYet}</p>
        <p className="text-muted-foreground">{t.judging.notYetHint}</p>
        {detail.status.state === "missing" ? (
          <Button variant="accent" size="sm" className="mt-2" disabled={busy === "download"} onClick={onDownload}>
            {busy === "download" ? <Spinner /> : <ArrowDown aria-hidden />}
            {t.status.download}
          </Button>
        ) : null}
      </div>
    );
  }

  const state = detail.status.state;
  const chosen = detail.candidates.filter((c) => c.chosen);
  const others = [...detail.candidates.filter((c) => !c.chosen)].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const failed = state === "failed";
  const live = state === "searching" || state === "comparing";

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-2xs uppercase tracking-[0.04em] text-muted-foreground">{t.judging.query}</h3>
        <p className="mt-1 font-mono text-xs">“{detail.query}”</p>
        {detail.relaxedQuery && detail.relaxedQuery !== detail.query ? (
          <p className="mt-0.5 font-mono text-2xs text-muted-foreground">{t.judging.relaxed(detail.relaxedQuery)}</p>
        ) : null}
      </section>

      {live ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <Spinner className="text-accent" />
          {state === "searching" || detail.candidates.length === 0 ? t.judging.searching : t.judging.comparing(detail.candidates.length)}
        </p>
      ) : null}

      {failed ? (
        <section className="space-y-2">
          <p className="text-sm font-medium text-bad">{t.judging.failTitle}</p>
          <p className="text-sm text-muted-foreground">{t.judging.failHint(detail.candidates.length)}</p>
          {detail.rejections.length > 0 ? (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none hover:text-foreground">{t.judging.reasons}</summary>
              <ul className="mt-1 space-y-0.5 font-mono text-2xs">
                {detail.rejections.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </details>
          ) : null}
          <Button variant="accent" size="sm" disabled={busy === "retry"} onClick={onRetry}>
            {busy === "retry" ? <Spinner /> : <RotateCw aria-hidden />}
            {t.judging.retryHard}
          </Button>
        </section>
      ) : null}

      {chosen.length > 0 ? (
        <section>
          <h3 className="text-2xs uppercase tracking-[0.04em] text-muted-foreground">{t.judging.chosen}</h3>
          <ul className="mt-1.5">
            {chosen.map((candidate) => (
              <CandidateRow key={candidate.id} candidate={candidate} threshold={judgeThreshold} live={live} chosen />
            ))}
          </ul>
        </section>
      ) : null}

      {others.length > 0 ? (
        <section>
          <h3 className="text-2xs uppercase tracking-[0.04em] text-muted-foreground">
            {chosen.length > 0 ? t.judging.discarded(others.length) : t.judging.candidates(others.length)}
          </h3>
          <ul className="mt-1.5 divide-y divide-line">
            {others.map((candidate) => (
              <CandidateRow
                key={candidate.id}
                candidate={candidate}
                threshold={judgeThreshold}
                live={live}
                action={
                  failed ? (
                    <Button variant="outline" size="sm" disabled={busy === `use:${candidate.id}`} onClick={() => onUseAnyway(candidate)}>
                      {busy === `use:${candidate.id}` ? <Spinner /> : null}
                      {t.judging.useAnyway}
                    </Button>
                  ) : null
                }
              />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-2xs text-muted-foreground">{t.judging.threshold(scorePct(judgeThreshold))}</p>
    </div>
  );
}

function CandidateRow({
  candidate,
  threshold,
  live,
  chosen,
  action,
}: {
  candidate: JudgingCandidate;
  threshold: number;
  live: boolean;
  chosen?: boolean;
  action?: React.ReactNode;
}) {
  const t = useT();
  const format = useFormat();
  const deciding = decidingJudgement(candidate.judgements);
  const manual = candidate.judgements.find((j) => j.judge === "manual");
  const pending = live && candidate.judgements.length === 0;
  const label = manual?.label ?? candidate.label;
  const uncertain = chosen && (label !== "exact" || (candidate.score ?? 1) < threshold);
  const manualBy = useMemo(() => {
    try {
      return manual?.raw ? (JSON.parse(manual.raw).by as string | undefined) : undefined;
    } catch {
      return undefined;
    }
  }, [manual?.raw]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(candidate.filename);
      toast(t.common.copied);
    } catch {
      toast.error(t.common.copyFailed);
    }
  };

  return (
    <li className="py-2.5 first:pt-0">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed">{candidate.filename}</p>
        <Button variant="ghost" size="icon" className="-mt-1 h-6 w-6" onClick={copy} aria-label={t.judging.copyFilename} title={t.judging.copyFilename}>
          <Copy className="!h-3 !w-3" aria-hidden />
        </Button>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
        {pending ? (
          <span className="inline-flex items-center gap-1.5">
            <Spinner /> {t.judging.pending}
          </span>
        ) : (
          <span className={cn("inline-flex items-center gap-1", verdictTone(label))} title={verdictDetail(t, label)}>
            {chosen ? uncertain ? <AlertTriangle className="h-3 w-3 text-accent" aria-hidden /> : <Check className="h-3 w-3" aria-hidden /> : null}
            {deciding?.error ? t.verdict.judgeFailed : verdictLabel(t, label)}
            {candidate.score != null ? <span className="tabular text-muted-foreground"> · {scorePct(candidate.score)}</span> : null}
          </span>
        )}
        <span aria-hidden>·</span>
        <span className="font-mono">{candidate.username}</span>
        <span aria-hidden>·</span>
        <span className="tabular">{format.size(candidate.size)}</span>
        {candidate.format ? (
          <>
            <span aria-hidden>·</span>
            <span>{candidate.format}</span>
          </>
        ) : null}
      </p>
      {manualBy ? <p className="mt-0.5 text-2xs text-muted-foreground">{t.judging.manualBy(manualBy)}</p> : null}
      {chosen && uncertain ? <p className="mt-0.5 text-2xs text-muted-foreground">{t.status.uncertain}</p> : null}
      <div className="mt-1.5 flex items-center gap-2">
        {candidate.judgements.length > 0 ? (
          <details className="group/j min-w-0 flex-1 text-xs">
            <summary className="inline-flex cursor-pointer select-none list-none items-center gap-1 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              <ChevronRight className="h-3 w-3 transition-transform group-open/j:rotate-90" aria-hidden />
              {t.judging.judges}
            </summary>
            <ul className="mt-1.5 space-y-2 border-l border-line pl-3">
              {candidate.judgements.map((judgement) => (
                <li key={judgement.id}>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-xs">
                    <span className="text-foreground">{formatJudgeName(judgement.judge)}</span>
                    {judgement.model ? <code className="font-mono text-2xs text-muted-foreground">{judgement.model}</code> : null}
                    {judgement.label ? <span className={verdictTone(judgement.label)}>{verdictLabel(t, judgement.label)}</span> : null}
                    <span className="tabular text-muted-foreground">{judgement.score.toFixed(2)}</span>
                    <span className="tabular text-muted-foreground">{format.latency(judgement.latencyMs)}</span>
                  </p>
                  {judgement.raw ? (
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded-sm bg-raised px-2 py-1 font-mono text-2xs text-muted-foreground">
                      {judgement.raw}
                    </pre>
                  ) : null}
                  {judgement.error ? <p className="mt-1 text-2xs text-bad">{judgement.error}</p> : null}
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <span className="flex-1" />
        )}
        {action}
      </div>
    </li>
  );
}
