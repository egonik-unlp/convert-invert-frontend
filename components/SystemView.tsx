import { useCallback, useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ExternalLink, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import type { ActiveDownload, UserAccount } from "@/lib/api-client";
import { data } from "@/lib/data";
import { usePolling } from "@/lib/data/hooks";
import { useFormat, useT } from "@/lib/i18n";
import { SYSTEM_TABS, type SystemTab } from "@/lib/routes";
import { FilesView } from "@/components/FilesView";
import { parseSpotifyResource } from "@/lib/spotify";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/Avatar";
import { ErrorState } from "@/components/ErrorState";
import { JudgeSwitch } from "@/components/JudgeSwitch";
import { Spinner } from "@/components/Spinner";
import { menuContent, menuItem } from "@/components/collection/CollectionMenu";
import { useApp } from "@/components/shell/AppContext";
import type { LogEntry, WorkerInfo } from "@/types";
import { cn } from "@/lib/utils";

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Admin only: people, workers, the judge and the logs. */
export function SystemView({ tab }: { tab: SystemTab }) {
  const t = useT();
  const { navigate } = useApp();
  return (
    <div className="px-4 pb-16 pt-6 md:px-7">
      <h1 className="text-xl font-semibold tracking-[-0.01em]">{t.system.title}</h1>
      <p className="mt-1 text-xs text-muted-foreground">{t.system.subtitle}</p>
      <div role="tablist" aria-label={t.system.title} className="mt-4 flex gap-0.5 border-b border-line pb-2">
        {SYSTEM_TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => navigate(`/system/${key}`, { replace: true })}
            className={cn("rounded-sm px-2 py-1 text-xs text-muted-foreground hover:text-foreground", tab === key && "bg-raised text-foreground")}
          >
            {t.system.tabs[key]}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-4">
        {tab === "people" ? (
          <People />
        ) : tab === "workers" ? (
          <Workers />
        ) : tab === "judge" ? (
          <JudgeSwitch />
        ) : tab === "files" ? (
          <FilesView />
        ) : (
          <Logs />
        )}
      </div>
    </div>
  );
}

function People() {
  const t = useT();
  const format = useFormat();
  const { me } = useAuth();
  const [users, setUsers] = useState<UserAccount[] | null>(null);
  const [error, setError] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await data.listUsers());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    try {
      await data.inviteUser(value);
      toast(t.system.people.invited(value));
      setEmail("");
      await load();
    } catch (err) {
      toast.error(errorText(err, t.common.somethingFailed));
    } finally {
      setBusy(false);
    }
  };

  const update = async (user: UserAccount, patch: { role?: "admin" | "member"; status?: "active" | "disabled" }) => {
    try {
      await data.updateUser(user.id, patch);
      toast(t.system.people.updated);
      await load();
    } catch (err) {
      toast.error(errorText(err, t.common.somethingFailed));
    }
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={invite} className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t.system.people.invitePlaceholder}
          aria-label={t.system.people.invitePlaceholder}
          className="max-w-xs"
        />
        <Button type="submit" disabled={busy || !email.trim()}>
          {busy ? <Spinner /> : null}
          {t.system.people.invite}
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">{t.system.people.hint}</p>

      {error ? (
        <ErrorState message={t.system.people.loadError} retryLabel={t.common.retry} onRetry={() => void load()} />
      ) : !users ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {users.map((user) => {
            const self = user.id === me?.id;
            const status = (user.status in t.system.people.status ? user.status : "active") as keyof typeof t.system.people.status;
            return (
              <li key={user.id} className={cn("flex items-center gap-3 py-2", user.status === "disabled" && "opacity-60")}>
                <Avatar name={user.name || user.email} src={user.avatarUrl} className="h-7 w-7 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    {user.name || user.email}
                    {self ? <span className="text-muted-foreground"> ({t.common.you})</span> : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email} · {user.role === "admin" ? t.common.admin : t.common.member} · {t.system.people.status[status]}
                    {" · "}
                    {user.lastSeenAt ? t.system.people.lastSeen(format.relative(user.lastSeenAt)) : t.system.people.never}
                  </p>
                </div>
                {!self ? (
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`${user.name || user.email}: ${t.collection.moreOptions}`}>
                        <MoreHorizontal aria-hidden />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" sideOffset={4} className={cn(menuContent, "min-w-[12rem]")}>
                        <DropdownMenu.Item className={menuItem} onSelect={() => void update(user, { role: user.role === "admin" ? "member" : "admin" })}>
                          {user.role === "admin" ? t.system.people.makeMember : t.system.people.makeAdmin}
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          className={cn(menuItem, user.status !== "disabled" && "text-bad")}
                          onSelect={() => void update(user, { status: user.status === "disabled" ? "active" : "disabled" })}
                        >
                          {user.status === "disabled" ? t.system.people.enable : t.system.people.disable}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const baseName = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() ?? path;

function Workers() {
  const t = useT();
  const { tuning } = useAppConfig();
  const [workers, setWorkers] = useState<WorkerInfo[] | null>(null);
  const [queueLen, setQueueLen] = useState(0);
  const [failed, setFailed] = useState(0);
  const [active, setActive] = useState<ActiveDownload[]>([]);
  const [cancelling, setCancelling] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deploy, setDeploy] = useState({ count: "1", port: "41000", link: "", chunk: "" });

  const load = useCallback(async () => {
    try {
      const [status, downloads] = await Promise.all([data.getWorkers(), data.getActiveDownloads()]);
      setWorkers(status.workers);
      setQueueLen(status.queue_len);
      setFailed(status.failed_count);
      setActive(downloads);
      setError(null);
    } catch (err) {
      setError(errorText(err, t.common.somethingFailed));
    }
  }, [t]);
  useEffect(() => {
    void load();
  }, [load]);
  usePolling(load, 3000);

  const cancel = async (download: ActiveDownload) => {
    setCancelling((current) => [...current, download.judgeSubmissionId]);
    try {
      await data.cancelDownload(download.judgeSubmissionId);
      setActive((current) => current.filter((d) => d.judgeSubmissionId !== download.judgeSubmissionId));
      toast(t.transfer.cancelled);
    } catch (err) {
      toast.error(errorText(err, t.common.somethingFailed));
    } finally {
      setCancelling((current) => current.filter((id) => id !== download.judgeSubmissionId));
    }
  };

  const stop = async (pids?: number[]) => {
    setBusy(true);
    try {
      const stopped = await data.stopWorkers(pids ? { pids } : {});
      toast(t.system.workers.stopped(stopped.length));
      await load();
    } catch (err) {
      toast.error(errorText(err, t.common.somethingFailed));
    } finally {
      setBusy(false);
    }
  };

  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    const resource = parseSpotifyResource(deploy.link);
    setBusy(true);
    try {
      const started = await data.startWorkers({
        worker_count: Number.parseInt(deploy.count, 10) || 1,
        port_base: Number.parseInt(deploy.port, 10) || undefined,
        playlist_id: resource?.id ?? (deploy.link.trim() || undefined),
        resource_kind: resource?.kind,
        chunk_size: deploy.chunk.trim() ? Number.parseInt(deploy.chunk, 10) : undefined,
        username_prefix: "worker",
        run_id_prefix: "web-trigger",
      });
      toast(t.system.workers.deployed(started.length));
      await load();
    } catch (err) {
      toast.error(errorText(err, t.common.somethingFailed));
    } finally {
      setBusy(false);
    }
  };

  const tracesUrl = `http://${window.location.hostname}:16686`;
  const tuningItems: [string, string | number][] = [
    ["searchConcurrency", tuning.searchConcurrency],
    ["downloadConcurrency", tuning.downloadConcurrency],
    ["searchTimeoutSecs", `${tuning.searchTimeoutSecs}s`],
    ["maxCandidatesPerTrack", tuning.maxCandidatesPerTrack],
    ["maxDownloadAttemptsPerTrack", tuning.maxDownloadAttemptsPerTrack],
    ["maxSearchPassesPerTrack", tuning.maxSearchPassesPerTrack],
    ["candidateCollectionSecs", `${tuning.candidateCollectionSecs}s`],
    ["peerCooldownSecs", `${tuning.peerCooldownSecs}s`],
    ["downloadHardTimeoutSecs", `${tuning.downloadHardTimeoutSecs}s`],
    ["downloadStallTimeoutSecs", `${tuning.downloadStallTimeoutSecs}s`],
    ["workerPortRange", tuning.workerPortRange],
    ["shareMode", tuning.shareMode],
  ];

  if (error && !workers) return <ErrorState message={error} retryLabel={t.common.retry} onRetry={() => void load()} />;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="tabular">{t.system.workers.active(workers?.length ?? 0)}</span>
        <span className="tabular">{t.system.workers.chunks(queueLen)}</span>
        {failed > 0 ? <span className="tabular text-bad">{t.system.workers.failed(failed)}</span> : null}
        <span className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={tracesUrl} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden />
              {t.system.workers.traces}
            </a>
          </Button>
          <Button variant="outline" size="sm" className="text-bad" disabled={busy || !workers?.length} onClick={() => void stop()}>
            {t.system.workers.stopAll}
          </Button>
        </span>
      </div>

      {tuning.shareStatus === "account_conflict" ? <p className="text-xs text-accent">{t.system.workers.accountConflict}</p> : null}

      <section>
        <h2 className="border-b border-line pb-1.5 text-2xs uppercase tracking-[0.04em] text-muted-foreground">{t.system.workers.downloads}</h2>
        {active.length === 0 ? (
          <p className="py-3 text-xs text-muted-foreground">{t.system.workers.downloadsNone}</p>
        ) : (
          <ul className="divide-y divide-line">
            {active.map((download) => {
              const name = download.filename ? baseName(download.filename) : `#${download.judgeSubmissionId}`;
              return (
                <li key={download.judgeSubmissionId} className="flex items-center gap-3 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs" title={download.filename}>
                      {name}
                    </p>
                    <p className="tabular truncate text-2xs text-muted-foreground">
                      {download.username ? `${download.username} · ` : ""}
                      {download.status ?? "queued"} · {download.progress}%
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={cancelling.includes(download.judgeSubmissionId)}
                    aria-label={`${t.transfer.cancel}: ${name}`}
                    title={t.transfer.cancel}
                    onClick={() => void cancel(download)}
                  >
                    {cancelling.includes(download.judgeSubmissionId) ? <Spinner /> : <X aria-hidden />}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="border-b border-line pb-1.5 text-2xs uppercase tracking-[0.04em] text-muted-foreground">{t.system.tabs.workers}</h2>
        {!workers ? (
          <Skeleton className="mt-2 h-8 w-full" />
        ) : workers.length === 0 ? (
          <p className="py-3 text-xs text-muted-foreground">{t.system.workers.none}</p>
        ) : (
          <ul className="divide-y divide-line">
            {workers.map((worker) => (
              <li key={worker.id} className="flex items-center gap-3 py-1.5 text-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ok" aria-hidden />
                <span className="w-24 truncate">{worker.username}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{worker.run_id}</span>
                <span className="tabular hidden text-muted-foreground sm:inline">{t.system.workers.port(worker.port)}</span>
                <span className="tabular text-muted-foreground">
                  {t.system.workers.uptime(Math.max(0, Math.floor((Date.now() / 1000 - worker.started_at_epoch_secs) / 60)))}
                </span>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => void stop([worker.id])}>
                  {t.system.workers.stop}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="text-xs">
        <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">{t.system.workers.deploy}</summary>
        <form onSubmit={start} className="mt-3 grid max-w-md grid-cols-2 gap-3">
          <label className="space-y-1 text-muted-foreground">
            <span>{t.system.workers.deployCount}</span>
            <Input type="number" min={1} max={32} value={deploy.count} onChange={(e) => setDeploy({ ...deploy, count: e.target.value })} />
          </label>
          <label className="space-y-1 text-muted-foreground">
            <span>{t.system.workers.deployPort}</span>
            <Input type="number" value={deploy.port} onChange={(e) => setDeploy({ ...deploy, port: e.target.value })} />
          </label>
          <label className="col-span-2 space-y-1 text-muted-foreground">
            <span>{t.system.workers.deployLink}</span>
            <Input value={deploy.link} onChange={(e) => setDeploy({ ...deploy, link: e.target.value })} spellCheck={false} />
          </label>
          <label className="space-y-1 text-muted-foreground">
            <span>{t.system.workers.deployChunk}</span>
            <Input type="number" value={deploy.chunk} placeholder="15" onChange={(e) => setDeploy({ ...deploy, chunk: e.target.value })} />
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={busy || !deploy.link.trim()}>
              {busy ? <Spinner /> : null}
              {t.system.workers.deployGo}
            </Button>
          </div>
        </form>
      </details>

      <details className="text-xs">
        <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">{t.system.workers.tuning}</summary>
        <dl className="mt-3 grid max-w-xl grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
          {tuningItems.map(([key, value]) => (
            <div key={key} className="flex justify-between gap-2 border-b border-line py-1">
              <dt className="truncate font-mono text-2xs text-muted-foreground">{key}</dt>
              <dd className="tabular font-mono text-2xs">{value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

function Logs() {
  const t = useT();
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const load = useCallback(async () => setLogs(await data.getLogs()), []);
  useEffect(() => {
    void load().catch(() => setLogs([]));
  }, [load]);
  usePolling(load, 3000);

  if (!logs) return <Skeleton className="h-40 w-full" />;
  if (logs.length === 0) return <p className="text-xs text-muted-foreground">{t.system.logs.empty}</p>;
  return (
    <div className="max-h-[calc(100vh-16rem)] overflow-y-auto font-mono text-2xs scrollbar-thin">
      {logs.map((log) => (
        <div key={log.id} className="grid grid-cols-[auto_auto_1fr] gap-3 py-0.5">
          <span className="tabular text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</span>
          <span className={log.level === "debug" ? "text-muted-foreground" : "text-muted-foreground"}>{log.level}</span>
          <span className="break-words">{log.message}</span>
        </div>
      ))}
    </div>
  );
}
