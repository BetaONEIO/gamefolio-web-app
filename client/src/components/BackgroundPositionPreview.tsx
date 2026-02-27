import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Move, RotateCcw, X, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BackgroundPositionPreviewProps {
  imageUrl: string;
  initialPositionX?: number;
  initialPositionY?: number;
  onApply?: (data: { positionX: number; positionY: number }) => void;
  onCancel?: () => void;
}

export function BackgroundPositionPreview({
  imageUrl,
  initialPositionX = 50,
  initialPositionY = 50,
  onApply,
  onCancel,
}: BackgroundPositionPreviewProps) {
  const [posX, setPosX] = useState(initialPositionX);
  const [posY, setPosY] = useState(initialPositionY);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 50, posY: 50 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, posX, posY });
  }, [posX, posY]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY, posX, posY });
  }, [posX, posY]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    // Convert pixel drag to percentage change (inverted: drag right → moves focal point left)
    const pxPercent = (dx / rect.width) * 100;
    const pyPercent = (dy / rect.height) * 100;
    setPosX(Math.max(0, Math.min(100, dragStart.posX - pxPercent)));
    setPosY(Math.max(0, Math.min(100, dragStart.posY - pyPercent)));
  }, [isDragging, dragStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const dx = touch.clientX - dragStart.x;
    const dy = touch.clientY - dragStart.y;
    const pxPercent = (dx / rect.width) * 100;
    const pyPercent = (dy / rect.height) * 100;
    setPosX(Math.max(0, Math.min(100, dragStart.posX - pxPercent)));
    setPosY(Math.max(0, Math.min(100, dragStart.posY - pyPercent)));
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleTouchMove, handleMouseUp]);

  const handleReset = useCallback(() => {
    setPosX(50);
    setPosY(50);
  }, []);

  const handleApply = useCallback(() => {
    onApply?.({ positionX: Math.round(posX), positionY: Math.round(posY) });
    toast({
      title: "Position saved!",
      description: "Your background image position has been applied.",
      variant: "gamefolioSuccess",
    });
  }, [posX, posY, onApply, toast]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="h-4 w-4" />
          Adjust Background Position
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Drag the preview to choose which part of the image is shown on your profile. The frame shows the mobile view.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mobile frame preview */}
        <div className="flex justify-center">
          <div className="relative" style={{ width: 200, height: 360 }}>
            {/* Phone bezel */}
            <div className="absolute inset-0 rounded-3xl border-4 border-foreground/30 bg-black z-10 pointer-events-none" />
            {/* Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2 bg-foreground/20 rounded-full z-20 pointer-events-none" />
            {/* Image container — clips to phone frame */}
            <div
              ref={containerRef}
              className="absolute inset-1 rounded-2xl overflow-hidden cursor-move select-none"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: `${posX}% ${posY}%`,
                }}
              />
              {/* Drag hint overlay */}
              <div className={`absolute inset-0 bg-black/25 flex items-end justify-center pb-4 transition-opacity ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
                <div className="bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                  <Move className="h-3 w-3" />
                  Drag to reposition
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Position readout */}
        <p className="text-center text-xs text-muted-foreground">
          Position: {Math.round(posX)}% × {Math.round(posY)}%
        </p>

        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="gap-1">
              <X className="h-3 w-3" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
