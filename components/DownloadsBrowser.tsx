import { useMemo, useState } from "react";
import { ArrowUpDown, Check, Copy, Disc3, FileAudio, HardDrive, Music, RotateCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { TONE_SOFT } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { DownloadedFile } from "@/types";

interface DownloadsBrowserProps {
  downloads: DownloadedFile[];
  loading: boolean;
  onRefresh: () => void;
}

type SortKey = "date" | "size" | "name";
type FormatFilter = "all" | "flac" | "mp3";

function humanSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${parseFloat((bytes / 1024 ** i).toFixed(2))} ${units[i]}`;
}

function ext(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function formatTone(name: string): keyof typeof TONE_SOFT {
  const e = ext(name);
  if (e === "flac" || e === "wav" || e === "aiff") return "info";
  if (e === "mp3") return "success";
  return "muted";
}

export function DownloadsBrowser({ downloads, loading, onRefresh }: DownloadsBrowserProps) {
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState<FormatFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [desc, setDesc] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalSize = downloads.reduce((sum, f) => sum + f.size, 0);
    const flac = downloads.filter((f) => ext(f.name) === "flac").length;
    const mp3 = downloads.filter((f) => ext(f.name) === "mp3").length;
    return { count: downloads.length, size: humanSize(totalSize), flac, mp3 };
  }, [downloads]);

  const rows = useMemo(() => {
    let result = downloads;
    const q = search.trim().toLowerCase();
    if (q) result = result.filter((f) => f.name.toLowerCase().includes(q));
    if (format !== "all") result = result.filter((f) => ext(f.name) === format);
    const sorted = [...result].sort((a, b) => {
      const cmp =
        sortBy === "name" ? a.name.localeCompare(b.name) : sortBy === "size" ? a.size - b.size : a.modified - b.modified;
      return desc ? -cmp : cmp;
    });
    return sorted;
  }, [downloads, search, format, sortBy, desc]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setDesc((d) => !d);
    else {
      setSortBy(key);
      setDesc(true);
    }
  };

  const copy = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      setCopied(name);
      toast.success("Filename copied");
      window.setTimeout(() => setCopied((current) => (current === name ? null : current)), 1800);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const formats: FormatFilter[] = ["all", "flac", "mp3"];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Files" value={loading ? "—" : stats.count} Icon={Music} tone="primary" />
        <StatCard label="Total size" value={loading ? "—" : stats.size} Icon={HardDrive} tone="info" />
        <StatCard label="Lossless" value={loading ? "—" : stats.flac} Icon={Disc3} tone="info" hint="FLAC" />
        <StatCard label="Compressed" value={loading ? "—" : stats.mp3} Icon={FileAudio} tone="success" hint="MP3" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search downloads by filename…"
            className="pl-9"
            aria-label="Search downloads"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {formats.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormat(value)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  format === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "all" ? "All" : value.toUpperCase()}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading} aria-label="Refresh downloads" title="Refresh">
            <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileAudio}
          title={downloads.length === 0 ? "No downloads yet" : "No files match your filters"}
          detail={
            downloads.length === 0
              ? "Completed transfers appear here once a run finishes downloading tracks."
              : "Try a different search term or the “All” format filter."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden items-center gap-4 border-b border-border bg-muted/30 px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground sm:flex">
            <button type="button" onClick={() => toggleSort("name")} className="flex flex-1 items-center gap-1 hover:text-foreground">
              File name <ArrowUpDown className="h-3 w-3" aria-hidden />
            </button>
            <span className="w-16">Format</span>
            <button type="button" onClick={() => toggleSort("size")} className="flex w-24 items-center gap-1 hover:text-foreground">
              Size <ArrowUpDown className="h-3 w-3" aria-hidden />
            </button>
            <button type="button" onClick={() => toggleSort("date")} className="flex w-44 items-center gap-1 hover:text-foreground">
              Modified <ArrowUpDown className="h-3 w-3" aria-hidden />
            </button>
            <span className="w-8" />
          </div>
          <ul className="max-h-[calc(100vh-22rem)] divide-y divide-border overflow-y-auto scrollbar-thin">
            {rows.map((file) => (
              <li key={file.name} className="group flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-muted/40">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FileAudio className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate font-mono text-xs text-foreground" title={file.name}>
                    {file.name}
                  </span>
                </div>
                <span className={cn("hidden w-16 shrink-0 sm:block", "text-center")}>
                  <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", TONE_SOFT[formatTone(file.name)])}>
                    {ext(file.name).toUpperCase() || "—"}
                  </span>
                </span>
                <span className="tabular hidden w-24 shrink-0 text-xs text-muted-foreground sm:block">{humanSize(file.size)}</span>
                <span className="hidden w-44 shrink-0 text-xs text-muted-foreground md:block">
                  {file.modified > 0 ? new Date(file.modified * 1000).toLocaleString() : "Unknown"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copy(file.name)}
                  className="h-8 w-8 shrink-0 text-muted-foreground opacity-60 transition-opacity hover:text-foreground group-hover:opacity-100"
                  aria-label={`Copy ${file.name}`}
                  title="Copy filename"
                >
                  {copied === file.name ? <Check className="h-4 w-4 text-success" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-right text-xs text-muted-foreground">
        Showing {rows.length} of {downloads.length} completed files
      </p>
    </div>
  );
}
