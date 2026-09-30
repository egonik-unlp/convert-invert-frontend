import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  Cpu,
  Gauge,
  Gavel,
  Loader2,
  Timer,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { JudgementBadge } from "@/components/JudgementBadge";
import { JudgeSwitch } from "@/components/JudgeSwitch";
import { useAppConfig } from "@/hooks/useAppConfig";
import { api } from "@/lib/api-client";
import {
  LABEL_META,
  LABEL_ORDER,
  formatAge,
  formatJudgeName,
  formatLatency,
  labelMeta,
} from "@/lib/judgement";
import { TONE_SOLID } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { JudgementFeedItem, JudgementSummary, JudgementsPage } from "@/types";

const PAGE_SIZE = 60;
const POLL_MS = 5000;

const emptySummary: JudgementSummary = {
  total: 0,
  accepted: 0,
  errors: 0,
  avgLatencyMs: 0,
  p95LatencyMs: 0,
  labels: [],
  judges: [],
};

/** Newest first, matching the API's `created_at DESC, id DESC` ordering. */
function mergeItems(existing: JudgementFeedItem[], incoming: JudgementFeedItem[]) {
  const byId = new Map<number, JudgementFeedItem>();
  for (const item of existing) byId.set(item.id, item);
  for (const item of incoming) byId.set(item.id, item);
  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
}

function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/**
 * How the judge is ruling, across every track.
 *
 * The library answers "what happened to this track". Once a model is doing the
 * deciding, the question that matters instead is how the model itself is
 * behaving — what it accepts, what it throws out and why, how fast it answers,
 * and whether it is quietly erroring and falling back. That is this view.
 */
