import { BarChart3, Download, History, ListMusic, Radio, Settings, ShieldX, Terminal, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NetworkStats } from "@/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  network: NetworkStats;
  currentView: string;
  onViewChange: (view: any) => void;
}

const navItems = [
  { id: "dashboard", icon: BarChart3, label: "Dashboard" },
  { id: "playlists", icon: ListMusic, label: "Playlists" },
  { id: "downloads", icon: Download, label: "Downloads" },
  { id: "rejected", icon: ShieldX, label: "Rejected" },
  { id: "history", icon: History, label: "History" },
  { id: "logs", icon: Terminal, label: "System Logs" },
  { id: "settings", icon: Settings, label: "Diagnostics" },
];

const Sidebar: React.FC<SidebarProps> = ({ network, currentView, onViewChange }) => {
  return (
    <TooltipProvider>
      <aside className="flex w-16 shrink-0 flex-col border-r bg-card/70 md:w-64">
        <div className="flex h-16 items-center gap-3 border-b px-3 md:px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Waves className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-base font-semibold leading-none">SyncDash</h1>
            <p className="mt-1 text-xs text-muted-foreground">Convert Invert</p>
          </div>
        </div>

        <nav aria-label="Primary" className="flex-1 space-y-1 p-2 md:p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            const button = (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-center md:justify-start",
                  active && "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
                )}
                aria-label={item.label}
                onClick={() => onViewChange(item.id)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">{item.label}</span>
              </Button>
            );

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right" className="md:hidden">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <div className="hidden rounded-lg border bg-background/40 p-4 md:block">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", network.status === "CONNECTED" ? "bg-emerald-400" : "bg-destructive")} />
              <span className="text-xs font-medium">Soulseek</span>
            </div>
            <p className="mt-3 truncate text-xs text-muted-foreground">Session: {network.user}</p>
            <p className="mt-1 truncate font-mono text-xs text-primary">{network.node}</p>
          </div>
          <div className="flex justify-center md:hidden">
            <Radio className={cn("h-4 w-4", network.status === "CONNECTED" ? "text-emerald-400" : "text-destructive")} aria-label={network.status} />
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;
