import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarClock } from 'lucide-react';

export interface ScheduleLimits {
  isUnlimited: boolean;
  max: number | null;
  used: number;
  remaining: number | null;
}

interface ScheduleControlProps {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  value: string; // datetime-local string, e.g. "2026-07-01T18:30"
  onValueChange: (value: string) => void;
  limits?: ScheduleLimits;
  /** Plural noun for the hint copy, e.g. "clip", "reel", "screenshot". */
  contentNoun?: string;
}

// Minimum selectable time: a few minutes out so the worker has a moment to run.
function localMin(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleControl({
  enabled,
  onEnabledChange,
  value,
  onValueChange,
  limits,
  contentNoun = 'post',
}: ScheduleControlProps) {
  const noSlots = !!limits && !limits.isUnlimited && (limits.remaining ?? 0) <= 0;

  return (
    <div className="space-y-3 p-3 rounded-lg bg-muted/50 dark:bg-muted/20">
      <div className="flex items-start space-x-3">
        <Checkbox
          id="schedule-post"
          checked={enabled}
          onCheckedChange={(checked) => onEnabledChange(checked as boolean)}
          disabled={noSlots}
          data-testid="checkbox-schedule"
        />
        <div className="flex-1">
          <Label
            htmlFor="schedule-post"
            className="text-sm font-medium leading-none cursor-pointer flex items-center gap-1.5"
          >
            <CalendarClock className="h-4 w-4" />
            Schedule for later
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            {limits?.isUnlimited
              ? `Pick a date and time and your ${contentNoun} will publish automatically.`
              : noSlots
                ? `You've used all ${limits?.max} free scheduled-post slots. Publish or cancel one, or upgrade to Pro for unlimited scheduling.`
                : `Publish automatically at a future time.${
                    limits ? ` ${limits.remaining} of ${limits.max} free slots left.` : ''
                  }`}
          </p>
        </div>
      </div>
      {enabled && !noSlots && (
        <Input
          type="datetime-local"
          min={localMin()}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-full"
          data-testid="input-scheduled-at"
        />
      )}
    </div>
  );
}
