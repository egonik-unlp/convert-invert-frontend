import { useState } from "react";
import { ArrowDown, Clock, ListMusic, Pause, Play, Search, X } from "lucide-react";
import { toast } from "sonner";
import type { Queue, QueueItem } from "@/lib/api-client";
import type { QueueState } from "@/lib/data/hooks";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Avatar } from "@/components/Avatar";
import { Spinner } from "@/components/Spinner";
import { StatusCell } from "@/components/collection/StatusCell";
import { useApp } from "./AppContext";

/** The current download, how many are downloading / searching / queued, the queue, and pause (admin). */
export function TransferBar({ queue: state }: { queue: QueueState }) {
  const t = useT();
  const { isAdmin } = useAuth();
  const [queueOpen, setQueueOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { queue, paused } = state;
  const current = queue.downloading[0];
  const searching = queue.searching.length + queue.comparing.length;

  const togglePause = async () => {
    setBusy(true);
    try {
      await state.setPaused(!paused);
      toast(paused ? t.transfer.resumedToast : t.transfer.pausedToast);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.somethingFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer className="col-span-full flex h-12 items-center gap-3 border-t border-line bg-background pl-[max(16px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] text-xs">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {paused ? (
          <span className="flex min-w-0 items-center gap-2 text-accent" title={t.transfer.pausedHint}>
            <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{t.transfer.paused}</span>
            {isAdmin ? (
              <button type="button" className="shrink-0 underline underline-offset-2 hover:no-underline" onClick={togglePause} disabled={busy}>
                {t.transfer.resume}
              </button>
            ) : null}
          </span>
        ) : current ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-foreground">{current.title}</span>
              <span className="truncate text-muted-foreground">{current.artist}</span>
            </span>
            <span
              className="relative hidden h-[3px] w-24 shrink-0 overflow-hidden rounded-full bg-line sm:block"
              role="progressbar"
              aria-valuenow={current.progress ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={current.title}
            >
              <span className="absolute inset-y-0 left-0 bg-accent transition-[width]" style={{ width: `${current.progress ?? 0}%` }} />
            </span>
          </div>
        ) : (
          <span className="truncate text-muted-foreground">{t.transfer.idle}</span>
        )}
      </div>

      <div className="hidden items-center gap-4 text-muted-foreground md:flex [&_svg]:h-3.5 [&_svg]:w-3.5">
        <span className="tabular inline-flex items-center gap-1.5">
          <ArrowDown className="text-accent" aria-hidden />
          {t.transfer.downloading(queue.downloading.length)}
        </span>
        <span className="tabular inline-flex items-center gap-1.5">
          <Search aria-hidden />
          {t.transfer.searching(searching)}
        </span>
        <span className="tabular inline-flex items-center gap-1.5">
          <Clock aria-hidden />
          {t.transfer.queued(queue.queued.length)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {isAdmin && !paused ? (
          <Button variant="ghost" size="icon" onClick={togglePause} disabled={busy} aria-label={t.transfer.pause} title={t.transfer.pause}>
            {busy ? <Spinner /> : <Pause aria-hidden />}
          </Button>
        ) : null}
        {isAdmin && paused ? (
          <Button variant="ghost" size="icon" onClick={togglePause} disabled={busy} aria-label={t.transfer.resume} title={t.transfer.resume}>
            {busy ? <Spinner /> : <Play aria-hidden />}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => setQueueOpen(true)}>
          <ListMusic aria-hidden />
          {t.transfer.queue}
          <span className="tabular text-muted-foreground md:hidden">{queue.downloading.length + searching + queue.queued.length}</span>
        </Button>
      </div>

      <QueuePanel open={queueOpen} onOpenChange={setQueueOpen} queue={queue} />
    </footer>
  );
}

const GROUPS: (keyof Queue)[] = ["downloading", "comparing", "searching", "queued"];

function QueuePanel({ open, onOpenChange, queue }: { open: boolean; onOpenChange: (open: boolean) => void; queue: Queue }) {
  const t = useT();
  const { me } = useAuth();
  const { openTrack } = useApp();
  const total = GROUPS.reduce((sum, key) => sum + queue[key].length, 0);

  const open_ = (item: QueueItem) => {
    onOpenChange(false);
    openTrack(item.spotifyId, { title: item.title, artist: item.artist, album: item.album });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby={undefined}>
        <header className="flex h-12 items-center justify-between border-b border-line px-4">
          <DialogTitle className="text-base font-medium">{t.transfer.queueTitle}</DialogTitle>
          <DialogClose className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground" aria-label={t.common.close}>
            <X className="h-[15px] w-[15px]" aria-hidden />
          </DialogClose>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
          {total === 0 ? (
            <p className="px-2 py-6 text-sm text-muted-foreground">{t.transfer.queueEmpty}</p>
          ) : (
            GROUPS.filter((key) => queue[key].length > 0).map((key) => (
              <section key={key} className="mb-4">
                <h3 className="px-2 pb-1 text-2xs uppercase tracking-[0.04em] text-muted-foreground">
                  {t.transfer.groups[key]} <span className="tabular text-muted-foreground">{queue[key].length}</span>
                </h3>
                <ul>
                  {queue[key].map((item) => {
                    const by = item.requestedBy;
                    return (
                      <li key={item.spotifyId}>
                        <button
                          type="button"
                          onClick={() => open_(item)}
                          className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-hover"
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{item.title}</span>
                            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="truncate">{item.artist}</span>
                              {by ? (
                                <>
                                  <span aria-hidden>·</span>
                                  <Avatar name={by.name} src={by.avatarUrl} className="h-4 w-4 text-[9px]" />
                                  <span className="shrink-0">{by.id === me?.id ? t.common.you : by.name}</span>
                                </>
                              ) : null}
                            </span>
                          </span>
                          <StatusCell status={item} onDownload={() => {}} onOpen={() => open_(item)} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </SheetContent>
    </Dialog>
  );
}
