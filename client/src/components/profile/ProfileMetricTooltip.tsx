import type { CSSProperties } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ProfileMetricLabel = "XP" | "Views";

export interface ProfileSeasonStats {
  seasonName: string;
  seasonNumber: number;
  seasonXP: number;
  seasonViews: number;
}

function finiteValue(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Compact profile display format: 69,168 becomes 69.2k. */
export function formatProfileMetric(value: number): string {
  const safeValue = finiteValue(value);
  return safeValue >= 1000
    ? `${(safeValue / 1000).toFixed(1)}k`
    : safeValue.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function formatExactMetric(value: number): string {
  return finiteValue(value).toLocaleString("en-US", {
    maximumFractionDigits: 3,
  });
}

interface ProfileMetricTooltipProps {
  label: ProfileMetricLabel;
  value: number;
  seasonValue?: number;
  seasonName?: string;
  className?: string;
  style?: CSSProperties;
}

export function ProfileMetricTooltip({
  label,
  value,
  seasonValue,
  seasonName = "Current season",
  className,
  style,
}: ProfileMetricTooltipProps) {
  const unit = label === "XP" ? "XP" : "views";
  const hasSeasonValue = typeof seasonValue === "number" && Number.isFinite(seasonValue);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn("inline-flex cursor-help", className)}
            style={style}
            aria-label={`${formatExactMetric(value)} ${unit}. Hover for season details.`}
          >
            {formatProfileMetric(value)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="min-w-[180px] p-3">
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">{label}</p>
            <div className="flex items-center justify-between gap-5 text-xs">
              <span className="text-muted-foreground">Lifetime</span>
              <span className="font-semibold">{formatExactMetric(value)} {unit}</span>
            </div>
            <div className="flex items-center justify-between gap-5 text-xs">
              <span className="text-muted-foreground">
                {label === "XP" ? "Season XP" : "Season views"} · {seasonName}
              </span>
              <span className="font-semibold">
                {hasSeasonValue ? `${formatExactMetric(seasonValue!)} ${unit}` : "Unavailable"}
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}