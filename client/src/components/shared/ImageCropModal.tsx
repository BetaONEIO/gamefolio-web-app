import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw, Crop, X } from "lucide-react";

interface ImageCropModalProps {
  file: File | null;
  onConfirm: (croppedFile: File) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export default function ImageCropModal({ file, onConfirm, onSkip, onCancel }: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // minZoom = fit-cover zoom so the image always fills the crop square
  const [minZoom, setMinZoom] = useState(0.1);
  const [zoom, setZoom] = useState(0.1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [applying, setApplying] = useState(false);

  const CROP_SIZE = 480;

  useEffect(() => {
    if (!file) return;
    setOffset({ x: 0, y: 0 });
    setImageLoaded(false);

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;

      // Fit-contain: scale so the entire image is visible inside the crop square.
      // User can zoom in from here to choose their crop.
      const containZoom = Math.min(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
      setMinZoom(containZoom);
      setZoom(containZoom);
      setOffset({ x: 0, y: 0 });
      setImageLoaded(true);
    };
    img.src = URL.createObjectURL(file);
    return () => { URL.revokeObjectURL(img.src); };
  }, [file]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = CROP_SIZE;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    const scaledW = img.naturalWidth * zoom;
    const scaledH = img.naturalHeight * zoom;
    const drawX = size / 2 - scaledW / 2 + offset.x;
    const drawY = size / 2 - scaledH / 2 + offset.y;

    ctx.drawImage(img, drawX, drawY, scaledW, scaledH);

    ctx.strokeStyle = "#B7FF1A";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    const third = size / 3;
    ctx.strokeStyle = "rgba(183,255,26,0.25)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(third * i, 0); ctx.lineTo(third * i, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, third * i); ctx.lineTo(size, third * i); ctx.stroke();
    }
  }, [zoom, offset]);

  useEffect(() => {
    if (imageLoaded) draw();
  }, [imageLoaded, draw]);

  const clampOffset = useCallback((ox: number, oy: number, z: number) => {
    const img = imgRef.current;
    if (!img) return { x: ox, y: oy };
    const scaledW = img.naturalWidth * z;
    const scaledH = img.naturalHeight * z;
    const maxX = Math.max(0, (scaledW - CROP_SIZE) / 2);
    const maxY = Math.max(0, (scaledH - CROP_SIZE) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const raw = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
    setOffset(clampOffset(raw.x, raw.y, zoom));
  };
  const handleMouseUp = () => setIsDragging(false);

  const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y, dist: 0 };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current = { x: 0, y: 0, dist: Math.hypot(dx, dy) };
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStartRef.current) return;
    if (e.touches.length === 1 && touchStartRef.current.dist === 0) {
      const raw = { x: e.touches[0].clientX - touchStartRef.current.x, y: e.touches[0].clientY - touchStartRef.current.y };
      setOffset(prev => clampOffset(raw.x, raw.y, zoom));
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / touchStartRef.current.dist;
      const newZoom = Math.max(minZoom, Math.min(5, zoom * ratio));
      setZoom(newZoom);
      touchStartRef.current = { ...touchStartRef.current, dist: newDist };
    }
  };
  const handleTouchEnd = () => { touchStartRef.current = null; };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(minZoom, Math.min(5, zoom + delta));
    setZoom(newZoom);
    setOffset(prev => clampOffset(prev.x, prev.y, newZoom));
  };

  const handleZoomChange = (val: number[]) => {
    const newZoom = val[0];
    setZoom(newZoom);
    setOffset(prev => clampOffset(prev.x, prev.y, newZoom));
  };

  // Reset returns to the initial fit-cover view
  const handleReset = () => {
    setZoom(minZoom);
    setOffset({ x: 0, y: 0 });
  };

  const handleApply = async () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !file) return;
    setApplying(true);

    const out = document.createElement("canvas");
    out.width = CROP_SIZE;
    out.height = CROP_SIZE;
    const ctx = out.getContext("2d");
    if (!ctx) return;

    const scaledW = img.naturalWidth * zoom;
    const scaledH = img.naturalHeight * zoom;
    const drawX = CROP_SIZE / 2 - scaledW / 2 + offset.x;
    const drawY = CROP_SIZE / 2 - scaledH / 2 + offset.y;
    ctx.drawImage(img, drawX, drawY, scaledW, scaledH);

    out.toBlob((blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], file.name, { type: "image/png" });
      setApplying(false);
      onConfirm(croppedFile);
    }, "image/png");
  };

  if (!file) return null;

  return (
    <Dialog open={!!file} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-[600px] w-full p-4 gap-3 bg-background border-border">
        <DialogHeader className="pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Crop className="h-4 w-4 text-primary" />
            Crop & Zoom
            <span className="text-xs text-muted-foreground font-normal ml-auto">Drag to pan • Pinch/scroll to zoom</span>
          </DialogTitle>
        </DialogHeader>

        <div
          ref={containerRef}
          className="relative mx-auto overflow-hidden rounded-lg cursor-move select-none"
          style={{ width: CROP_SIZE, height: CROP_SIZE, touchAction: "none" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={CROP_SIZE}
            height={CROP_SIZE}
            className="rounded-lg"
            style={{ display: imageLoaded ? "block" : "none" }}
          />
        </div>

        <div className="space-y-2 px-1">
          <div className="flex items-center gap-3">
            <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              min={minZoom}
              max={5}
              step={0.01}
              value={[zoom]}
              onValueChange={handleZoomChange}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Skip
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!imageLoaded || applying}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {applying ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            ) : (
              <Crop className="h-4 w-4 mr-1" />
            )}
            Apply Crop
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
