import {
  DownloadCloud,
  LayoutDashboard,
  ListMusic,
  Music4,
  Server,
  Terminal,
  type LucideIcon,
} from "lucide-react";

export type View = "overview" | "library" | "playlists" | "downloads" | "diagnostics" | "logs";

export interface NavItem {
  id: View;
  label: string;
  Icon: LucideIcon;
  hint: string;
}

export const NAV: NavItem[] = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard, hint: "Run health at a glance" },
  { id: "library", label: "Library", Icon: ListMusic, hint: "Every track and its stage" },
  { id: "playlists", label: "Playlists", Icon: Music4, hint: "Start a Spotify sync" },
  { id: "downloads", label: "Downloads", Icon: DownloadCloud, hint: "Completed audio files" },
  { id: "diagnostics", label: "Diagnostics", Icon: Server, hint: "Workers and tuning" },
  { id: "logs", label: "Logs", Icon: Terminal, hint: "Live telemetry" },
];

export const VIEW_IDS: View[] = NAV.map((item) => item.id);

export function isView(value: string): value is View {
  return (VIEW_IDS as string[]).includes(value);
}
