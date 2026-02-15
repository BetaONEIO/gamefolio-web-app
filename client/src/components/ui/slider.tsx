import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, ...props }, ref) => {
  const thumbCount = value?.length ?? defaultValue?.length ?? 1;

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      value={value}
      defaultValue={defaultValue}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }).map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  );
})
Slider.displayName = SliderPrimitive.Root.displayName

interface DualRangeSliderProps {
  value: [number, number];
  min: number;
  max: number;
  step?: number;
  minGap?: number;
  onValueChange: (values: [number, number]) => void;
  className?: string;
}

const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  value,
  min,
  max,
  step = 0.1,
  minGap = 0.5,
  onValueChange,
  className,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [activeThumb, setActiveThumb] = React.useState<'start' | 'end' | null>(null);
  const valuesRef = React.useRef(value);
  valuesRef.current = value;

  const startPercent = ((value[0] - min) / (max - min)) * 100;
  const endPercent = ((value[1] - min) / (max - min)) * 100;

  const getValueFromPosition = React.useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return min;
    const rect = container.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + percent * (max - min);
    return Math.round(raw / step) * step;
  }, [min, max, step]);

  const handlePointerDown = React.useCallback((e: React.PointerEvent) => {
    const clickValue = getValueFromPosition(e.clientX);
    const distToStart = Math.abs(clickValue - valuesRef.current[0]);
    const distToEnd = Math.abs(clickValue - valuesRef.current[1]);
    const thumb = distToStart <= distToEnd ? 'start' : 'end';
    setActiveThumb(thumb);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (thumb === 'start') {
      const clamped = Math.max(min, Math.min(clickValue, valuesRef.current[1] - minGap));
      onValueChange([clamped, valuesRef.current[1]]);
    } else {
      const clamped = Math.min(max, Math.max(clickValue, valuesRef.current[0] + minGap));
      onValueChange([valuesRef.current[0], clamped]);
    }
  }, [getValueFromPosition, min, max, minGap, onValueChange]);

  const handlePointerMove = React.useCallback((e: React.PointerEvent) => {
    if (!activeThumb) return;
    const newVal = getValueFromPosition(e.clientX);

    if (activeThumb === 'start') {
      const clamped = Math.max(min, Math.min(newVal, valuesRef.current[1] - minGap));
      onValueChange([clamped, valuesRef.current[1]]);
    } else {
      const clamped = Math.min(max, Math.max(newVal, valuesRef.current[0] + minGap));
      onValueChange([valuesRef.current[0], clamped]);
    }
  }, [activeThumb, getValueFromPosition, min, max, minGap, onValueChange]);

  const handlePointerUp = React.useCallback(() => {
    setActiveThumb(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-8 flex items-center cursor-pointer select-none touch-none", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="relative h-2 w-full rounded-full bg-zinc-700">
        <div
          className="absolute h-full rounded-full"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          }}
        />
      </div>

      <div
        className={cn(
          "absolute w-5 h-5 rounded-full border-[3px] border-indigo-500 bg-white -translate-x-1/2 transition-transform",
          activeThumb === 'start' ? 'scale-125 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'shadow-[0_0_6px_rgba(99,102,241,0.6)] hover:scale-110'
        )}
        style={{ left: `${startPercent}%` }}
      />

      <div
        className={cn(
          "absolute w-5 h-5 rounded-full border-[3px] border-violet-500 bg-white -translate-x-1/2 transition-transform",
          activeThumb === 'end' ? 'scale-125 shadow-[0_0_10px_rgba(139,92,246,0.8)]' : 'shadow-[0_0_6px_rgba(139,92,246,0.6)] hover:scale-110'
        )}
        style={{ left: `${endPercent}%` }}
      />
    </div>
  );
};

export { Slider, DualRangeSlider }
