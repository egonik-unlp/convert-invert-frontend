import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ExternalLink, MoreHorizontal, Sparkles, Zap } from "lucide-react";
import type { CollectionKind, ExtensionPreview } from "@/lib/api-client";
import { data } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { spotifyUrl } from "@/lib/spotify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/Spinner";
import { cn } from "@/lib/utils";

/** "Mantener sincronizada" has no backend yet; the item stays hidden until it does. */
const SYNC_ENABLED = false;

export const menuItem =
  "flex cursor-default select-none items-start gap-2.5 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-hover data-[disabled]:opacity-50 [&>svg]:mt-0.5 [&>svg]:h-[15px] [&>svg]:w-[15px] [&>svg]:shrink-0 [&>svg]:text-muted-foreground";
export const menuContent = "z-50 min-w-[16rem] rounded-lg border border-line bg-background p-1 shadow-float data-[state=open]:animate-fade-in";

export function CollectionMenu({
  kind,
  id,
  retries,
  onRetriesChange,
  onExtend,
}: {
  kind: CollectionKind;
  id: string;
  retries: boolean;
  onRetriesChange: (value: boolean) => void;
  onExtend: (count: number) => Promise<void>;
}) {
  const t = useT();
  const [extendOpen, setExtendOpen] = useState(false);
  const canExtend = kind !== "liked";

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" size="icon" aria-label={t.collection.moreOptions}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={4} className={menuContent}>
            <DropdownMenu.CheckboxItem className={menuItem} checked={retries} onCheckedChange={(value) => onRetriesChange(value === true)}>
              <Zap aria-hidden />
              <span className="flex flex-1 flex-col">
                <span>{t.menu.retries}</span>
                <span className="text-xs text-muted-foreground">{t.menu.retriesHint}</span>
              </span>
              <span className="mt-0.5 w-4">
                <DropdownMenu.ItemIndicator>
                  <Check className="h-[15px] w-[15px]" aria-hidden />
                </DropdownMenu.ItemIndicator>
              </span>
            </DropdownMenu.CheckboxItem>
            {canExtend ? (
              <DropdownMenu.Item className={menuItem} onSelect={() => setExtendOpen(true)}>
                <Sparkles aria-hidden />
                <span className="flex flex-col">
                  <span>{t.menu.extend}</span>
                  <span className="text-xs text-muted-foreground">{t.menu.extendHint}</span>
                </span>
              </DropdownMenu.Item>
            ) : null}
            {SYNC_ENABLED ? (
              <DropdownMenu.Item className={menuItem} disabled>
                <span className="flex flex-col">
                  <span>{t.menu.sync}</span>
                  <span className="text-xs text-muted-foreground">{t.menu.syncHint}</span>
                </span>
              </DropdownMenu.Item>
            ) : null}
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item className={menuItem} asChild>
              <a href={spotifyUrl(kind, id)} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden />
                {t.menu.openInSpotify}
              </a>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {canExtend ? (
        <ExtendDialog
          open={extendOpen}
          onOpenChange={setExtendOpen}
          kind={kind as "playlist" | "album" | "track"}
          id={id}
          onConfirm={async (count) => {
            await onExtend(count);
            setExtendOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

const COUNTS = [10, 20, 30];

function ExtendDialog({
  open,
  onOpenChange,
  kind,
  id,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "playlist" | "album" | "track";
  id: string;
  onConfirm: (count: number) => Promise<void>;
}) {
  const t = useT();
  const [count, setCount] = useState(20);
  const [preview, setPreview] = useState<ExtensionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    data
      .previewExtension(id, kind, count)
      .then((next) => !cancelled && setPreview(next))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, id, kind, count]);

  const tracks = preview?.tracks ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.common.close} className="max-w-[480px]">
        <DialogTitle className="pr-8 text-base font-medium">{t.menu.extendTitle}</DialogTitle>
        <DialogDescription className="mt-1 text-xs text-muted-foreground">{t.menu.extendHint}</DialogDescription>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground" role="radiogroup" aria-label={t.menu.extendCount}>
          {t.menu.extendCount}
          {COUNTS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={count === value}
              onClick={() => setCount(value)}
              className={cn("tabular rounded-sm px-2 py-0.5", count === value ? "bg-raised text-foreground" : "hover:text-foreground")}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="mt-3 max-h-64 min-h-24 overflow-y-auto border-y border-line py-2 scrollbar-thin">
          {loading ? (
            <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Spinner /> {t.menu.extendLoading}
            </p>
          ) : error ? (
            <p className="py-2 text-xs text-bad">{error}</p>
          ) : tracks.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">{t.menu.extendNone}</p>
          ) : (
            <ol className="space-y-1">
              {tracks.map((track) => (
                <li key={track.id} className="flex gap-2 text-sm">
                  <span className="truncate">{track.name}</span>
                  <span className="truncate text-muted-foreground">{track.artist}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        {preview && preview.seedCount > 0 ? (
          <p className="mt-2 text-2xs text-muted-foreground">{t.menu.extendSeeds(preview.seedsMatched, preview.seedCount)}</p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="accent"
            disabled={busy || loading || tracks.length === 0}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(tracks.length);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Spinner /> : null}
            {t.menu.extendAdd(tracks.length)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
