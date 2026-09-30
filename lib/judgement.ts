import { CheckCircle2, CircleSlash, Shuffle, UserX, type LucideIcon } from "lucide-react";
import type { Judgement, JudgementLabel } from "@/types";
import type { Tone } from "@/lib/status";

export interface LabelMeta {
  label: string;
  /** What the verdict means, in the judge's own terms. Shown on hover and in the legend. */
  detail: string;
  tone: Tone;
  Icon: LucideIcon;
}

/**
 * Single source of truth for how each verdict is named and coloured.
 *
 * The wording comes from the taxonomy the model was trained on, so what the UI
 * claims a label means is what the label actually means. Order matters: the
 * distribution bar and the filter row both read it top-down, best first.
 */
export const LABEL_META: Record<JudgementLabel, LabelMeta> = {
  exact: {
    label: "Exact",
    detail: "The requested recording. Only these are downloaded.",
    tone: "success",
    Icon: CheckCircle2,
  },
  wrong_version: {
    label: "Wrong version",
    detail: "Right song, wrong recording — a remix, live take, edit or instrumental.",
    tone: "warning",
    Icon: Shuffle,
  },
  wrong_artist: {
    label: "Wrong artist",
    detail: "The title matches but a different act is performing.",
    tone: "danger",
    Icon: UserX,
  },
  different: {
    label: "Different track",
    detail: "An unrelated song that merely shares words with the request.",
    tone: "muted",
    Icon: CircleSlash,
  },
};

export const LABEL_ORDER: JudgementLabel[] = ["exact", "wrong_version", "wrong_artist", "different"];

export function isJudgementLabel(value: string | undefined): value is JudgementLabel {
  return value != null && value in LABEL_META;
}

/** Falls back to a neutral pill for a label the UI has not been taught. */
export function labelMeta(value: string | undefined): LabelMeta | null {
  if (!value) return null;
  if (isJudgementLabel(value)) return LABEL_META[value];
  return { label: value, detail: "Unrecognised verdict.", tone: "muted", Icon: CircleSlash };
}

/**
 * The verdict that decided this candidate.
 *
 * Several judges rule on every candidate but only one of them produces a label,
 * and the label is the interesting part — so a labelled verdict wins over an
 * unlabelled one regardless of the order they came back in.
 */
export function decidingJudgement(judgements: Judgement[] | undefined): Judgement | null {
  if (!judgements?.length) return null;
  return judgements.find((judgement) => judgement.label) ?? judgements[0];
}

/** `1.2s` past a second, `184ms` below it — a judge that got slow should look slow. */
export function formatLatency(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

export function formatJudgeName(judge: string): string {
  switch (judge) {
    case "smol-judge":
      return "Smol judge";
    case "levenshtein":
      return "Levenshtein";
    case "relative_mi":
      return "Relative MI";
    default:
      return judge;
  }
}

/** Coarse "how long ago", enough for a feed that refreshes every few seconds. */
export function formatAge(createdAtSecs: number, nowMs: number = Date.now()): string {
  const seconds = Math.max(0, Math.round(nowMs / 1000 - createdAtSecs));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
