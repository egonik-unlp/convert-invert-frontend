import { memo } from "react";
import { AlertTriangle, ArrowDown, Check, Clock, X } from "lucide-react";
import type { TrackStatus } from "@/lib/api-client";
import { useT, type Dict } from "@/lib/i18n";
import { scorePct, verdictLabel } from "@/lib/judgement";
import { Spinner } from "@/components/Spinner";
import { cn } from "@/lib/utils";

/** What a screen reader hears for a song's state: "Descargada, Es esta, 94". */
export function statusText(t: Dict, status: TrackStatus): string {
  switch (status.state) {
    case "owned": {
      const parts = [t.status.owned];
      if (status.judging?.label) parts.push(verdictLabel(t, status.judging.label));
      if (status.judging?.score != null) parts.push(String(scorePct(status.judging.score)));
      if (status.judging?.uncertain) parts.push(t.status.uncertain);
      return parts.join(", ");
    }
    case "downloading":
      return `${t.status.downloadingLabel} ${status.progress ?? 0}%`;
    case "missing":
      return t.status.missing;
    case "failed":
      return t.status.failed;
    case "queued":
      return t.status.queued;
    case "searching":
      return t.status.searching;
    case "comparing":
      return t.status.comparing;
  }
}

/**
 * A song's state in a list row. "Falta" turns into "Descargar" and "Falló" into "Ver por qué"
 * on row hover or focus (the row is the `group`).
 */
export const StatusCell = memo(function StatusCell({
  status,
  onDownload,
  onOpen,
  className,
}: {
  status: TrackStatus;
  onDownload: () => void;
  onOpen: () => void;
  className?: string;
}) {
  const t = useT();
  const base = "inline-flex h-7 max-w-full items-center gap-1.5 rounded-md px-1.5 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0";
  const stop = (event: React.MouseEvent | React.KeyboardEvent, action: () => void) => {
    event.stopPropagation();
    action();
  };

  switch (status.state) {
    case "owned": {
      const judging = status.judging;
      return (
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => stop(e, onOpen)}
          className={cn(base, "text-muted-foreground hover:bg-hover hover:text-foreground", className)}
          title={judging?.uncertain ? t.status.uncertain : t.status.owned}
        >
          {judging?.uncertain ? <AlertTriangle className="text-accent" aria-hidden /> : <Check className="text-ok" aria-hidden />}
          <span className="truncate">
            {judging?.label ? verdictLabel(t, judging.label) : t.status.owned}
            {judging?.score != null ? <span className="tabular text-muted-foreground"> · {scorePct(judging.score)}</span> : null}
          </span>
        </button>
      );
    }
    case "missing":
      return (
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => stop(e, onDownload)}
          className={cn(base, "text-muted-foreground hover:bg-accent/10 group-hover:text-accent group-focus-within:text-accent", className)}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-faint group-hover:hidden group-focus-within:hidden" aria-hidden />
          <ArrowDown className="hidden group-hover:block group-focus-within:block" aria-hidden />
          <span className="group-hover:hidden group-focus-within:hidden">{t.status.missing}</span>
          <span className="hidden group-hover:inline group-focus-within:inline">{t.status.download}</span>
        </button>
      );
    case "failed":
      return (
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => stop(e, onOpen)}
          className={cn(base, "text-bad hover:bg-bad/10", className)}
        >
          <X aria-hidden />
          <span className="group-hover:hidden group-focus-within:hidden">{t.status.failed}</span>
          <span className="hidden group-hover:inline group-focus-within:inline">{t.status.why}</span>
        </button>
      );
    case "downloading": {
      const pct = status.progress ?? 0;
      return (
        <span className={cn(base, "text-accent", className)}>
          <span
            className="relative h-[3px] w-10 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t.status.downloadingLabel}
          >
            <span className="absolute inset-y-0 left-0 bg-accent transition-[width]" style={{ width: `${pct}%` }} />
          </span>
          <span className="tabular">{t.status.downloading(pct)}</span>
        </span>
      );
    }
    case "queued":
      return (
        <span className={cn(base, "text-muted-foreground", className)}>
          <Clock aria-hidden />
          {t.status.queued}
        </span>
      );
    case "searching":
    case "comparing":
      return (
        <span className={cn(base, "text-muted-foreground", className)}>
          <Spinner className="text-accent" />
          {status.state === "searching" ? t.status.searching : t.status.comparing}
        </span>
      );
  }
});
