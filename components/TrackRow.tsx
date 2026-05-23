import { AlertCircle, CheckCircle2, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTrackStage } from "@/hooks/useTrackStage";
import { Track } from "@/types";
import { cn } from "@/lib/utils";

interface TrackRowProps {
  track: Track;
  onClick: () => void;
}

const TrackRow: React.FC<TrackRowProps> = ({ track, onClick }) => {
  const { stages, failed, completed, downloading, finalizing } = useTrackStage(track);
  const showTransferProgress = downloading || finalizing;
  const transferLabel = track.downloadStatus?.replace(/_/g, " ") || (finalizing ? "finalizing" : "downloading");

  return (
    <TableRow
      onClick={onClick}
      className="cursor-pointer border-border/80 bg-card/50 hover:bg-muted/30"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onClick();
      }}
    >
      <TableCell className="w-[42%]">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background", failed ? "text-destructive" : "text-primary")}>
            {failed ? <AlertCircle className="h-5 w-5" aria-hidden="true" /> : completed ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <Music2 className="h-5 w-5" aria-hidden="true" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{track.title}</p>
            <p className="truncate text-xs text-muted-foreground">{track.filename || track.artist}</p>
            {track.username && <p className="truncate text-[11px] text-muted-foreground">Peer: {track.username}</p>}
          </div>
        </div>
      </TableCell>

      <TableCell className="hidden lg:table-cell">
        <div className="flex items-center gap-2">
          {stages.map((stage) => (
            <Badge key={stage.key} variant={stage.current ? "default" : stage.active ? "secondary" : "outline"} className="text-[10px]">
              {stage.label}
            </Badge>
          ))}
        </div>
      </TableCell>

      <TableCell className="w-44">
        {showTransferProgress ? (
          <div className="space-y-2">
            <Progress value={track.progress} />
            <div className="flex items-center justify-between gap-2 font-mono text-xs text-muted-foreground">
              <span>{track.progress}%</span>
              <span className="truncate capitalize">{transferLabel}</span>
            </div>
          </div>
        ) : (
          <span className="font-mono text-sm">{track.score ? `${Math.round(track.score * 100)}%` : "--"}</span>
        )}
      </TableCell>

      <TableCell className="w-40 text-right">
        {failed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="max-w-36 truncate">{track.rejectReason || "Failed"}</Badge>
              </TooltipTrigger>
              <TooltipContent>{track.rejectReason || "Threshold mismatch"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Badge variant={completed ? "secondary" : "outline"}>{track.status}</Badge>
        )}
      </TableCell>
    </TableRow>
  );
};

export default TrackRow;
