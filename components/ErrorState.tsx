import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** What happened and what to do: the message, and a retry button when one helps. */
export function ErrorState({ message, retryLabel, onRetry, className }: { message: string; retryLabel?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-start gap-2 py-8 text-sm", className)}>
      <p className="max-w-md text-foreground">{message}</p>
      {onRetry && retryLabel ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
