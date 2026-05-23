import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppConfig } from "@/hooks/useAppConfig";
import { Candidate, Track } from "@/types";

interface CandidateDetailModalProps {
  candidate: Candidate | null;
  track: Track;
  onClose: () => void;
}

const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({ candidate, track, onClose }) => {
  const { judgeThreshold } = useAppConfig();

  return (
    <Dialog open={!!candidate} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        {candidate && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" aria-hidden="true" />
                Candidate inspection
              </DialogTitle>
              <DialogDescription>{track.title} by {track.artist}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-background/50 p-4">
                  <p className="text-xs text-muted-foreground">Submission ID</p>
                  <p className="mt-1 font-mono text-sm text-primary">JS-{candidate.id}</p>
                </div>
                <div className="rounded-lg border bg-background/50 p-4">
                  <p className="text-xs text-muted-foreground">File Source ID</p>
                  <p className="mt-1 font-mono text-sm text-secondary">DLF-{candidate.fileId}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs text-muted-foreground">Full path</p>
                <div className="rounded-lg border bg-background p-4 font-mono text-xs leading-relaxed text-muted-foreground">{candidate.filename}</div>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p className="text-sm font-medium">{candidate.username}</p>
                </div>
                <Badge variant={candidate.score >= judgeThreshold ? "default" : "outline"}>
                  {Math.round(candidate.score * 100)}%
                </Badge>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button>Manual Select</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CandidateDetailModal;
