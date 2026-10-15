import { useEffect, useState } from "react";
import { useVerdicts } from "@/lib/data/hooks";
import { useFormat, useT } from "@/lib/i18n";
import { LABEL_ORDER, formatJudgeName, scorePct, verdictDetail, verdictLabel, verdictTone } from "@/lib/judgement";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { JudgeSwitch } from "@/components/JudgeSwitch";
import { Spinner } from "@/components/Spinner";
import { useApp } from "@/components/shell/AppContext";
import type { JudgementSummary } from "@/types";
import { cn } from "@/lib/utils";

/** What the judge decides in general: a feed of recent verdicts, filterable, each opening its song. */
export function VerdictsView() {
  const t = useT();
  const format = useFormat();
  const { isAdmin } = useAuth();
  const { openTrack } = useApp();
  const [label, setLabel] = useState<string | null>(null);
  const [judge, setJudge] = useState<string | null>(null);
  const verdicts = useVerdicts({ label, judge });
  const { summary, items } = verdicts;

  // The filter chips read from the last unfiltered summary, or picking one would hide the others.
  const [distribution, setDistribution] = useState<JudgementSummary["labels"]>([]);
  const [roster, setRoster] = useState<JudgementSummary["judges"]>([]);
  useEffect(() => {
    if (!label) setDistribution(summary.labels);
  }, [label, summary]);
  useEffect(() => {
    if (!judge) setRoster(summary.judges);
  }, [judge, summary]);

  const acceptedPct = summary.total > 0 ? Math.round((summary.accepted / summary.total) * 100) : 0;
  const chip = (active: boolean) =>
    cn("rounded-sm px-2 py-1 text-xs text-muted-foreground hover:text-foreground", active && "bg-raised text-foreground");

  return (
    <div className="px-4 pb-16 pt-6 md:px-7">
      <h1 className="text-xl font-semibold tracking-[-0.01em]">{t.verdicts.title}</h1>
      {summary.total > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {t.verdicts.summary(acceptedPct, format.latency(summary.avgLatencyMs))}
          {summary.errors > 0 ? <span className="text-bad"> · {t.verdicts.errors(summary.errors)}</span> : null}
        </p>
      ) : null}

      {isAdmin ? (
        <div className="mt-4">
          <JudgeSwitch compact />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-0.5" role="group" aria-label={t.verdicts.filterLabel}>
        <button type="button" aria-pressed={label === null} className={chip(label === null)} onClick={() => setLabel(null)}>
          {t.verdicts.all}
        </button>
        {LABEL_ORDER.map((value) => {
          const count = distribution.find((entry) => entry.label === value)?.count ?? 0;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={label === value}
              title={verdictDetail(t, value)}
              className={chip(label === value)}
              onClick={() => setLabel(label === value ? null : value)}
            >
              {verdictLabel(t, value)} <span className="tabular text-muted-foreground">{format.number(count)}</span>
            </button>
          );
        })}
        {roster.length > 1 ? (
          <>
            <span className="ml-3 mr-1 text-2xs text-muted-foreground">{t.verdicts.judge}</span>
            {roster.map((entry) => (
              <button
                key={entry.judge}
                type="button"
                aria-pressed={judge === entry.judge}
                className={chip(judge === entry.judge)}
                onClick={() => setJudge(judge === entry.judge ? null : entry.judge)}
              >
                {formatJudgeName(entry.judge)}
              </button>
            ))}
          </>
        ) : null}
      </div>

      <div className="mt-3 border-t border-line">
        {verdicts.loading ? (
          <div className="space-y-3 pt-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : verdicts.error ? (
          <ErrorState message={t.verdicts.loadError} />
        ) : items.length === 0 ? (
          <EmptyState title={label || judge ? t.verdicts.emptyFiltered : t.verdicts.empty} />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openTrack(item.spotifyId, { title: item.title, artist: item.artist, album: item.album })}
                  className="flex w-full items-center gap-4 px-1 py-2 text-left hover:bg-hover"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{item.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.artist}</span>
                    <span className="truncate font-mono text-2xs text-muted-foreground lg:hidden">{item.filename}</span>
                  </span>
                  <span className="hidden min-w-0 flex-1 truncate font-mono text-2xs text-muted-foreground lg:block">{item.filename}</span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className={cn("whitespace-nowrap text-xs", item.error ? "text-bad" : verdictTone(item.label))}>
                      {item.error ? t.verdict.judgeFailed : verdictLabel(t, item.label)}
                      <span className="tabular text-muted-foreground"> · {scorePct(item.score)}</span>
                    </span>
                    <span className="whitespace-nowrap text-2xs text-muted-foreground">
                      {formatJudgeName(item.judge)} · {format.relative(item.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {verdicts.canLoadMore ? (
          <Button variant="ghost" size="sm" className="mt-3" disabled={verdicts.loadingMore} onClick={() => void verdicts.loadMore()}>
            {verdicts.loadingMore ? <Spinner /> : null}
            {t.common.loadMore}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
