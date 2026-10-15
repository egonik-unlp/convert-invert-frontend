import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { data } from "@/lib/data";
import { useFormat, useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import type { DownloadedFile } from "@/types";

interface Folder {
  name: string | null;
  files: DownloadedFile[];
  size: number;
}

/** Downloaded files on disk, grouped by folder, with a name filter and a .zip per folder. */
export function FilesView() {
  const t = useT();
  const format = useFormat();
  const [files, setFiles] = useState<DownloadedFile[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    data
      .getDownloads()
      .then((next) => !cancelled && setFiles(next))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const folders = useMemo<Folder[]>(() => {
    const q = filter.trim().toLowerCase();
    const byFolder = new Map<string | null, DownloadedFile[]>();
    for (const file of files ?? []) {
      if (q && !file.name.toLowerCase().includes(q) && !(file.folder ?? "").toLowerCase().includes(q)) continue;
      const key = file.folder ?? null;
      byFolder.set(key, [...(byFolder.get(key) ?? []), file]);
    }
    return [...byFolder.entries()]
      .map(([name, list]) => ({ name, files: list.sort((a, b) => a.name.localeCompare(b.name)), size: list.reduce((sum, f) => sum + f.size, 0) }))
      .sort((a, b) => (a.name === null ? 1 : b.name === null ? -1 : a.name.localeCompare(b.name)));
  }, [files, filter]);

  const totalSize = (files ?? []).reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="px-4 pb-16 pt-6 md:px-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.01em]">{t.files.title}</h1>
          {files ? <p className="mt-1 text-xs text-muted-foreground">{t.files.summary(files.length, format.size(totalSize))}</p> : null}
        </div>
        <label className="relative block w-full max-w-[16rem]">
          <span className="sr-only">{t.files.filter}</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={t.files.filter}
            className="h-[30px] w-full rounded-md border border-line bg-transparent pl-[29px] pr-2.5 text-[12.5px] outline-none placeholder:text-faint focus:border-muted-foreground"
          />
        </label>
      </div>

      {error ? (
        <ErrorState message={t.files.loadError} retryLabel={t.common.retry} onRetry={() => setAttempt((n) => n + 1)} />
      ) : !files ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <EmptyState title={t.files.empty} />
      ) : folders.length === 0 ? (
        <EmptyState title={t.files.noMatch} />
      ) : (
        <div className="mt-5 space-y-6">
          {folders.map((folder) => (
            <section key={folder.name ?? ""}>
              <div className="flex items-center gap-3 border-b border-line pb-1.5">
                <h2 className="min-w-0 flex-1 truncate font-medium">{folder.name ?? t.files.loose}</h2>
                <span className="tabular shrink-0 text-xs text-muted-foreground">{t.files.summary(folder.files.length, format.size(folder.size))}</span>
                {folder.name ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={data.folderZipUrl(folder.name)} download aria-label={t.files.zipFolder(folder.name)}>
                      {t.files.zip}
                    </a>
                  </Button>
                ) : null}
              </div>
              <ul>
                {folder.files.map((file) => (
                  <li key={file.name} className="group flex h-8 items-center gap-3 rounded-md px-1 hover:bg-hover">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs" title={file.name}>
                      {file.name}
                    </span>
                    <span className="tabular hidden shrink-0 text-xs text-muted-foreground sm:block">{format.size(file.size)}</span>
                    <a
                      href={data.fileDownloadUrl(file.name, file.folder)}
                      download
                      aria-label={t.files.download(file.name)}
                      title={t.files.download(file.name)}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-60 hover:bg-raised hover:text-foreground group-hover:opacity-100"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
