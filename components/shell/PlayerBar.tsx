import { Pause, Play, SkipBack, SkipForward, Volume1, Volume2, VolumeX, X } from "lucide-react";
import { useFormat, useT } from "@/lib/i18n";
import { usePlayer, usePlayerTime } from "@/lib/player";
import { Cover } from "@/components/Cover";
import { useApp } from "./AppContext";
import { cn } from "@/lib/utils";

const iconButton =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:h-4 [&_svg]:w-4";

/** The song playing now: shown above the transfer bar while something is loaded. */
export function PlayerBar() {
  const t = useT();
  const format = useFormat();
  const player = usePlayer();
  const { time, duration } = usePlayerTime();
  const { openTrack } = useApp();
  const current = player.current;
  if (!current) return null;

  const clock = (seconds: number) => format.trackDuration(Math.max(0, seconds) * 1000);
  const progress = duration > 0 ? Math.min(1, time / duration) : 0;
  const VolumeIcon = player.volume === 0 ? VolumeX : player.volume < 0.5 ? Volume1 : Volume2;

  return (
    <section
      aria-label={t.player.label}
      className="relative col-span-full grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line bg-background pl-[max(12px,env(safe-area-inset-left))] pr-[max(8px,env(safe-area-inset-right))] md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]"
    >
      {/* Phones: a thin progress line along the top edge instead of the seek bar. */}
      <span className="absolute inset-x-0 top-[-1px] h-0.5 bg-line md:hidden" aria-hidden>
        <span className="block h-full bg-accent" style={{ width: `${progress * 100}%` }} />
      </span>

      <div className="flex min-w-0 items-center gap-2.5">
        <Cover src={current.imageUrl} name={current.album || current.title} className="h-9 w-9" />
        <button
          type="button"
          onClick={() => openTrack(current.spotifyId, current)}
          className="flex min-w-0 flex-col text-left hover:underline"
          title={t.player.details}
        >
          <span className="truncate text-[12.5px]">{current.title}</span>
          <span className="truncate text-xs text-muted-foreground">{current.artist}</span>
        </button>
      </div>

      <div className="flex min-w-0 flex-col items-center gap-0.5">
        <div className="flex items-center gap-1">
          <button type="button" className={cn(iconButton, "hidden md:inline-flex")} onClick={player.prev} aria-label={t.player.prev}>
            <SkipBack aria-hidden />
          </button>
          <button
            type="button"
            onClick={player.toggle}
            aria-label={player.playing ? t.player.pause : t.player.play}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background hover:opacity-90 [&_svg]:h-4 [&_svg]:w-4"
          >
            {player.playing ? <Pause aria-hidden className="fill-current" /> : <Play aria-hidden className="translate-x-px fill-current" />}
          </button>
          <button type="button" className={iconButton} onClick={player.next} disabled={!player.hasNext} aria-label={t.player.next}>
            <SkipForward aria-hidden />
          </button>
        </div>
        <div className="hidden w-full max-w-[34rem] items-center gap-2 md:flex">
          <span className="tabular w-9 text-right text-2xs text-muted-foreground">{clock(time)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.5}
            value={Math.min(time, duration || 0)}
            onChange={(event) => player.seek(Number(event.target.value))}
            aria-label={t.player.seek}
            aria-valuetext={`${clock(time)} / ${clock(duration)}`}
            disabled={!duration}
            className="h-1 flex-1 cursor-pointer accent-[hsl(var(--accent))]"
          />
          <span className="tabular w-9 text-2xs text-muted-foreground">{duration ? clock(duration) : "–:––"}</span>
        </div>
      </div>

      <div className="hidden items-center justify-end gap-1 md:flex">
        <button
          type="button"
          className={iconButton}
          onClick={() => player.setVolume(player.volume === 0 ? 1 : 0)}
          aria-label={player.volume === 0 ? t.player.unmute : t.player.mute}
        >
          <VolumeIcon aria-hidden />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={player.volume}
          onChange={(event) => player.setVolume(Number(event.target.value))}
          aria-label={t.player.volume}
          className="h-1 w-24 cursor-pointer accent-[hsl(var(--accent))]"
        />
        <button type="button" className={iconButton} onClick={player.close} aria-label={t.player.close}>
          <X aria-hidden />
        </button>
      </div>
    </section>
  );
}
