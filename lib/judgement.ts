import type { Judgement, JudgementLabel } from "@/types";
import type { Dict } from "@/lib/i18n";

/** Best first. The judge was trained on exactly these four. */
export const LABEL_ORDER: JudgementLabel[] = ["exact", "wrong_version", "wrong_artist", "different"];

export function isJudgementLabel(value: string | null | undefined): value is JudgementLabel {
  return value != null && (LABEL_ORDER as string[]).includes(value);
}

/** Short verdict name in the active language ("Es esta", "Otra versión"…). */
export function verdictLabel(t: Dict, label: string | null | undefined): string {
  if (!label) return t.verdict.unlabelled;
  return isJudgementLabel(label) ? t.verdict[label] : label;
}

export function verdictDetail(t: Dict, label: string | null | undefined): string | undefined {
  return isJudgementLabel(label) ? t.verdict.detail[label] : undefined;
}

/** Colour class for a verdict: green only for exact, red for a different song, muted otherwise. */
export function verdictTone(label: string | null | undefined): string {
  switch (label) {
    case "exact":
      return "text-ok";
    case "wrong_artist":
    case "different":
      return "text-bad";
    default:
      return "text-muted-foreground";
  }
}

/** Score as 0–100. */
export const scorePct = (score: number | null | undefined) => Math.round(Math.max(0, Math.min(1, score ?? 0)) * 100);

/**
 * The verdict that decided this candidate: a manual pick wins, then a labelled verdict, then the
 * first one. Only one judge produces a label, and the label is the interesting part.
 */
export function decidingJudgement(judgements: Judgement[] | undefined): Judgement | null {
  if (!judgements?.length) return null;
  return judgements.find((j) => j.judge === "manual") ?? judgements.find((j) => j.label) ?? judgements[0];
}

export function formatJudgeName(judge: string): string {
  switch (judge) {
    case "smol-judge":
      return "Smol judge";
    case "levenshtein":
      return "Levenshtein";
    case "relative_mi":
      return "Relative MI";
    case "manual":
      return "Manual";
    default:
      return judge;
  }
}
