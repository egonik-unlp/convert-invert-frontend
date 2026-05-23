import { Activity, CheckCircle2, Download, ListMusic, Search, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GlobalStats } from "@/types";

const metrics = [
  { key: "totalTracks", label: "Total", icon: ListMusic },
  { key: "pending", label: "Pending", icon: Activity },
  { key: "downloading", label: "Downloading", icon: Download },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
  { key: "failed", label: "Rejected", icon: XCircle },
] as const;

const StatsHeader: React.FC<{ stats: GlobalStats }> = ({ stats }) => (
  <header className="shrink-0 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.key} className="border-border/80 bg-card/70">
              <CardContent className="flex items-center gap-3 p-3">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="font-mono text-lg font-semibold">{stats[metric.key]}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="relative w-full xl:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input className="pl-9" placeholder="Search tracks" type="search" />
      </div>
    </div>
  </header>
);

export default StatsHeader;
