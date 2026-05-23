import { Track, TrackStatus } from "@/types";

export function useTrackStage(track: Track) {
  const status = track.status;
  const failed = status === TrackStatus.FAILED;
  const completed = status === TrackStatus.COMPLETED;
  const downloading = status === TrackStatus.DOWNLOADING;
  const finalizing = status === TrackStatus.FINALIZING;

  const stages = [
    { key: "search", label: "Search", active: true, current: status === TrackStatus.SEARCHING },
    {
      key: "judge",
      label: "Judge",
      active: [TrackStatus.FILTERING, TrackStatus.DOWNLOADING, TrackStatus.FINALIZING, TrackStatus.COMPLETED].includes(status),
      current: status === TrackStatus.FILTERING,
    },
    {
      key: "transfer",
      label: "Transfer",
      active: downloading || finalizing || completed,
      current: downloading,
    },
    { key: "library", label: "Library", active: completed, current: finalizing },
  ];

  return { stages, failed, completed, downloading, finalizing };
}
