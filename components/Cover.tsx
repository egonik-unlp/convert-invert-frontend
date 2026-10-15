import { Heart, Music } from "lucide-react";
import { cn } from "@/lib/utils";

const HUES = [24, 200, 268, 150, 340, 90, 40, 220];

function hue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

/** Cover art, or a quiet colored square with the first letter when Spotify has none. */
export function Cover({ src, name, liked, className }: { src?: string | null; name: string; liked?: boolean; className?: string }) {
  if (src) return <img src={src} alt="" loading="lazy" className={cn("shrink-0 rounded-sm object-cover", className)} />;
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-sm text-white/85", className)}
      style={{ background: liked ? "linear-gradient(135deg, hsl(258 45% 45%), hsl(200 40% 55%))" : `hsl(${hue(name)} 28% 38%)` }}
    >
      {liked ? <Heart className="h-[42%] w-[42%] fill-current" /> : name ? <span className="font-semibold leading-none">{name.charAt(0).toUpperCase()}</span> : <Music className="h-[42%] w-[42%]" />}
    </span>
  );
}
