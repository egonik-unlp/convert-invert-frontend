import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppConfig } from "@/hooks/useAppConfig";
import { Candidate, Track } from "@/types";
import { api } from "@/lib/api-client";
import CandidateDetailModal from "./CandidateDetailModal";

interface SimilarityModalProps {
  track: Track | null;
  onClose: () => void;
}

const SimilarityModal: React.FC<SimilarityModalProps> = ({ track, onClose }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const { judgeThreshold } = useAppConfig();

  useEffect(() => {
    if (!track) {
      setCandidates([]);
      return;
    }

    setCandidates([]);
    setLoading(true);
    api.getCandidates(track.id)
      .then(setCandidates)
      .catch((err) => console.error("Failed to load candidates", err))
      .finally(() => setLoading(false));
  }, [track]);

  return (
    <>
      <Dialog open={!!track} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[86vh] max-w-5xl overflow-hidden p-0">
          {track && (
            <>
              <DialogHeader className="border-b p-6">
                <DialogTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" aria-hidden="true" />
                  {track.title}
                </DialogTitle>
                <DialogDescription>Candidate matching log for database ID {track.id}</DialogDescription>
              </DialogHeader>

              <div className="max-h-[55vh] overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-12 border-b pb-3 text-xs font-medium text-muted-foreground">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-2">User</div>
                  <div className="col-span-7">Candidate filename</div>
                  <div className="col-span-2 text-right">Similarity</div>
                </div>

                <div className="mt-3 space-y-2">
                  {loading && Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}
                  {!loading && candidates.map((candidate, index) => (
                    <button
                      key={candidate.id}
                      onClick={() => setSelectedCandidate(candidate)}
                      className="grid w-full grid-cols-12 items-center rounded-lg border bg-card/60 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                    >
                      <div className="col-span-1 font-mono text-xs text-muted-foreground">#{index + 1}</div>
                      <div className="col-span-2 truncate text-xs font-medium text-primary">{candidate.username}</div>
                      <div className="col-span-7 truncate pr-4 font-mono text-xs text-muted-foreground">{candidate.filename}</div>
                      <div className="col-span-2 text-right">
                        <Badge variant={candidate.score >= judgeThreshold ? "default" : "outline"}>
                          {Math.round(candidate.score * 100)}%
                        </Badge>
                      </div>
                    </button>
                  ))}
                  {!loading && candidates.length === 0 && (
                    <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No candidate metadata found for this track.</div>
                  )}
                </div>
              </div>

              <DialogFooter className="border-t p-6">
                <div className="mr-auto text-xs text-muted-foreground">
                  Match threshold: <span className="font-mono text-foreground">{Math.round(judgeThreshold * 100)}%</span>
                </div>
                <Button variant="outline">Manual Override</Button>
                <Button>Force Reprocess</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {track && <CandidateDetailModal candidate={selectedCandidate} track={track} onClose={() => setSelectedCandidate(null)} />}
    </>
  );
};

export default SimilarityModal;
