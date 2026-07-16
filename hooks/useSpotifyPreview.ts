import { useEffect, useState } from "react";
import { api, type ResolvedResource } from "@/lib/api-client";
import type { SpotifyResource } from "@/lib/spotify";

export interface SpotifyPreviewState {
  loading: boolean;
  data: ResolvedResource | null;
  error: string | null;
}

const EMPTY: SpotifyPreviewState = { loading: false, data: null, error: null };

/**
 * Debounce a parsed Spotify resource and resolve its metadata (name, art, …) via the API. Stale
 * in-flight requests are aborted when the input changes, so only the latest resolves win.
 */
export function useSpotifyPreview(resource: SpotifyResource | null, delayMs = 400): SpotifyPreviewState {
  const [state, setState] = useState<SpotifyPreviewState>(EMPTY);

  const kind = resource?.kind;
  const id = resource?.id;

  useEffect(() => {
    if (!kind || !id) {
      setState(EMPTY);
      return;
    }

    const controller = new AbortController();
    setState({ loading: true, data: null, error: null });

    const timer = window.setTimeout(() => {
      api
        .resolveResource(id, kind, controller.signal)
        .then((data) => setState({ loading: false, data, error: null }))
        .catch((err) => {
          if (controller.signal.aborted) return;
          setState({ loading: false, data: null, error: err instanceof Error ? err.message : "Could not resolve" });
        });
    }, delayMs);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [kind, id, delayMs]);

  return state;
}
