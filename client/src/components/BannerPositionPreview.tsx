import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Move, RotateCcw, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BannerPositionPreviewProps {
  bannerUrl: string;
  bannerName?: string;
  onApply?: (positionData: { positionX: number; positionY: number; scale: number; bannerUrl: string }) => void;
  onCancel?: () => void;
  isCustomUpload?: boolean;
  initialPosition?: { x: number; y: number };
  initialScale?: number;
}

export function BannerPositionPreview({ 
  bannerUrl,
  bannerName,
  onApply,
  onCancel,
  isCustomUpload = false,
  initialPosition = { x: 0, y: 0 },
  initialScale = 1
}: BannerPositionPreviewProps) {
  const [position, setPosition] = useState(initialPosition);
  const [scale, setScale] = useState(initialScale);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.5, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev / 1.5, 0.5));
  }, []);

  const calculateFitToWidthScale = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return 1;
    
    const container = containerRef.current;
    const image = imageRef.current;
    
    const containerWidth = container.offsetWidth;
    const imageNaturalWidth = image.naturalWidth;
    
    if (imageNaturalWidth === 0) return 1;
    
    // Calculate scale to fit image width to container width with slight overflow for better cropping
    const widthScale = containerWidth / imageNaturalWidth;
    // Ensure minimum scale that covers the full width
    return Math.max(widthScale * 1.1, 1); // 10% larger than exact fit for better coverage
  }, []);

  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);
    // Auto-scale to fit width after image loads
    setTimeout(() => {
      const autoScale = calculateFitToWidthScale();
      setScale(autoScale);
      setPosition({ x: 0, y: 0 }); // Reset position when auto-scaling
    }, 100); // Small delay to ensure DOM is ready
  }, [calculateFitToWidthScale]);

  const handleReset = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    const autoScale = calculateFitToWidthScale();
    setScale(autoScale);
  }, [calculateFitToWidthScale]);

  const handleApply = useCallback(() => {
    if (onApply) {
      onApply({
        positionX: position.x,
        positionY: position.y,
        scale: scale,
        bannerUrl: bannerUrl
      });
      
      toast({
        title: "Banner applied!",
        description: `${bannerName || 'Banner'} has been positioned successfully.`,
        variant: "gamefolioSuccess",
      });
    }
  }, [position, scale, bannerUrl, bannerName, onApply, toast]);

  const handleCancel = useCallback(() => {
    setPosition(initialPosition);
    setScale(initialScale);
    onCancel?.();
  }, [initialPosition, initialScale, onCancel]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Move className="h-5 w-5" />
          Position Your Banner
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {bannerName && `Repositioning: ${bannerName}`}
        </p>
        <p className="text-sm text-muted-foreground">
          Drag to reposition and use zoom controls to fit your banner perfectly
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview Container */}
        <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden border border-border">
          <div 
            ref={containerRef}
            className="relative w-full h-full cursor-move select-none"
            onMouseDown={handleMouseDown}
          >
            <img
              ref={imageRef}
              src={bannerUrl}
              alt="Banner preview"
              className="absolute w-full h-full object-contain transition-transform duration-75"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center',
              }}
              onLoad={handleImageLoad}
              draggable={false}
            />
            
            {/* Overlay with positioning hint */}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
              <div className="bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium">
                {isDragging ? 'Drag to reposition' : 'Click and drag to position'}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
            >
              −
            </Button>
            <span className="text-sm font-medium w-16 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={scale >= 3}
            >
              +
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              title="Fit to width and reset position"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const autoScale = calculateFitToWidthScale();
                setScale(autoScale);
              }}
              title="Auto-fit image to banner width"
              className="text-xs px-2"
            >
              Auto Fit
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleApply}
            >
              Apply Position
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}