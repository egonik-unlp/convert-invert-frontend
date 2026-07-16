import { Loader2, Music, TriangleAlert } from "lucide-react";
import { useSpotifyPreview } from "@/hooks/useSpotifyPreview";
import { resourceKindLabel, type SpotifyResource } from "@/lib/spotify";

/**
 * Live preview of a pasted Spotify link: cover art, name, artist/owner, track count, and the
 * resource kind. Renders nothing until there's a parseable resource to resolve.
 */
export function SpotifyPreview({ resource }: { resource: SpotifyResource | null }) {
  const { loading, data, error } = useSpotifyPreview(resource);

  if (!resource) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {data?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <Music className="h-5 w-5 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {error ? (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : data ? (
          <>
            <p className="truncate text-sm font-medium text-foreground" title={data.name}>
              {data.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {data.subtitle}
              {typeof data.trackCount === "number"
                ? `${data.subtitle ? " · " : ""}${data.trackCount} track${data.trackCount === 1 ? "" : "s"}`
                : ""}
            </p>
            <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-primary">
              {resourceKindLabel(data.kind)}
            </span>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Resolving {resourceKindLabel(resource.kind)}…</p>
        )}
      </div>
    </div>
  );
}
