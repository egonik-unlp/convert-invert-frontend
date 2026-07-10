import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_FG, type Tone } from "@/lib/status";

interface StatCardProps {
  label: string;
  value: ReactNode;
  Icon: LucideIcon;
  tone?: Tone;
  hint?: string;
}

export function StatCard({ label, value, Icon, tone = "muted", hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", TONE_FG[tone])} aria-hidden />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="tabular text-2xl font-semibold tracking-tight text-foreground">{value}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}
