export type SpotifyResourceKind = "playlist" | "album" | "track";

export const SPOTIFY_RESOURCE_KINDS: SpotifyResourceKind[] = ["playlist", "album", "track"];

export interface SpotifyResource {
  kind: SpotifyResourceKind;
  id: string;
}

/**
 * Parse a Spotify link, URI, or bare id into a `{ kind, id }` pair. Handles:
 *   - https://open.spotify.com/{kind}/{id}   (with optional /intl-xx/ locale prefix)
 *   - spotify:{kind}:{id}
 *   - a bare 22-ish char id  -> assumed to be a playlist (backward compatible; a bare id
 *     carries no kind, and playlists were the only supported input before albums/tracks).
 * Returns `null` when nothing usable can be extracted.
 */
export function parseSpotifyResource(input: string): SpotifyResource | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  for (const kind of SPOTIFY_RESOURCE_KINDS) {
    const uri = new RegExp(`^spotify:${kind}:([A-Za-z0-9]+)`).exec(trimmed);
    if (uri) return { kind, id: uri[1] };
  }

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    for (const kind of SPOTIFY_RESOURCE_KINDS) {
      const idx = parts.indexOf(kind);
      if (idx >= 0 && parts[idx + 1]) {
        return { kind, id: parts[idx + 1].replace(/[?#].*$/, "") };
      }
    }
  } catch {
    // Not a URL; fall through to the bare-id case.
  }

  const bare = trimmed.replace(/[?#].*$/, "");
  if (/^[A-Za-z0-9]{10,}$/.test(bare)) return { kind: "playlist", id: bare };
  return null;
}

const KIND_LABELS: Record<SpotifyResourceKind, string> = {
  playlist: "Playlist",
  album: "Album",
  track: "Track",
};

export function resourceKindLabel(kind: SpotifyResourceKind): string {
  return KIND_LABELS[kind];
}
