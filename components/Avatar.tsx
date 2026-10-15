import { cn } from "@/lib/utils";

/** Person avatar: Spotify photo, else their initial. */
export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  if (src) return <img src={src} alt="" className={cn("h-5 w-5 shrink-0 rounded-full object-cover", className)} />;
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return (
    <span
      aria-hidden
      className={cn("inline-grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white", className)}
      style={{ background: `hsl(${h % 360} 30% 42%)` }}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}
