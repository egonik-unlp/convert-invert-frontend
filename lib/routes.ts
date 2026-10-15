import { useCallback, useEffect, useState } from "react";
import type { CollectionKind } from "@/lib/api-client";
import { lastCollection } from "@/lib/data/added";

export type SystemTab = "people" | "workers" | "judge" | "files" | "logs";
export const SYSTEM_TABS: SystemTab[] = ["people", "workers", "judge", "files", "logs"];
export type DownloadedTab = "songs" | "collections";

export type Route =
  | { name: "collection"; kind: CollectionKind; id: string }
  | { name: "search"; q: string }
  | { name: "verdicts" }
  | { name: "downloaded"; tab: DownloadedTab }
  | { name: "downloadedCollection"; id: string }
  | { name: "system"; tab: SystemTab };

const KINDS: CollectionKind[] = ["playlist", "album", "liked", "track"];
const HOME = "/c/liked/liked";

/** Hashes from the old seven-view console, so bookmarks keep working. */
const LEGACY: Record<string, string | null> = {
  overview: null,
  library: null,
  playlists: null,
  judgements: "/verdicts",
  downloads: "/downloaded",
  diagnostics: "/system/workers",
  logs: "/system/logs",
};

export const collectionPath = (kind: CollectionKind, id: string) => `/c/${kind}/${encodeURIComponent(id)}`;
export const downloadedCollectionPath = (id: string) => `/downloaded/c/${encodeURIComponent(id)}`;

function homePath(): string {
  return lastCollection() ?? HOME;
}

interface Parsed {
  route: Route;
  track: string | null;
  /** Set when the hash was old or unknown and should be replaced. */
  redirect?: string;
}

export function parseHash(hash: string): Parsed {
  const raw = hash.replace(/^#/, "");
  const [pathPart, queryPart = ""] = raw.split("?");
  const query = new URLSearchParams(queryPart);
  const track = query.get("track");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);

  const fallback = (target: string): Parsed => ({ ...parseHash(`#${target}`), redirect: target });

  if (parts.length === 0) return fallback(homePath());
  if (parts.length === 1 && parts[0] in LEGACY) return fallback(LEGACY[parts[0]] ?? homePath());

  switch (parts[0]) {
    case "c": {
      const kind = parts[1] as CollectionKind;
      if (KINDS.includes(kind) && parts[2]) return { route: { name: "collection", kind, id: parts[2] }, track };
      break;
    }
    case "search":
      return { route: { name: "search", q: query.get("q") ?? "" }, track };
    case "verdicts":
      return { route: { name: "verdicts" }, track };
    case "downloaded":
      if (parts[1] === "c" && parts[2]) return { route: { name: "downloadedCollection", id: parts[2] }, track };
      return { route: { name: "downloaded", tab: parts[1] === "collections" ? "collections" : "songs" }, track };
    case "files":
      // The raw folder browser moved to Sistema (admins); everyone else gets "Descargadas".
      return fallback("/downloaded");
    case "system": {
      const tab = (parts[1] ?? "people") as SystemTab;
      return { route: { name: "system", tab: SYSTEM_TABS.includes(tab) ? tab : "people" }, track };
    }
  }
  return fallback(HOME);
}

function withTrack(path: string, track: string | null, extra?: URLSearchParams): string {
  const params = new URLSearchParams(extra);
  if (track) params.set("track", track);
  const qs = params.toString();
  return `#${path}${qs ? `?${qs}` : ""}`;
}

export function routePath(route: Route): string {
  switch (route.name) {
    case "collection":
      return collectionPath(route.kind, route.id);
    case "search":
      return "/search";
    case "verdicts":
      return "/verdicts";
    case "downloaded":
      return route.tab === "collections" ? "/downloaded/collections" : "/downloaded";
    case "downloadedCollection":
      return downloadedCollectionPath(route.id);
    case "system":
      return `/system/${route.tab}`;
  }
}

/** A tiny hash router: `#/c/playlist/<id>?track=<spotifyId>`, `#/downloaded`, `#/verdicts`, `#/system/<tab>`. */
export function useHashRoute() {
  const [parsed, setParsed] = useState<Parsed>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setParsed(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  useEffect(() => {
    if (parsed.redirect) history.replaceState(null, "", withTrack(parsed.redirect, parsed.track));
  }, [parsed]);

  const navigate = useCallback((path: string, opts: { replace?: boolean; q?: string } = {}) => {
    const extra = opts.q != null ? new URLSearchParams({ q: opts.q }) : undefined;
    const next = withTrack(path, null, extra);
    if (opts.replace) {
      history.replaceState(null, "", next);
      setParsed(parseHash(next));
    } else {
      window.location.hash = next;
    }
  }, []);

  const setTrack = useCallback(
    (track: string | null) => {
      const extra = parsed.route.name === "search" ? new URLSearchParams({ q: parsed.route.q }) : undefined;
      const next = withTrack(routePath(parsed.route), track, extra);
      // Opening the panel is a step you can go back from; closing replaces it.
      if (track) window.location.hash = next;
      else {
        history.replaceState(null, "", next);
        setParsed(parseHash(next));
      }
    },
    [parsed.route],
  );

  return { route: parsed.route, track: parsed.track, navigate, setTrack };
}
