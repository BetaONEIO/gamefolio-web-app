import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Move, RotateCcw, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BackgroundPositionPreviewProps {
  imageUrl: string;
  label?: string;
  aspectRatio?: string;
  initialPositionX?: number;
  initialPositionY?: number;
  initialZoom?: number;
  readOnly?: boolean;
  onApply?: (data: { positionX: number; positionY: number; zoom: number }) => void;
  onCancel?: () => void;
}

export function BackgroundPositionPreview({
  imageUrl,
  label,
  aspectRatio,
  initialPositionX = 50,
  initialPositionY = 50,
  initialZoom = 100,
  readOnly = false,
  onApply,
  onCancel,
}: BackgroundPositionPreviewProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();

  const calculateFitToWidthScale = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return 1;
    const container = containerRef.current;
    const image = imageRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const imageNaturalWidth = image.naturalWidth;
    const imageNaturalHeight = image.naturalHeight;
    if (imageNaturalWidth === 0 || imageNaturalHeight === 0) return 1;
    const widthScale = containerWidth / imageNaturalWidth;
    const heightScale = containerHeight / imageNaturalHeight;
    return Math.max(widthScale, heightScale) * 1.05;
  }, []);

  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);
    setTimeout(() => {
      const autoScale = calculateFitToWidthScale();
      setScale(autoScale);
      setPosition({ x: 0, y: 0 });
    }, 100);
  }, [calculateFitToWidthScale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position, readOnly]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (readOnly) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  }, [position, readOnly]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const handleZoomIn = useCallback(() => setScale(prev => Math.min(prev * 1.5, 3)), []);
  const handleZoomOut = useCallback(() => setScale(prev => Math.max(prev / 1.5, 0.5)), []);

  const handleReset = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    const autoScale = calculateFitToWidthScale();
    setScale(autoScale);
  }, [calculateFitToWidthScale]);

  const handleApply = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;
    const img = imageRef.current;
    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const scaledW = img.naturalWidth * scale;
    const scaledH = img.naturalHeight * scale;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const posXPercent = clamp(((scaledW / 2 - position.x) / scaledW) * 100, 0, 100);
    const posYPercent = clamp(((scaledH / 2 - position.y) / scaledH) * 100, 0, 100);
    const zoomPercent = Math.round((scaledW / containerWidth) * 100);
    onApply?.({ positionX: Math.round(posXPercent), positionY: Math.round(posYPercent), zoom: zoomPercent });
    toast({ title: "Position saved!", description: "Your background image position has been applied.", variant: "gamefolioSuccess" });
  }, [position, scale, onApply, toast]);

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Move className="h-4 w-4" />
          {label || "Adjust Background Position"}
        </CardTitle>
        {!readOnly && (
          <p className="text-xs text-muted-foreground">
            Drag to reposition and use zoom controls to fit your background perfectly.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="relative w-full bg-muted rounded-lg overflow-hidden border border-border"
          style={aspectRatio ? { aspectRatio } : { height: '16rem' }}
        >
          <div
            ref={containerRef}
            className={`relative w-full h-full select-none ${readOnly ? 'cursor-default' : 'cursor-move'}`}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Background preview"
              className="absolute w-full h-full object-contain transition-transform duration-75"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center',
              }}
              onLoad={handleImageLoad}
              draggable={false}
            />
            {!readOnly && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                <div className="bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium">
                  {isDragging ? 'Dragging…' : 'Click and drag to position'}
                </div>
              </div>
            )}
          </div>
        </div>

        {readOnly ? (
          <p className="text-xs text-muted-foreground text-center italic">
            View on desktop to edit this crop
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={scale <= 0.5}>−</Button>
              <span className="text-sm font-medium w-16 text-center">{Math.round(scale * 100)}%</span>
              <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={scale >= 3}>+</Button>
              <Button variant="outline" size="sm" onClick={handleReset} title="Fit to width and reset position">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { const s = calculateFitToWidthScale(); setScale(s); }}
                title="Auto-fit image to container width"
                className="text-xs px-2"
              >
                Auto Fit
              </Button>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={handleCancel} className="flex-1 sm:flex-none gap-1">
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply} className="flex-1 sm:flex-none">
                Apply Position
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
