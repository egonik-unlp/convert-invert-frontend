import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-r-transparent", className)}
    />
  );
}
