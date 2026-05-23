import React, { useState, useMemo } from "react";
import { 
  Music, 
  Search, 
  Copy, 
  Check, 
  HardDrive, 
  Disc, 
  Calendar, 
  ArrowUpDown, 
  RefreshCw, 
  FileAudio,
  SlidersHorizontal
} from "lucide-react";
import { DownloadedFile } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface DownloadsBrowserProps {
  downloads: DownloadedFile[];
  loading: boolean;
  onRefresh: () => void;
}

export const DownloadsBrowser: React.FC<DownloadsBrowserProps> = ({ 
  downloads, 
  loading, 
  onRefresh 
}) => {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "mp3" | "flac">("all");
  const [sortBy, setSortBy] = useState<"date" | "size" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const getHumanSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Calculate Statistics
  const stats = useMemo(() => {
    const totalFiles = downloads.length;
    const totalSize = downloads.reduce((acc, f) => acc + f.size, 0);
    const flacCount = downloads.filter((f) => f.name.toLowerCase().endsWith(".flac")).length;
    const mp3Count = downloads.filter((f) => f.name.toLowerCase().endsWith(".mp3")).length;

    return {
      totalFiles,
      totalSize: getHumanSize(totalSize),
      flacCount,
      mp3Count,
    };
  }, [downloads]);

  // Filter and Sort Data
  const filteredAndSorted = useMemo(() => {
    let result = [...downloads];

    // Filter by search
    if (search.trim() !== "") {
      const q = search.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }

    // Filter by type
    if (filterType !== "all") {
      result = result.filter((f) => f.name.toLowerCase().endsWith(`.${filterType}`));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "size") {
        comparison = a.size - b.size;
      } else if (sortBy === "date") {
        comparison = a.modified - b.modified;
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });

    return result;
  }, [downloads, search, filterType, sortBy, sortOrder]);

  const toggleSort = (field: "date" | "size" | "name") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc"); // default is descending
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Statistics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border bg-card/45 backdrop-blur-sm transition-all duration-300 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Music className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Tracks</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight">{loading ? <Skeleton className="h-8 w-16" /> : stats.totalFiles}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border bg-card/45 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/25 hover:shadow-lg hover:shadow-cyan-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                <HardDrive className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cumulative Size</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight">{loading ? <Skeleton className="h-8 w-24" /> : stats.totalSize}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border bg-card/45 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Disc className="h-6 w-6 animate-spin-slow" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lossless (FLAC)</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight">{loading ? <Skeleton className="h-8 w-16" /> : stats.flacCount}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border bg-card/45 backdrop-blur-sm transition-all duration-300 hover:border-violet-500/25 hover:shadow-lg hover:shadow-violet-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <FileAudio className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compressed (MP3)</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight">{loading ? <Skeleton className="h-8 w-16" /> : stats.mp3Count}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Controls Panel */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card/30 p-4 backdrop-blur-sm md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search completed downloads by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50 border-input/60 focus-visible:ring-primary/45"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex rounded-lg border bg-background/40 p-1">
            <Button
              variant={filterType === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterType("all")}
              className="h-8 text-xs px-3 rounded-md"
            >
              All Types
            </Button>
            <Button
              variant={filterType === "flac" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterType("flac")}
              className="h-8 text-xs px-3 rounded-md text-cyan-400"
            >
              FLAC
            </Button>
            <Button
              variant={filterType === "mp3" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterType("mp3")}
              className="h-8 text-xs px-3 rounded-md text-emerald-400"
            >
              MP3
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            className="h-9 w-9 bg-background/50"
            title="Refresh downloads list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 3. Main File Browser Table */}
      <div className="overflow-hidden rounded-xl border bg-card/25 backdrop-blur-sm">
        {loading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border-dashed rounded-xl m-2 border-muted">
            <SlidersHorizontal className="h-10 w-10 text-muted-foreground/60 mb-3" />
            <h4 className="font-semibold text-lg">No downloaded tracks match filters</h4>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Try adjusting your search query, selecting "All Types" or verify files are active in your storage directory.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-4 px-5">
                    <button 
                      onClick={() => toggleSort("name")}
                      className="flex items-center gap-1.5 hover:text-foreground"
                    >
                      Track File Name
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-4 px-5 w-28">Format</th>
                  <th className="py-4 px-5 w-36">
                    <button 
                      onClick={() => toggleSort("size")}
                      className="flex items-center gap-1.5 hover:text-foreground"
                    >
                      File Size
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-4 px-5 w-52">
                    <button 
                      onClick={() => toggleSort("date")}
                      className="flex items-center gap-1.5 hover:text-foreground"
                    >
                      Modified Time
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-4 px-5 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredAndSorted.map((file, idx) => {
                  const isFlac = file.name.toLowerCase().endsWith(".flac");
                  const isMp3 = file.name.toLowerCase().endsWith(".mp3");
                  
                  return (
                    <tr 
                      key={idx} 
                      className="group transition-colors duration-150 hover:bg-muted/15"
                    >
                      <td className="py-3 px-5 font-medium">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            isFlac ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                            isMp3 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                            "bg-primary/10 border-primary/20 text-primary"
                          }`}>
                            <FileAudio className="h-4.5 w-4.5" />
                          </div>
                          <span className="font-mono text-xs break-all leading-relaxed select-all">
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          isFlac ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                          isMp3 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          "bg-muted border-muted text-muted-foreground"
                        }`}>
                          {isFlac ? "FLAC" : isMp3 ? "MP3" : "AUDIO"}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-muted-foreground font-medium">
                        {getHumanSize(file.size)}
                      </td>
                      <td className="py-3 px-5 text-muted-foreground text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {file.modified > 0 
                            ? new Date(file.modified * 1000).toLocaleString() 
                            : "Unknown"
                          }
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(file.name, idx)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                          title="Copy file name to clipboard"
                        >
                          {copiedIndex === idx ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="text-right text-xs text-muted-foreground font-medium">
        Showing {filteredAndSorted.length} of {downloads.length} completed tracks.
      </div>
    </div>
  );
};
