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
  const trackRef = React.useRef<HTMLDivElement>(null);

  const startPercent = ((value[0] - min) / (max - min)) * 100;
  const endPercent = ((value[1] - min) / (max - min)) * 100;

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseFloat(e.target.value);
    const clamped = Math.min(newStart, value[1] - minGap);
    onValueChange([Math.max(min, clamped), value[1]]);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = parseFloat(e.target.value);
    const clamped = Math.max(newEnd, value[0] + minGap);
    onValueChange([value[0], Math.min(max, clamped)]);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div ref={trackRef} className="relative h-2 w-full rounded-full bg-secondary">
        <div
          className="absolute h-full bg-primary rounded-full"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`,
          }}
        />
      </div>

      <input
        type="range"
        min={min}
        max={value[1] - minGap}
        step={step}
        value={value[0]}
        onChange={handleStartChange}
        className="absolute top-0 left-0 w-full h-2 appearance-none bg-transparent pointer-events-none z-10
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
          [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary
          [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:cursor-grab
          [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:shadow-sm
          [&::-webkit-slider-thumb]:ring-offset-background
          [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform
          [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary
          [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:cursor-grab"
      />

      <input
        type="range"
        min={value[0] + minGap}
        max={max}
        step={step}
        value={value[1]}
        onChange={handleEndChange}
        className="absolute top-0 left-0 w-full h-2 appearance-none bg-transparent pointer-events-none z-20
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
          [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary
          [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:cursor-grab
          [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:shadow-sm
          [&::-webkit-slider-thumb]:ring-offset-background
          [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform
          [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary
          [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:cursor-grab"
      />
    </div>
  );
};

export { Slider, DualRangeSlider }
