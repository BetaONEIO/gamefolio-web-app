import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BackgroundUploadPreviewProps {
  onUpload?: (url: string) => void;
  onCancel?: () => void;
  isUploading?: boolean;
}

const OVERFLOW_PADDING = 40;
const MAX_SCALE = 4;
const CROP_ASPECT = 9 / 16;

export function BackgroundUploadPreview({
  onUpload,
  onCancel,
  isUploading = false,
}: BackgroundUploadPreviewProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [imageNaturalSize, setImageNaturalSize] = useState({ w: 0, h: 0 });
  const [showEditor, setShowEditor] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenImageRef = useRef<HTMLImageElement>(null);
  const visibleImageRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const cropH = containerHeight > 0 ? containerHeight : 400;
  const cropW = Math.round(cropH * CROP_ASPECT);
  const stageWidth = cropW + OVERFLOW_PADDING * 2;

  const fileSelectedRef = useRef(false);

  useEffect(() => {
    if (!previewUrl && fileInputRef.current) {
      fileSelectedRef.current = false;
      fileInputRef.current.click();
      const handleFocus = () => {
        setTimeout(() => {
          if (!fileSelectedRef.current) {
            onCancel?.();
          }
        }, 500);
      };
      window.addEventListener('focus', handleFocus, { once: true });
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      if (h > 0) setContainerHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [showEditor]);

  const clampPosition = useCallback(
    (x: number, y: number, s: number, natW: number, natH: number, cW: number, cH: number) => {
      const scaledW = natW * s;
      const scaledH = natH * s;
      const maxX = Math.max(0, (scaledW - cW) / 2);
      const maxY = Math.max(0, (scaledH - cH) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    []
  );

  const computeMinScale = useCallback((natW: number, natH: number, cW: number, cH: number) => {
    if (!natW || !natH || !cW || !cH) return 1;
    return Math.max(cW / natW, cH / natH);
  }, []);

  useEffect(() => {
    if (!showEditor || containerHeight === 0 || imageNaturalSize.w === 0) return;
    const cW = Math.round(containerHeight * CROP_ASPECT);
    const fit = computeMinScale(imageNaturalSize.w, imageNaturalSize.h, cW, containerHeight);
    setMinScale(fit);
    setScale(fit);
    setPosition({ x: 0, y: 0 });
  }, [showEditor, containerHeight, imageNaturalSize, computeMinScale]);

  const handleFileSelect = useCallback(
    (file: File) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast({ title: 'Invalid file type', description: 'Please select JPEG, PNG, or WebP.', variant: 'destructive' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Image must be under 10MB.', variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPosition({ x: 0, y: 0 });
      setScale(1);
      setImageNaturalSize({ w: 0, h: 0 });
      setShowEditor(false);
    },
    [toast]
  );

  const handleImageLoad = useCallback(() => {
    const img = hiddenImageRef.current;
    if (!img) return;
    setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setShowEditor(true);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      fileSelectedRef.current = true;
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = position.x;
    const startPosY = position.y;
    const cW = Math.round(containerHeight * CROP_ASPECT);

    const onMove = (ev: MouseEvent) => {
      ev.preventDefault();
      setPosition(clampPosition(
        startPosX + ev.clientX - startX,
        startPosY + ev.clientY - startY,
        scale, imageNaturalSize.w, imageNaturalSize.h, cW, containerHeight
      ));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [position, scale, imageNaturalSize, containerHeight, clampPosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    const startPosX = position.x;
    const startPosY = position.y;
    const cW = Math.round(containerHeight * CROP_ASPECT);

    const onMove = (ev: TouchEvent) => {
      if (ev.touches.length !== 1) return;
      ev.preventDefault();
      const t = ev.touches[0];
      setPosition(clampPosition(
        startPosX + t.clientX - startX,
        startPosY + t.clientY - startY,
        scale, imageNaturalSize.w, imageNaturalSize.h, cW, containerHeight
      ));
    };
    const onEnd = () => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }, [position, scale, imageNaturalSize, containerHeight, clampPosition]);

  const handleScaleChange = useCallback((newScale: number) => {
    const cW = Math.round(containerHeight * CROP_ASPECT);
    setScale(newScale);
    setPosition(prev => clampPosition(prev.x, prev.y, newScale, imageNaturalSize.w, imageNaturalSize.h, cW, containerHeight));
  }, [imageNaturalSize, containerHeight, clampPosition]);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPosition({ x: 0, y: 0 });
    setScale(1);
    setShowEditor(false);
    onCancel?.();
  }, [onCancel]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !onUpload) return;

    try {
      setUploading(true);
      const img = hiddenImageRef.current || visibleImageRef.current;
      if (!img) throw new Error('Image not available');

      const { w: natW, h: natH } = imageNaturalSize;
      if (!natW || !natH) throw new Error('Image dimensions not available');

      const cW = Math.round(containerHeight * CROP_ASPECT);
      const cH = containerHeight;
      if (!cH) throw new Error('Container not measured yet');

      const srcW = cW / scale;
      const srcH = cH / scale;
      const srcX = natW / 2 - srcW / 2 - position.x / scale;
      const srcY = natH / 2 - srcH / 2 - position.y / scale;

      const exportW = 1080;
      const exportH = 1920;

      const canvas = document.createElement('canvas');
      canvas.width = exportW;
      canvas.height = exportH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, exportW, exportH);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas to blob failed')), 'image/jpeg', 0.95);
      });

      const formData = new FormData();
      formData.append('backgroundImage', blob, 'background.jpg');

      const response = await fetch('/api/upload/profile-background', { method: 'POST', body: formData });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || `HTTP ${response.status}: Upload failed`);
      if (!result.url) throw new Error('No URL returned from server');

      onUpload(result.url);
      handleCancel();
    } catch (error) {
      console.error('Background upload error:', error);
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [selectedFile, position, scale, imageNaturalSize, containerHeight, onUpload, toast, handleCancel]);

  if (!previewUrl) {
    return (
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileInputChange} className="hidden" />
    );
  }

  return (
    <>
      <img ref={hiddenImageRef} src={previewUrl} alt="" className="hidden" onLoad={handleImageLoad} />

      <Dialog open={!!previewUrl} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent className="max-w-sm w-[95vw] p-0 bg-background border overflow-hidden gap-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Edit background image</DialogTitle>
          <DialogDescription className="sr-only">Drag and zoom to position your background image, then click Apply.</DialogDescription>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-3">
              <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold">Edit media</h2>
            </div>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading || isUploading || !showEditor}
              size="sm"
            >
              {(uploading || isUploading)
                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Uploading...</>
                : 'Apply'
              }
            </Button>
          </div>

          <div
            className="relative overflow-hidden bg-black select-none cursor-move mx-auto"
            style={{ width: stageWidth > 0 ? stageWidth : 280, height: '70vh' }}
          >
            <div
              ref={stageRef}
              className="absolute"
              style={{
                left: OVERFLOW_PADDING,
                top: 0,
                width: cropW > 0 ? cropW : 200,
                height: '100%',
              }}
              onMouseDown={showEditor ? handleMouseDown : undefined}
              onTouchStart={showEditor ? handleTouchStart : undefined}
            >
              {showEditor && (
                <img
                  ref={visibleImageRef}
                  src={previewUrl}
                  alt="Background preview"
                  className="pointer-events-none absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    maxWidth: 'none',
                    width: imageNaturalSize.w,
                    height: imageNaturalSize.h,
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                    transformOrigin: 'center center',
                  }}
                  draggable={false}
                />
              )}
            </div>

            {showEditor && (
              <>
                <div
                  className="absolute top-0 bottom-0 left-0 pointer-events-none bg-black/60"
                  style={{ width: OVERFLOW_PADDING }}
                />
                <div
                  className="absolute top-0 bottom-0 right-0 pointer-events-none bg-black/60"
                  style={{ width: OVERFLOW_PADDING }}
                />
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: OVERFLOW_PADDING,
                    width: cropW > 0 ? cropW : 200,
                    border: '2px solid #1d9bf0',
                    boxSizing: 'border-box',
                  }}
                />
              </>
            )}
          </div>

          {showEditor && (
            <div className="flex items-center gap-3 px-6 py-3 border-t">
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => handleScaleChange(Math.max(minScale, scale / 1.15))}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <input
                type="range"
                min={minScale}
                max={MAX_SCALE}
                step={0.001}
                value={scale}
                onChange={e => handleScaleChange(parseFloat(e.target.value))}
                className="flex-1 accent-[#1d9bf0] cursor-pointer"
              />
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => handleScaleChange(Math.min(MAX_SCALE, scale * 1.15))}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
