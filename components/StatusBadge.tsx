import { cn } from "@/lib/utils";
import { STATUS_META, TONE_SOFT, type Tone } from "@/lib/status";
import { TrackStatus } from "@/types";

interface StatusBadgeProps {
  status: TrackStatus;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  const tone: Tone = meta?.tone ?? "muted";
  const label = meta?.label ?? String(status);
  const Icon = meta?.Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_SOFT[tone],
        className,
      )}
    >
      {showIcon && Icon ? <Icon className={cn("h-3.5 w-3.5", meta?.spin && "animate-spin")} aria-hidden /> : null}
      {label}
    </span>
  );
}
