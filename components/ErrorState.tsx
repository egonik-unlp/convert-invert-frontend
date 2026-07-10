import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message, title = "Request failed", onRetry, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/12 text-destructive">
        <TriangleAlert className="h-5 w-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mx-auto max-w-md break-words text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="h-4 w-4" aria-hidden />
          Retry
        </Button>
      ) : null}
    </div>
  );
}
