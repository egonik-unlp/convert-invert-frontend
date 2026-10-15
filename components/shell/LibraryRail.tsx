import { forwardRef, useState } from "react";
import { Check, HardDriveDownload, Gavel, Plus, Search, Settings2 } from "lucide-react";
import type { LibraryItem } from "@/lib/api-client";
import { itemKey, type LibraryState } from "@/lib/data/hooks";
import { useT } from "@/lib/i18n";
import { collectionPath, type Route } from "@/lib/routes";
import { Skeleton } from "@/components/ui/skeleton";
import { Cover } from "@/components/Cover";
import { Spinner } from "@/components/Spinner";
import { ProfileMenu } from "./ProfileMenu";
import { cn } from "@/lib/utils";

type Filter = "all" | "playlist" | "album";

interface LibraryRailProps {
  library: LibraryState;
  route: Route;
  isAdmin: boolean;
  search: string;
  onSearch: (q: string) => void;
  onSearchPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
  onAdd: () => void;
  onNavigate: (path: string) => void;
}

/** Add · Search · the person's Spotify library · Veredictos · Archivos · Sistema (admin). */
export const LibraryRail = forwardRef<HTMLInputElement, LibraryRailProps>(function LibraryRail(
  { library, route, isAdmin, search, onSearch, onSearchPaste, onAdd, onNavigate },
  searchRef,
) {
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const activeKey = route.name === "collection" ? `${route.kind}:${route.id}` : null;
  const items = library.items.filter((item) => filter === "all" || item.kind === filter || (filter === "playlist" && item.kind === "liked"));

  const isActive = (name: Route["name"]) =>
    route.name === name || (name === "downloaded" && route.name === "downloadedCollection");
  const navLink = (path: string, name: Route["name"], label: string, Icon: typeof Gavel, tag?: string) => (
    <a
      href={`#${path}`}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(path);
      }}
      aria-current={isActive(name) ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-1 py-1.5 text-muted-foreground hover:text-foreground [&>svg]:h-[15px] [&>svg]:w-[15px]",
        isActive(name) && "bg-raised text-foreground",
      )}
    >
      <Icon aria-hidden />
      {label}
      {tag ? <span className="ml-auto text-2xs text-muted-foreground">{tag}</span> : null}
    </a>
  );

  return (
    <nav aria-label={t.nav.library} className="flex h-full min-h-0 flex-col gap-3 pb-2.5 pl-[max(16px,env(safe-area-inset-left))] pr-3 pt-3.5">
      <div className="flex h-[26px] items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-[0.01em]">
          convert<span className="px-px font-normal text-muted-foreground">/</span>invert
        </span>
        <ProfileMenu />
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-foreground font-medium text-background hover:opacity-90"
      >
        <Plus className="h-[15px] w-[15px]" aria-hidden />
        {t.nav.add}
      </button>

      <label className="relative block">
        <span className="sr-only">{t.nav.searchPlaceholder}</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          ref={searchRef}
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          onPaste={onSearchPaste}
          placeholder={`${t.nav.searchPlaceholder}   /`}
          className="h-[30px] w-full rounded-md border border-line bg-transparent pl-[29px] pr-2.5 text-[12.5px] outline-none placeholder:text-faint focus:border-muted-foreground"
        />
      </label>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 className="text-2xs font-medium uppercase tracking-[0.04em] text-muted-foreground">{t.nav.library}</h2>
        <div className="-mr-1 flex" role="group" aria-label={t.nav.library}>
          {(["all", "playlist", "album"] as Filter[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn("rounded-sm px-1 py-0.5 text-[11px] text-muted-foreground hover:text-foreground", filter === value && "bg-raised text-foreground")}
            >
              {value === "all" ? t.nav.all : value === "playlist" ? t.nav.playlists : t.nav.albums}
            </button>
          ))}
        </div>
      </div>

      {library.stale ? (
        <p className="flex items-center gap-1.5 text-2xs text-muted-foreground" title={t.rail.staleHint}>
          <span className="h-1.5 w-1.5 rounded-full bg-faint" aria-hidden />
          {t.rail.stale}
        </p>
      ) : null}

      <ul className="-mr-1.5 flex min-h-0 flex-1 flex-col gap-px overflow-y-auto pr-0.5 scrollbar-thin">
        {library.loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-center gap-2.5 p-1">
              <Skeleton className="h-8 w-8" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-2.5 w-3/4" />
                <Skeleton className="h-2 w-1/2" />
              </div>
            </li>
          ))
        ) : library.error && library.items.length === 0 ? (
          <li className="p-1 text-xs text-muted-foreground">
            {t.rail.loadError}{" "}
            <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={library.reload}>
              {t.common.retry}
            </button>
          </li>
        ) : items.length === 0 ? (
          <li className="p-1 text-xs text-muted-foreground">{t.rail.empty}</li>
        ) : (
          items.map((item) => (
            <li key={itemKey(item)}>
              <RailItem
                item={item}
                active={activeKey === itemKey(item)}
                added={library.addedIds.has(itemKey(item))}
                badge={library.badges[itemKey(item)]}
                onNavigate={onNavigate}
              />
            </li>
          ))
        )}
      </ul>

      <div className="flex flex-col gap-px border-t border-line pt-2">
        {navLink("/verdicts", "verdicts", t.nav.verdicts, Gavel)}
        {navLink("/downloaded", "downloaded", t.nav.downloaded, HardDriveDownload)}
        {isAdmin ? navLink("/system/people", "system", t.nav.system, Settings2, t.nav.adminTag) : null}
      </div>
    </nav>
  );
});

function RailItem({
  item,
  active,
  added,
  badge,
  onNavigate,
}: {
  item: LibraryItem;
  active: boolean;
  added: boolean;
  badge?: { total: number; owned: number; inFlight: number; failed: number };
  onNavigate: (path: string) => void;
}) {
  const t = useT();
  const path = collectionPath(item.kind, item.id);
  const name = item.kind === "liked" ? t.nav.liked : item.name;
  const complete = !!badge && badge.total > 0 && badge.owned === badge.total;
  const started = !!badge && badge.owned + badge.inFlight + badge.failed > 0;
  return (
    <a
      href={`#${path}`}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(path);
      }}
      aria-current={active ? "page" : undefined}
      className={cn("grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[5px] p-1 hover:bg-hover", active && "bg-raised hover:bg-raised")}
    >
      <Cover src={item.imageUrl} name={name} liked={item.kind === "liked"} className="h-8 w-8 [&_span]:text-sm" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{name}</span>
        <span className="truncate text-[11.5px] text-muted-foreground">
          {t.kind[item.kind]} · {item.owner}
          {added ? ` · ${t.rail.added}` : ""}
        </span>
      </span>
      {complete ? (
        <span className="pr-0.5 text-ok" title={t.rail.complete}>
          <Check className="h-3.5 w-3.5" aria-label={t.rail.complete} />
        </span>
      ) : started && badge ? (
        <span className="tabular inline-flex items-center gap-1 pr-0.5 text-2xs text-muted-foreground" title={t.rail.progress(badge.owned, badge.total)}>
          {badge.inFlight > 0 ? <Spinner className="h-2.5 w-2.5 text-accent" /> : null}
          <span className="sr-only">{t.rail.progress(badge.owned, badge.total)}</span>
          <span aria-hidden>
            {badge.owned}/{badge.total}
          </span>
        </span>
      ) : null}
    </a>
  );
}
