import { useEffect, useState } from "react";
import { toast } from "sonner";
import { data } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { formatJudgeName } from "@/lib/judgement";
import { useAppConfig } from "@/hooks/useAppConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/Spinner";
import { cn } from "@/lib/utils";

/**
 * Switches the judge without redeploying (admin only). The model runs far slower on a busy box,
 * so the control is "model, over there" as well as "model or not".
 */
export function JudgeSwitch({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const { judge, judgeThreshold, refresh } = useAppConfig();
  const [url, setUrl] = useState(judge.url ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUrl(judge.url ?? "");
  }, [judge.url]);

  const selected = judge.backend === "smol-judge" ? "smol" : "levenshtein";
  const urlDirty = selected === "smol" && url.trim() !== (judge.url ?? "");
  const backends = [
    { id: "levenshtein", label: t.system.judge.levenshtein, hint: t.system.judge.levenshteinHint },
    { id: "smol", label: t.system.judge.smol, hint: t.system.judge.smolHint },
  ];

  const apply = async (call: () => Promise<{ backend: string }>) => {
    setBusy(true);
    try {
      const next = await call();
      await refresh();
      toast(t.system.judge.switched(formatJudgeName(next.backend)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.somethingFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">{t.system.judge.backend}</span>
        <div className="inline-flex gap-0.5" role="radiogroup" aria-label={t.system.judge.backend}>
          {backends.map((backend) => (
            <button
              key={backend.id}
              type="button"
              role="radio"
              aria-checked={selected === backend.id}
              disabled={busy}
              title={backend.hint}
              onClick={() => apply(() => data.setJudge(backend.id, backend.id === "smol" ? url.trim() || undefined : undefined))}
              className={cn(
                "rounded-sm px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-50",
                selected === backend.id && "bg-raised text-foreground",
              )}
            >
              {backend.label}
            </button>
          ))}
        </div>
        {judge.model ? <code className="font-mono text-2xs text-muted-foreground">{judge.model}</code> : null}
        {judge.source === "override" ? (
          <>
            <span className="text-accent" title={formatJudgeName(judge.envBackend)}>
              {t.system.judge.overridden}
            </span>
            <Button variant="link" size="sm" disabled={busy} onClick={() => apply(() => data.resetJudge())}>
              {t.system.judge.reset}
            </Button>
          </>
        ) : null}
        {busy ? <Spinner className="text-muted-foreground" /> : null}
      </div>

      {selected === "smol" && !compact ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="judge-url" className="text-muted-foreground">
            {t.system.judge.ollama}
          </label>
          <Input
            id="judge-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="http://host.docker.internal:11434"
            spellCheck={false}
            className="h-7 max-w-xs flex-1 font-mono text-xs"
          />
          <Button size="sm" variant={urlDirty ? "default" : "outline"} disabled={busy || !urlDirty} onClick={() => apply(() => data.setJudge("smol", url.trim()))}>
            {t.system.judge.useHost}
          </Button>
        </div>
      ) : null}

      {!compact ? (
        <>
          <p className="text-muted-foreground">{t.system.judge.threshold(Math.round(judgeThreshold * 100))}</p>
          <p className="text-muted-foreground">{t.system.judge.appliesNext}</p>
        </>
      ) : null}
    </div>
  );
}
