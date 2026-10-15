import { Pause, Play } from "lucide-react";
import { Cover } from "@/components/Cover";
import { cn } from "@/lib/utils";

/**
 * A song's cover that plays it: a play button over the cover on row hover or focus, and a
 * pause button (always visible) while it is the song playing.
 */
export function PlayCover({
  src,
  name,
  state,
  onPlay,
  label,
  className,
}: {
  src?: string | null;
  name: string;
  /** "none" when it isn't the current song. */
  state: "none" | "playing" | "paused";
  onPlay: () => void;
  label: string;
  className?: string;
}) {
  const current = state !== "none";
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <Cover src={src} name={name} className="h-full w-full" />
      <button
        type="button"
        tabIndex={-1}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          onPlay();
        }}
        className={cn(
          "absolute inset-0 inline-flex items-center justify-center rounded-sm bg-black/55 text-white opacity-0 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 [&_svg]:h-3.5 [&_svg]:w-3.5",
          current && "opacity-100",
        )}
      >
        {state === "playing" ? <Pause aria-hidden className="fill-current" /> : <Play aria-hidden className="translate-x-px fill-current" />}
      </button>
    </span>
  );
}
