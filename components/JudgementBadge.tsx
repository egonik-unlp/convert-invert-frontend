import { AlertTriangle } from "lucide-react";
import { labelMeta } from "@/lib/judgement";
import { TONE_SOFT } from "@/lib/status";
import { cn } from "@/lib/utils";

interface JudgementBadgeProps {
  label?: string;
  /** Set when the judge failed; the badge says so rather than showing a verdict. */
  error?: string;
  className?: string;
  showIcon?: boolean;
}

/**
 * A verdict as a pill. Falls back to "unjudged" so a candidate scored before the
 * LLM judge was switched on still renders honestly, instead of borrowing a label
 * it was never given.
 */
export function JudgementBadge({ label, error, className, showIcon = true }: JudgementBadgeProps) {
  if (error) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
          TONE_SOFT.danger,
          className,
        )}
        title={error}
      >
        {showIcon ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> : null}
        Judge failed
      </span>
    );
  }

  const meta = labelMeta(label);
  if (!meta) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
          TONE_SOFT.muted,
          className,
        )}
        title="No labelled verdict — scored by a judge that only produces a number."
      >
        Unlabelled
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_SOFT[meta.tone],
        className,
      )}
      title={meta.detail}
    >
      {showIcon ? <meta.Icon className="h-3.5 w-3.5" aria-hidden /> : null}
      {meta.label}
    </span>
  );
}
