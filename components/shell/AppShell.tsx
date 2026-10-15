import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import { data } from "@/lib/data";
import { itemKey, useLibrary, useQueue } from "@/lib/data/hooks";
import { useT } from "@/lib/i18n";
import { useHashRoute } from "@/lib/routes";
import { parseSpotifyLink } from "@/lib/spotify";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { AddFromSpotifyDialog } from "@/components/AddFromSpotifyDialog";
import { JudgingPanel } from "@/components/JudgingPanel";
import { CollectionView } from "@/components/collection/CollectionView";
import { SearchView } from "@/components/SearchView";
import { VerdictsView } from "@/components/VerdictsView";
import { FilesView } from "@/components/FilesView";
import { SystemView } from "@/components/SystemView";
import { AppContext, type AppActions, type TrackInfo } from "./AppContext";
import { LibraryRail } from "./LibraryRail";
import { TransferBar } from "./TransferBar";

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Library on the left, the open view on the right, transfers along the bottom. */
export function AppShell() {
  const t = useT();
  const { isAdmin } = useAuth();
  const { route, track, navigate, setTrack } = useHashRoute();
  const library = useLibrary();
  const queue = useQueue();
  const scrollRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [trackInfo, setTrackInfo] = useState<Record<string, TrackInfo>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [addInitial, setAddInitial] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [search, setSearch] = useState(route.name === "search" ? route.q : "");

  // Members never see System, not even through an old link.
  useEffect(() => {
    if (route.name === "system" && !isAdmin) navigate("/verdicts", { replace: true });
  }, [route, isAdmin, navigate]);

  // Each view starts at the top.
  const routeKey = route.name === "collection" ? `${route.kind}:${route.id}` : route.name;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setNavOpen(false);
    if (route.name !== "search") setSearch("");
  }, [routeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = useCallback((initial = "") => {
    setAddInitial(initial);
    setAddOpen(true);
  }, []);

  const openTrack = useCallback(
    (spotifyId: string, info?: TrackInfo) => {
      if (info) setTrackInfo((current) => ({ ...current, [spotifyId]: info }));
      setTrack(spotifyId);
    },
    [setTrack],
  );

  const refreshAfterRequest = useRef(() => {});
  refreshAfterRequest.current = () => {
    queue.refresh();
    library.refreshBadges();
  };
  const download = useCallback<AppActions["download"]>(
    async (source, opts = {}) => {
      try {
        const { queued } = await data.requestDownload(source, { trackIds: opts.trackIds, options: opts.options });
        if (!opts.quiet) toast(queued > 0 ? t.collection.queued(queued) : t.collection.nothingToQueue);
        refreshAfterRequest.current();
        return queued;
      } catch (err) {
        console.warn("Download request failed", err);
        toast.error(t.common.somethingFailed);
        return 0;
      }
    },
    [t],
  );

  const actions = useMemo<AppActions>(
    () => ({ navigate, openTrack, openAdd, download, scrollRef }),
    [navigate, openTrack, openAdd, download],
  );

  // A Spotify link pasted anywhere (outside a text field) opens "Agregar desde Spotify".
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isTyping(event.target)) return;
      const text = event.clipboardData?.getData("text") ?? "";
      if (parseSpotifyLink(text)) {
        event.preventDefault();
        openAdd(text.trim());
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !isTyping(event.target) && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        if (window.matchMedia("(min-width: 768px)").matches) searchRef.current?.focus();
        else setNavOpen(true);
      }
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey);
    };
  }, [openAdd]);

  const onSearch = (q: string) => {
    setSearch(q);
    if (q.trim()) navigate("/search", { replace: route.name === "search", q });
    else if (route.name === "search") window.history.back();
  };
  const onSearchPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (parseSpotifyLink(text)) {
      event.preventDefault();
      openAdd(text.trim());
    }
  };

  const libraryKeys = useMemo(() => new Set(library.items.map(itemKey)), [library.items]);

  const rail = (withRef: boolean) => (
    <LibraryRail
      ref={withRef ? searchRef : undefined}
      library={library}
      route={route}
      isAdmin={isAdmin}
      search={search}
      onSearch={onSearch}
      onSearchPaste={onSearchPaste}
      onAdd={() => openAdd()}
      onNavigate={(path) => navigate(path)}
    />
  );

  return (
    <AppContext.Provider value={actions}>
      <div className="grid h-full grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r border-line md:block">{rail(true)}</aside>

        <main ref={scrollRef} className="relative min-w-0 overflow-y-auto scrollbar-thin" tabIndex={-1}>
          <div>
            <div className="sticky top-0 z-10 flex h-11 items-center gap-2 border-b border-line bg-background/95 px-2 backdrop-blur md:hidden">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
                aria-label={t.nav.openLibrary}
              >
                <Menu className="h-[18px] w-[18px]" aria-hidden />
              </button>
              <span className="text-[13px] font-semibold">
                convert<span className="px-px font-normal text-muted-foreground">/</span>invert
              </span>
            </div>
            {route.name === "collection" ? (
              <CollectionView key={`${route.kind}:${route.id}`} kind={route.kind} id={route.id} />
            ) : route.name === "search" ? (
              <SearchView q={route.q} />
            ) : route.name === "verdicts" ? (
              <VerdictsView />
            ) : route.name === "files" ? (
              <FilesView />
            ) : route.name === "system" && isAdmin ? (
              <SystemView tab={route.tab} />
            ) : null}
          </div>
        </main>

        <TransferBar queue={queue} />
      </div>

      <Dialog open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{t.nav.library}</DialogTitle>
          {rail(false)}
        </SheetContent>
      </Dialog>

      <JudgingPanel spotifyId={track} info={track ? trackInfo[track] : undefined} onClose={() => setTrack(null)} />
      <AddFromSpotifyDialog open={addOpen} initial={addInitial} libraryKeys={libraryKeys} onOpenChange={setAddOpen} />
    </AppContext.Provider>
  );
}
