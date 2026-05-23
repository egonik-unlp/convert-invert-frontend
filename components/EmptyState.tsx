import { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-lg border border-dashed bg-card/40 p-8 text-center">
      <Icon className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
