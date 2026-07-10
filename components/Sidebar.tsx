import { Radio, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, type View } from "@/lib/nav";
import type { NetworkStats } from "@/types";

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  network: NetworkStats;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ currentView, onNavigate, network, mobileOpen, onCloseMobile }: SidebarProps) {
  const connected = network.status === "CONNECTED";

  const go = (view: View) => {
    onNavigate(view);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground",
          "transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Primary"
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Waves className="h-[1.1rem] w-[1.1rem]" aria-hidden />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[0.95rem] font-semibold tracking-tight text-foreground">SyncDash</span>
            <span className="mt-1 text-[0.7rem] text-muted-foreground">Soulseek bridge</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          {NAV.map((item) => {
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={active ? "page" : undefined}
                title={item.hint}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.Icon
                  className={cn(
                    "h-[1.1rem] w-[1.1rem] shrink-0",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-accent-foreground",
                  )}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg bg-card/60 px-3 py-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
              {connected ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
              ) : null}
              <span
                className={cn(
                  "relative inline-flex h-2.5 w-2.5 rounded-full",
                  connected ? "bg-success" : "bg-muted-foreground",
                )}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{connected ? "Connected" : "Offline"}</p>
              <p className="truncate font-mono text-[0.7rem] text-muted-foreground">{network.user || "—"}</p>
            </div>
            <Radio className={cn("h-4 w-4 shrink-0", connected ? "text-success" : "text-muted-foreground")} aria-hidden />
          </div>
        </div>
      </aside>
    </>
  );
}
