import {
  ArrowDownToLine,
  CheckCircle2,
  Loader2,
  Scale,
  Search,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { TrackStatus } from "@/types";

export type Tone = "primary" | "info" | "success" | "warning" | "danger" | "muted";

export interface StatusMeta {
  label: string;
  tone: Tone;
  Icon: LucideIcon;
  spin?: boolean;
}

/** Single source of truth for how each lifecycle state is labelled and coloured. */
export const STATUS_META: Record<TrackStatus, StatusMeta> = {
  [TrackStatus.SEARCHING]: { label: "Searching", tone: "info", Icon: Search },
  [TrackStatus.FILTERING]: { label: "Judging", tone: "info", Icon: Scale },
  [TrackStatus.DOWNLOADING]: { label: "Downloading", tone: "primary", Icon: ArrowDownToLine },
  [TrackStatus.FINALIZING]: { label: "Finalizing", tone: "warning", Icon: Loader2, spin: true },
  [TrackStatus.COMPLETED]: { label: "Completed", tone: "success", Icon: CheckCircle2 },
  [TrackStatus.FAILED]: { label: "Failed", tone: "danger", Icon: XCircle },
};

/** Soft "pill" treatment: tinted background + inset ring + saturated text of the same hue. */
export const TONE_SOFT: Record<Tone, string> = {
  primary: "bg-primary/12 text-primary ring-1 ring-inset ring-primary/25",
  info: "bg-info/12 text-info ring-1 ring-inset ring-info/25",
  success: "bg-success/12 text-success ring-1 ring-inset ring-success/25",
  warning: "bg-warning/15 text-warning ring-1 ring-inset ring-warning/30",
  danger: "bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25",
  muted: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};

export const TONE_FG: Record<Tone, string> = {
  primary: "text-primary",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  muted: "text-muted-foreground",
};

export const TONE_SOLID: Record<Tone, string> = {
  primary: "bg-primary",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  muted: "bg-muted-foreground",
};
