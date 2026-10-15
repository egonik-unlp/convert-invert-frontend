import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ title, detail, action, className }: { title: string; detail?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-1 py-10 text-sm", className)}>
      <p className="text-foreground">{title}</p>
      {detail ? <p className="max-w-md text-muted-foreground">{detail}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
