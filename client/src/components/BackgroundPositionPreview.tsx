import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Move, RotateCcw, X } from "lucide-react";
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

  const startDrag = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY, posX, posY });
  }, [posX, posY]);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    const pxPercent = (dx / rect.width) * 100;
    const pyPercent = (dy / rect.height) * 100;
    setPosX(Math.max(0, Math.min(100, dragStart.posX - pxPercent)));
    setPosY(Math.max(0, Math.min(100, dragStart.posY - pyPercent)));
  }, [isDragging, dragStart]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  }, [startDrag]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, [startDrag]);

  const handleMouseMove = useCallback((e: MouseEvent) => moveDrag(e.clientX, e.clientY), [moveDrag]);
  const handleTouchMove = useCallback((e: TouchEvent) => moveDrag(e.touches[0].clientX, e.touches[0].clientY), [moveDrag]);
  const handleDragEnd = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleTouchMove, handleDragEnd]);

  const handleReset = useCallback(() => { setPosX(50); setPosY(50); }, []);

  const handleApply = useCallback(() => {
    onApply?.({ positionX: Math.round(posX), positionY: Math.round(posY) });
    toast({ title: "Position saved!", description: "Your background image position has been applied.", variant: "gamefolioSuccess" });
  }, [posX, posY, onApply, toast]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Move className="h-4 w-4" />
          Adjust Background Position
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Drag to choose which part of the image shows on your profile.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 9:16 crop preview — full width, portrait */}
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-lg border border-border cursor-move select-none"
          style={{ aspectRatio: '9 / 16' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: `${posX}% ${posY}%`,
            }}
          />
          {/* Hint overlay */}
          <div className={`absolute inset-0 bg-black/20 flex items-end justify-center pb-4 transition-opacity pointer-events-none ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
            <div className="bg-black/70 text-white px-3 py-1 rounded-md text-xs flex items-center gap-1">
              <Move className="h-3 w-3" />
              {isDragging ? 'Dragging…' : 'Drag to reposition'}
            </div>
          </div>
        </div>

        {/* Controls — same layout as BannerPositionPreview */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1 w-full sm:w-auto">
            <RotateCcw className="h-3 w-3" />
            Reset to Centre
          </Button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={onCancel} className="flex-1 sm:flex-none gap-1">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply} className="flex-1 sm:flex-none">
              Apply Position
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
