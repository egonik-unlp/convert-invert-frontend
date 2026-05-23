import { Clock, DownloadCloud } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { GlobalStats, NetworkStats } from "@/types";

const GlobalFooter: React.FC<{ stats: GlobalStats; network: NetworkStats }> = ({ stats, network }) => (
  <footer className="sticky bottom-0 z-20 flex h-16 shrink-0 items-center justify-between gap-6 border-t bg-background/90 px-4 backdrop-blur md:px-6">
    <div className="flex min-w-0 flex-1 items-center gap-4">
      <span className="hidden text-xs font-medium uppercase tracking-wide text-muted-foreground md:inline">Global Progress</span>
      <Progress value={stats.globalProgress} className="max-w-md" />
      <span className="font-mono text-xs text-primary">{stats.globalProgress}%</span>
    </div>

    <div className="hidden items-center gap-6 text-xs text-muted-foreground lg:flex">
      <span className="flex items-center gap-2">
        <DownloadCloud className="h-4 w-4 text-primary" aria-hidden="true" />
        {network.totalBandwidth}
      </span>
      <span className="flex items-center gap-2">
        <Clock className="h-4 w-4" aria-hidden="true" />
        {stats.remainingTime}
      </span>
      <span className="font-mono">Node: {network.node}</span>
    </div>
  </footer>
);

export default GlobalFooter;