export function JudgementsView() {
  const { judge: judgeConfig, judgeThreshold } = useAppConfig();
  const [summary, setSummary] = useState<JudgementSummary>(emptySummary);
  const [items, setItems] = useState<JudgementFeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | undefined>(undefined);
  const [label, setLabel] = useState<string | null>(null);
  const [judge, setJudge] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPage = useCallback((page: JudgementsPage, merge: boolean) => {
    setSummary(page.summary);
    setItems((current) => (merge ? mergeItems(current, page.items) : page.items));
    setNextCursor(page.nextCursor);
  }, []);

  const load = useCallback(
    async (merge: boolean) => {
      const page = await api.getJudgements({
        limit: PAGE_SIZE,
        label: label ?? undefined,
        judge: judge ?? undefined,
      });
      applyPage(page, merge);
    },
    [applyPage, judge, label],
  );

  // Filters change the whole result set, so a filter switch reloads from scratch.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    load(false)
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load judgements");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Merge on poll so verdicts arriving mid-run appear without discarding pages
  // the reader already scrolled into.
  useEffect(() => {
    const interval = setInterval(() => {
      void load(true).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (nextCursor == null) return;
    setLoadingMore(true);
    try {
      const page = await api.getJudgements({
        limit: PAGE_SIZE,
        cursor: nextCursor,
        label: label ?? undefined,
        judge: judge ?? undefined,
      });
      applyPage(page, true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load more judgements");
    } finally {
      setLoadingMore(false);
    }
  }, [applyPage, judge, label, nextCursor]);

  // The summary honours the active filters, so the two controls that *offer*
  // those filters have to read from the last unfiltered snapshot instead —
  // otherwise picking "exact" collapses the distribution to one full-width bar
  // and picking a judge hides every other judge, including the way back.
  const [distribution, setDistribution] = useState<JudgementSummary["labels"]>([]);
  const [distributionTotal, setDistributionTotal] = useState(0);
  const [roster, setRoster] = useState<JudgementSummary["judges"]>([]);
  useEffect(() => {
    if (label) return;
    setDistribution(summary.labels);
    setDistributionTotal(summary.labels.reduce((sum, entry) => sum + entry.count, 0));
  }, [label, summary]);
  useEffect(() => {
    if (judge) return;
    setRoster(summary.judges);
  }, [judge, summary]);

  const promptVersion = useMemo(
    () => items.find((item) => item.promptVersion)?.promptVersion,
    [items],
  );
  const activeModel =
    judgeConfig.model ?? summary.judges.find((entry) => entry.model)?.model ?? null;

  return (
    <div className="space-y-6">
      <JudgeHeader
        backend={judgeConfig.backend}
        isLlm={judgeConfig.isLlm}
        model={activeModel}
        promptVersion={promptVersion}
        threshold={judgeThreshold}
        summary={summary}
      />

      <JudgeSwitch />

      <LabelDistribution
        labels={distribution}
        total={distributionTotal}
        active={label}
        onSelect={setLabel}
      />

      {/* Only worth showing once the history spans more than one judge — after
          a backend switch, comparing the two is the point. */}
      {roster.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Judge</span>
          <FilterChip active={judge === null} onClick={() => setJudge(null)}>
            All
          </FilterChip>
          {roster.map((entry) => (
            <FilterChip
              key={entry.judge}
              active={judge === entry.judge}
              onClick={() => setJudge(judge === entry.judge ? null : entry.judge)}
            >
              {formatJudgeName(entry.judge)}
              <span className="tabular ml-1.5 text-muted-foreground">{entry.count}</span>
            </FilterChip>
          ))}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Recent verdicts
          {items.length > 0 ? (
            <span className="ml-2 tabular text-xs font-normal text-muted-foreground">
              showing {items.length} of {summary.total}
            </span>
          ) : null}
        </h2>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title={label ? "No verdicts with that label" : "No judgements recorded yet"}
            detail={
              label
                ? "Clear the filter to see every verdict the judge has returned."
                : judgeConfig.isLlm
                  ? "Start a sync and the judge's verdict on every candidate will appear here."
                  : "The Levenshtein judge is active — it produces scores, not labelled verdicts. Switch to the smol judge above to start recording them."
            }
          />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <JudgementRow key={item.id} item={item} threshold={judgeThreshold} />
            ))}
          </ul>
        )}

        {nextCursor != null && !loading ? (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Load older verdicts
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function JudgeHeader({
  backend,
  isLlm,
  model,
  promptVersion,
  threshold,
  summary,
}: {
  backend: string;
  isLlm: boolean;
  model: string | null;
  promptVersion?: string;
  threshold: number;
  summary: JudgementSummary;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/12 px-2.5 py-1 text-sm font-semibold text-primary">
              {isLlm ? <Cpu className="h-4 w-4" aria-hidden /> : <Gauge className="h-4 w-4" aria-hidden />}
              {formatJudgeName(backend)}
            </span>
            {model ? (
              <code className="truncate rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                {model}
              </code>
            ) : null}
            {promptVersion ? (
              <span
                className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
                title="Prompt contract the verdicts were produced under"
              >
                prompt {promptVersion}
              </span>
            ) : null}
          </div>
          <p className="mt-2 max-w-xl text-xs text-muted-foreground">
            {isLlm
              ? "Each candidate filename is shown to the model alongside the Spotify metadata. It answers with one of four labels; only “exact” clears the download threshold."
              : "Candidates are scored by string similarity, which yields a number but no reason. Switch to the smol judge below to have the model label each verdict."}
            <span className="ml-1 whitespace-nowrap">Threshold {Math.round(threshold * 100)}%.</span>
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <HeaderStat label="Judged" value={summary.total.toLocaleString()} />
          <HeaderStat
            label="Accepted"
            value={`${percent(summary.accepted, summary.total)}%`}
            detail={`${summary.accepted.toLocaleString()} candidates`}
          />
          <HeaderStat
            label="Latency"
            value={formatLatency(summary.avgLatencyMs)}
            detail={`p95 ${formatLatency(summary.p95LatencyMs)}`}
            Icon={Timer}
          />
          <HeaderStat
            label="Errors"
            value={summary.errors.toLocaleString()}
            detail={summary.errors > 0 ? "fell back" : undefined}
            tone={summary.errors > 0 ? "danger" : undefined}
            Icon={summary.errors > 0 ? AlertTriangle : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function HeaderStat({
  label,
  value,
  detail,
  tone,
  Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "danger";
  Icon?: typeof Timer;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
        {label}
      </p>
      <p
        className={cn(
          "tabular text-lg font-semibold tracking-tight",
          tone === "danger" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>
      {detail ? <p className="tabular text-[0.7rem] text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

/**
 * The verdict mix as one bar, doubling as the label filter.
 *
 * A pipeline that rejects 80% of what it finds is working correctly; one that
 * rejects 80% as "different" when the searches looked right is not. The shape
 * of this bar is the fastest way to tell those apart.
 */
function LabelDistribution({
  labels,
  total,
  active,
  onSelect,
}: {
  labels: JudgementSummary["labels"];
  total: number;
  active: string | null;
  onSelect: (label: string | null) => void;
}) {
  const known = LABEL_ORDER.map((key) => ({
    key,
    meta: LABEL_META[key],
    count: labels.find((entry) => entry.label === key)?.count ?? 0,
  }));
  const hasAny = total > 0;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Verdict mix</p>
        {active ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Clear filter
          </button>
        ) : null}
      </div>

      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        {hasAny
          ? known
              .filter((entry) => entry.count > 0)
              .map((entry) => (
                <div
                  key={entry.key}
                  className={cn("h-full", TONE_SOLID[entry.meta.tone])}
                  style={{ width: `${(entry.count / total) * 100}%` }}
                  title={`${entry.meta.label}: ${entry.count}`}
                />
              ))
          : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {known.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => onSelect(active === entry.key ? null : entry.key)}
            title={entry.meta.detail}
            className={cn(
              "group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active === entry.key
                ? "border-foreground/30 bg-muted"
                : "border-border hover:bg-muted/50",
            )}
          >
            <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE_SOLID[entry.meta.tone])} aria-hidden />
            <span className="text-xs font-medium text-foreground">{entry.meta.label}</span>
            <span className="tabular text-xs text-muted-foreground">
              {entry.count.toLocaleString()}
              {hasAny ? ` · ${percent(entry.count, total)}%` : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-foreground/30 bg-muted text-foreground" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

const baseName = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() ?? path;

function JudgementRow({ item, threshold }: { item: JudgementFeedItem; threshold: number }) {
  const [open, setOpen] = useState(false);
  const meta = labelMeta(item.label);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.filename);
      toast.success("Filename copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <JudgementBadge label={item.label} error={item.error} className="shrink-0" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {item.title}
            <span className="ml-1.5 font-normal text-muted-foreground">{item.artist}</span>
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground" title={item.filename}>
            {baseName(item.filename)}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-4 sm:flex">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Peer">
            <User className="h-3 w-3" aria-hidden />
            <span className="max-w-[7rem] truncate font-mono">{item.username}</span>
          </span>
          <span
            className={cn(
              "tabular w-10 text-right text-xs font-medium",
              item.score >= threshold ? "text-success" : "text-muted-foreground",
            )}
            title={`Score ${item.score.toFixed(2)} · threshold ${threshold.toFixed(2)}`}
          >
            {Math.round(item.score * 100)}%
          </span>
          <span className="tabular w-14 text-right text-xs text-muted-foreground" title="Judge latency">
            {formatLatency(item.latencyMs)}
          </span>
          <span className="tabular w-16 text-right text-xs text-muted-foreground">
            {formatAge(item.createdAt)}
          </span>
        </div>

        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border bg-muted/20 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-foreground">
              {item.filename}
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

          {meta ? <p className="text-xs text-muted-foreground">{meta.detail}</p> : null}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
            <Detail term="Judge" value={formatJudgeName(item.judge)} />
            <Detail term="Model" value={item.model ?? "—"} mono />
            <Detail term="Album" value={item.album || "—"} />
            <Detail term="Peer" value={item.username} mono />
            <Detail term="Score" value={item.score.toFixed(2)} />
            <Detail term="Latency" value={formatLatency(item.latencyMs)} />
            <Detail term="Prompt" value={item.promptVersion ?? "—"} mono />
            <Detail term="Submission" value={`#${item.submissionId}`} mono />
          </dl>

          {item.raw ? (
            <div>
              <p className="mb-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                Model reply
                {/* The two numbers can differ, and that is deliberate: the score
                    the pipeline acts on is derived from the label, so a garbled
                    number in the reply cannot flip a download decision. */}
                <span className="ml-2 normal-case tracking-normal opacity-80">
                  the score above comes from the label, not from this number
                </span>
              </p>
              <pre className="overflow-x-auto rounded-lg bg-background p-2.5 font-mono text-xs text-foreground scrollbar-thin">
                {item.raw}
              </pre>
            </div>
          ) : null}

          {item.error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Judge failed — a fallback score was used. {item.error}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function Detail({ term, value, mono }: { term: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{term}</dt>
      <dd className={cn("truncate text-foreground", mono && "font-mono")} title={value}>
        {value}
      </dd>
    </div>
  );
}
