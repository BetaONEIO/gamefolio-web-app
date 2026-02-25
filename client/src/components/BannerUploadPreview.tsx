import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BannerUploadPreviewProps {
  onUpload?: (bannerUrl: string) => void;
  onCancel?: () => void;
  currentBannerUrl?: string;
  isUploading?: boolean;
  isPro?: boolean;
}

const OVERFLOW_PADDING = 60;
const MAX_SCALE = 3;

export function BannerUploadPreview({
  onUpload,
  onCancel,
  currentBannerUrl,
  isUploading = false,
  isPro = false
}: BannerUploadPreviewProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [imageNaturalSize, setImageNaturalSize] = useState({ w: 0, h: 0 });
  const [showEditor, setShowEditor] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenImageRef = useRef<HTMLImageElement>(null);
  const visibleImageRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const bannerHeight = containerWidth > 0 ? Math.round(containerWidth / 3.5) : 200;
  const stageHeight = bannerHeight + OVERFLOW_PADDING * 2;

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
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [showEditor]);

  const clampPosition = useCallback(
    (x: number, y: number, s: number, natW: number, natH: number, cropW: number, cropH: number) => {
      const scaledW = natW * s;
      const scaledH = natH * s;
      const maxX = Math.max(0, (scaledW - cropW) / 2);
      const maxY = Math.max(0, (scaledH - cropH) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    []
  );

  const computeMinScale = useCallback((natW: number, natH: number, cropW: number, cropH: number) => {
    if (!natW || !natH || !cropW || !cropH) return 1;
    return Math.max(cropW / natW, cropH / natH);
  }, []);

  useEffect(() => {
    if (!showEditor || containerWidth === 0 || imageNaturalSize.w === 0) return;
    const bh = Math.round(containerWidth / 3.5);
    const fit = computeMinScale(imageNaturalSize.w, imageNaturalSize.h, containerWidth, bh);
    setMinScale(fit);
    setScale(fit);
    setPosition({ x: 0, y: 0 });
  }, [showEditor, containerWidth, imageNaturalSize, computeMinScale]);

  const handleFileSelect = useCallback(
    (file: File) => {
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        ...(isPro ? ['image/gif'] : []),
      ];
      const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');

      if (isGif && !isPro) {
        toast({ title: 'Pro feature', description: 'Animated GIF banners are a Pro perk. Upgrade to use GIF banners!', variant: 'destructive' });
        return;
      }
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast({ title: 'Invalid file type', description: isPro ? 'Please select JPEG, PNG, WebP, or GIF.' : 'Please select JPEG, PNG, or WebP.', variant: 'destructive' });
        return;
      }
      const maxSize = isGif ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({ title: 'File too large', description: isGif ? 'GIF must be under 10MB.' : 'Image must be under 5MB.', variant: 'destructive' });
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPosition({ x: 0, y: 0 });
      setScale(1);
      setImageNaturalSize({ w: 0, h: 0 });
      setShowEditor(false);
    },
    [toast, isPro]
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
    const bh = Math.round(containerWidth / 3.5);

    const onMove = (ev: MouseEvent) => {
      ev.preventDefault();
      setPosition(clampPosition(
        startPosX + ev.clientX - startX,
        startPosY + ev.clientY - startY,
        scale, imageNaturalSize.w, imageNaturalSize.h, containerWidth, bh
      ));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [position, scale, imageNaturalSize, containerWidth, clampPosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    const startPosX = position.x;
    const startPosY = position.y;
    const bh = Math.round(containerWidth / 3.5);

    const onMove = (ev: TouchEvent) => {
      if (ev.touches.length !== 1) return;
      ev.preventDefault();
      const t = ev.touches[0];
      setPosition(clampPosition(
        startPosX + t.clientX - startX,
        startPosY + t.clientY - startY,
        scale, imageNaturalSize.w, imageNaturalSize.h, containerWidth, bh
      ));
    };
    const onEnd = () => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }, [position, scale, imageNaturalSize, containerWidth, clampPosition]);

  const handleScaleChange = useCallback((newScale: number) => {
    const bh = Math.round(containerWidth / 3.5);
    setScale(newScale);
    setPosition(prev => clampPosition(prev.x, prev.y, newScale, imageNaturalSize.w, imageNaturalSize.h, containerWidth, bh));
  }, [imageNaturalSize, containerWidth, clampPosition]);

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
      const img = hiddenImageRef.current || visibleImageRef.current;
      if (!img) throw new Error('Image not available');

      const { w: natW, h: natH } = imageNaturalSize;
      if (!natW || !natH) throw new Error('Image dimensions not available');

      const cropW = containerWidth;
      const cropH = Math.round(containerWidth / 3.5);
      if (!cropW) throw new Error('Container not measured yet');

      const srcW = cropW / scale;
      const srcH = cropH / scale;
      const srcX = natW / 2 - srcW / 2 - position.x / scale;
      const srcY = natH / 2 - srcH / 2 - position.y / scale;

      const exportW = 1600;
      const exportH = Math.round(exportW * cropH / cropW);

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
      formData.append('banner', blob, 'banner.jpg');

      const response = await fetch('/api/upload/banner', { method: 'POST', body: formData });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || `HTTP ${response.status}: Upload failed`);
      if (!result.url) throw new Error('No URL returned from server');

      onUpload(result.url);
      handleCancel();
    } catch (error) {
      console.error('Banner upload error:', error);
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    }
  }, [selectedFile, position, scale, imageNaturalSize, containerWidth, onUpload, toast, handleCancel]);

  if (!previewUrl) {
    return (
      <input ref={fileInputRef} type="file" accept={isPro ? 'image/jpeg,image/png,image/webp,image/gif' : 'image/jpeg,image/png,image/webp'} onChange={handleFileInputChange} className="hidden" />
    );
  }

  return (
    <>
      <img ref={hiddenImageRef} src={previewUrl} alt="" className="hidden" onLoad={handleImageLoad} />

      <Dialog open={!!previewUrl} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 bg-background border overflow-hidden gap-0 [&>button]:hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-3">
              <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold">Edit media</h2>
            </div>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading || !showEditor}
              size="sm"
              data-testid="button-upload-banner"
            >
              {isUploading
                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Uploading...</>
                : 'Apply'
              }
            </Button>
          </div>

          <div
            ref={stageRef}
            className="relative w-full overflow-hidden bg-black select-none cursor-move"
            style={{ height: stageHeight > 0 ? stageHeight : 300 }}
            onMouseDown={showEditor ? handleMouseDown : undefined}
            onTouchStart={showEditor ? handleTouchStart : undefined}
          >
            {showEditor && (
              <>
                <img
                  ref={visibleImageRef}
                  src={previewUrl}
                  alt="Banner preview"
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

                <div
                  className="absolute inset-x-0 top-0 pointer-events-none bg-black/60"
                  style={{ height: OVERFLOW_PADDING }}
                />
                <div
                  className="absolute inset-x-0 bottom-0 pointer-events-none bg-black/60"
                  style={{ height: OVERFLOW_PADDING }}
                />
                <div
                  className="absolute inset-x-0 pointer-events-none"
                  style={{
                    top: OVERFLOW_PADDING,
                    height: bannerHeight,
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
                data-testid="button-zoom-out"
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
                data-testid="button-zoom-in"
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
