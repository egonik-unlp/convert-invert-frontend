import { useEffect, useRef, useState } from "react";
import { ArrowDown, Check } from "lucide-react";
import type { CollectionCounts, LibraryItem } from "@/lib/api-client";
import { data } from "@/lib/data";
import { addCollection } from "@/lib/data/added";
import { useT } from "@/lib/i18n";
import { collectionPath } from "@/lib/routes";
import { parseSpotifyResource } from "@/lib/spotify";
import { useSpotifyPreview } from "@/hooks/useSpotifyPreview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Cover } from "@/components/Cover";
import { Spinner } from "@/components/Spinner";
import { useApp } from "@/components/shell/AppContext";

/**
 * One field: paste a playlist, album or song link. A valid link shows a preview (cover, name,
 * owner, how many songs, how many you already have) and two ways forward.
 */
export function AddFromSpotifyDialog({
  open,
  initial,
  libraryKeys,
  onOpenChange,
}: {
  open: boolean;
  initial: string;
  libraryKeys: Set<string>;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { navigate, download } = useApp();
  const [value, setValue] = useState(initial);
  const [counts, setCounts] = useState<CollectionCounts | null>(null);
  const [busy, setBusy] = useState<"see" | "download" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);

  const resource = parseSpotifyResource(value);
  const invalid = value.trim().length > 0 && !resource;
  const preview = useSpotifyPreview(resource, initial && value === initial ? 0 : 400);
  const resolved = preview.data;

  // How many of them you already have: the same call that opens the collection, so it's cached after.
  useEffect(() => {
    setCounts(null);
    if (!resolved) return;
    let cancelled = false;
    data
      .getCollection(resolved.kind, resolved.id, { limit: 1 })
      .then((page) => !cancelled && setCounts(page.counts))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [resolved]);

  const key = resolved ? `${resolved.kind}:${resolved.id}` : "";
  const inLibrary = !!resolved && libraryKeys.has(key);
  const toDownload = counts ? counts.missing + counts.failed : resolved?.trackCount ?? 0;

  const remember = () => {
    if (!resolved || resolved.kind === "track" || inLibrary) return;
    const item: LibraryItem = {
      kind: resolved.kind,
      id: resolved.id,
      name: resolved.name,
      owner: resolved.subtitle,
      imageUrl: resolved.image ?? null,
      trackCount: resolved.trackCount ?? 0,
    };
    addCollection(item);
  };

  const go = async (andDownload: boolean) => {
    if (!resolved) return;
    setBusy(andDownload ? "download" : "see");
    try {
      remember();
      navigate(collectionPath(resolved.kind, resolved.id));
      onOpenChange(false);
      if (andDownload) await download({ kind: resolved.kind, id: resolved.id });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t.common.close}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
        }}
      >
        <DialogTitle className="pr-8 text-base font-medium">{t.add.title}</DialogTitle>
        <DialogDescription className="mt-1 text-xs text-muted-foreground">{t.add.note}</DialogDescription>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t.add.placeholder}
          aria-label={t.add.placeholder}
          aria-invalid={invalid}
          aria-describedby="add-help"
          spellCheck={false}
          className="mt-4 h-9 w-full rounded-md border border-line bg-transparent px-3 text-sm outline-none placeholder:text-faint focus:border-muted-foreground"
        />
        <p id="add-help" className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {invalid ? <span className="mr-1 text-bad">{t.add.invalid}</span> : null}
          {t.add.howPrefix}
          {t.add.howSteps.map((step, i) => (
            <span key={step} className="inline-flex items-center gap-1">
              {i > 0 ? <span aria-hidden>›</span> : null}
              <kbd className="rounded-sm border border-line px-1 font-sans text-2xs text-foreground">{step}</kbd>
            </span>
          ))}
        </p>

        {resource ? (
          <div className="mt-4 border-t border-line pt-4" aria-live="polite">
            {preview.loading || (!resolved && !preview.error) ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner /> {t.add.resolving}
              </p>
            ) : preview.error ? (
              <p className="text-sm text-bad">{t.add.spotifyError}</p>
            ) : resolved ? (
              <>
                <div className="flex items-center gap-3">
                  <Cover src={resolved.image} name={resolved.name} className="h-12 w-12 [&_span]:text-xl" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{resolved.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.kind[resolved.kind]} · {t.add.by(resolved.subtitle)}
                      {resolved.trackCount != null ? ` · ${t.common.songs(resolved.trackCount)}` : ""}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {inLibrary ? (
                        <>
                          <Check className="h-3 w-3 text-ok" aria-hidden /> {t.add.inLibrary}
                        </>
                      ) : counts ? (
                        t.collection.have(counts.owned, counts.total)
                      ) : (
                        <span className="h-4" />
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" disabled={!!busy} onClick={() => void go(false)}>
                    {t.add.see}
                  </Button>
                  {toDownload > 0 ? (
                    <Button variant="accent" disabled={!!busy} onClick={() => void go(true)}>
                      {busy === "download" ? <Spinner /> : <ArrowDown aria-hidden />}
                      {t.add.downloadN(toDownload)}
                    </Button>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
