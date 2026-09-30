import { useEffect, useState } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppConfig } from "@/hooks/useAppConfig";
import { api } from "@/lib/api-client";
import { formatJudgeName } from "@/lib/judgement";
import { cn } from "@/lib/utils";

const BACKENDS = [
  { id: "levenshtein", label: "Levenshtein", hint: "String similarity. Instant, no model, but no reason given." },
  { id: "smol", label: "Smol judge", hint: "The fine-tuned model. Labels each verdict; needs a reachable ollama." },
];

/**
 * Switches the judge without redeploying.
 *
 * Which judge is right depends on what the machine is doing: the model runs far
 * slower on a box busy with something else than on an idle one, so the useful
 * control is not just "model or not" but "model, over there". Both are here.
 */
export function JudgeSwitch() {
  const { judge, refresh } = useAppConfig();
  const [url, setUrl] = useState(judge.url ?? "");
  const [busy, setBusy] = useState(false);

  // Follow the server whenever it reports a different URL (another tab, a reset).
  useEffect(() => {
    setUrl(judge.url ?? "");
  }, [judge.url]);

  const selected = judge.backend === "smol-judge" ? "smol" : "levenshtein";
  const urlDirty = selected === "smol" && url.trim() !== (judge.url ?? "");

  const apply = async (label: string, call: () => Promise<{ backend: string }>) => {
    setBusy(true);
    try {
      const next = await call();
      // The switch changes /api/config, which the whole dashboard reads.
      await refresh();
      toast.success(`${label} ${formatJudgeName(next.backend)} — applies to the next run`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch the judge");
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (backend: string, nextUrl?: string) =>
    apply("Judge set to", () => api.setJudge(backend, nextUrl));

  const reset = () => apply("Reverted to the configured judge:", () => api.resetJudge());

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Judge</span>
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {BACKENDS.map((backend) => (
            <button
              key={backend.id}
              type="button"
              disabled={busy}
              title={backend.hint}
              aria-pressed={selected === backend.id}
              onClick={() => switchTo(backend.id, backend.id === "smol" ? url.trim() || undefined : undefined)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                selected === backend.id
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {backend.label}
            </button>
          ))}
        </div>

        {judge.source === "override" ? (
          <>
            <span
              className="rounded-full bg-warning/15 px-2 py-0.5 text-[0.7rem] font-medium text-warning"
              title={`Switched from the dashboard. The deployment itself configures ${formatJudgeName(judge.envBackend)}.`}
            >
              overridden
            </span>
            <Button variant="ghost" size="sm" onClick={reset} disabled={busy} className="h-7 gap-1 text-xs">
              <RotateCcw className="h-3 w-3" aria-hidden />
              Reset
            </Button>
          </>
        ) : null}

        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden /> : null}
      </div>

      {selected === "smol" ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="judge-url" className="text-xs text-muted-foreground">
            Ollama
          </label>
          <Input
            id="judge-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="http://host.docker.internal:11434"
            spellCheck={false}
            className="h-8 max-w-sm flex-1 font-mono text-xs"
          />
          <Button
            size="sm"
            variant={urlDirty ? "default" : "outline"}
            disabled={busy || !urlDirty}
            onClick={() => switchTo("smol", url.trim())}
            className="h-8 gap-1 text-xs"
          >
            <Check className="h-3 w-3" aria-hidden />
            Use this host
          </Button>
        </div>
      ) : null}

      <p className="text-[0.7rem] text-muted-foreground">
        Applies to the next run — a run already in flight keeps the judge it started with.
      </p>
    </div>
  );
}
