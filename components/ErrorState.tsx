import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive-foreground">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Request failed</p>
          <p className="mt-1 break-words text-muted-foreground">{message}</p>
        </div>
        {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>}
      </div>
    </div>
  );
}
