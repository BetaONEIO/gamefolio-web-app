import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BannerUploadPreviewProps {
  onUpload?: (bannerUrl: string) => void;
  onCancel?: () => void;
  currentBannerUrl?: string;
  isUploading?: boolean;
  isPro?: boolean;
}

const CROP_ASPECT = 16 / 9;
const SIDE_PADDING = 60;
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
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [imageNaturalSize, setImageNaturalSize] = useState({ w: 0, h: 0 });
  const [showEditor, setShowEditor] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const cropW = containerWidth;
  const cropH = containerWidth > 0 ? Math.round(containerWidth / CROP_ASPECT) : 0;
  const outerH = cropH + SIDE_PADDING * 2;

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setContainerWidth(w);
    });
    ro.observe(containerRef.current);
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

  const handleFileSelect = useCallback(
    (file: File) => {
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        ...(isPro ? ['image/gif'] : []),
      ];

      const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');

      if (isGif && !isPro) {
        toast({
          title: 'Pro feature',
          description: 'Animated GIF banners are a Pro perk. Upgrade to Pro to use GIF banners!',
          variant: 'destructive',
        });
        return;
      }

      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast({
          title: 'Invalid file type',
          description: isPro
            ? 'Please select a valid image file (JPEG, PNG, WebP, GIF).'
            : 'Please select a valid image file (JPEG, PNG, WebP).',
          variant: 'destructive',
        });
        return;
      }

      const maxSize = isGif ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: isGif
            ? 'Please select a GIF smaller than 10MB.'
            : 'Please select an image smaller than 5MB.',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPosition({ x: 0, y: 0 });
      setScale(1);
      setShowEditor(false);
    },
    [toast, isPro]
  );

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;

    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    setImageNaturalSize({ w: natW, h: natH });
    setShowEditor(true);
  }, []);

  useEffect(() => {
    if (!showEditor || containerWidth === 0 || imageNaturalSize.w === 0) return;

    const cW = containerWidth;
    const cH = Math.round(containerWidth / CROP_ASPECT);
    const scaleByWidth = cW / imageNaturalSize.w;
    const scaleByHeight = cH / imageNaturalSize.h;
    const fitScale = Math.max(scaleByWidth, scaleByHeight);
    const computed = Math.max(fitScale, 0.1);

    setMinScale(computed);
    setScale(computed);
    setPosition({ x: 0, y: 0 });
  }, [showEditor, containerWidth, imageNaturalSize]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFileSelect(files[0]);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = position.x;
      const startPosY = position.y;

      const handleMouseMove = (ev: MouseEvent) => {
        ev.preventDefault();
        const cW = containerWidth;
        const cH = Math.round(containerWidth / CROP_ASPECT);
        const clamped = clampPosition(
          startPosX + (ev.clientX - startX),
          startPosY + (ev.clientY - startY),
          scale,
          imageNaturalSize.w,
          imageNaturalSize.h,
          cW,
          cH
        );
        setPosition(clamped);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [position, scale, imageNaturalSize, containerWidth, clampPosition]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();

      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;
      const startPosX = position.x;
      const startPosY = position.y;

      const handleTouchMove = (ev: TouchEvent) => {
        if (ev.touches.length !== 1) return;
        ev.preventDefault();
        const t = ev.touches[0];
        const cW = containerWidth;
        const cH = Math.round(containerWidth / CROP_ASPECT);
        const clamped = clampPosition(
          startPosX + (t.clientX - startX),
          startPosY + (t.clientY - startY),
          scale,
          imageNaturalSize.w,
          imageNaturalSize.h,
          cW,
          cH
        );
        setPosition(clamped);
      };

      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    },
    [position, scale, imageNaturalSize, containerWidth, clampPosition]
  );

  const handleScaleChange = useCallback(
    (newScale: number) => {
      const cW = containerWidth;
      const cH = Math.round(containerWidth / CROP_ASPECT);
      const clamped = clampPosition(position.x, position.y, newScale, imageNaturalSize.w, imageNaturalSize.h, cW, cH);
      setScale(newScale);
      setPosition(clamped);
    },
    [position, imageNaturalSize, containerWidth, clampPosition]
  );

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPosition({ x: 0, y: 0 });
    setScale(1);
    setShowEditor(false);
    onCancel?.();
  }, [onCancel]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !onUpload || !imageRef.current) return;

    try {
      const img = imageRef.current;
      const natW = imageNaturalSize.w;
      const natH = imageNaturalSize.h;
      const cW = containerWidth;
      const cH = Math.round(containerWidth / CROP_ASPECT);

      const cropW = cW / scale;
      const cropH = cH / scale;

      const srcX = natW / 2 - cropW / 2 - position.x / scale;
      const srcY = natH / 2 - cropH / 2 - position.y / scale;

      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 675;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.drawImage(img, srcX, srcY, cropW, cropH, 0, 0, 1200, 675);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas to blob failed'))),
          'image/jpeg',
          0.92
        );
      });

      const formData = new FormData();
      formData.append('banner', blob, 'banner.jpg');

      const response = await fetch('/api/upload/banner', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: Upload failed`);
      }

      if (!result.url) {
        throw new Error('No URL returned from server');
      }

      onUpload(result.url);

      toast({
        title: 'Banner uploaded!',
        description: 'Your custom banner has been uploaded successfully.',
        variant: 'gamefolioSuccess',
      });

      handleCancel();
    } catch (error) {
      console.error('Banner upload error:', error);
      toast({
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload banner. Please try again.',
        variant: 'destructive',
      });
    }
  }, [selectedFile, position, scale, imageNaturalSize, containerWidth, onUpload, toast, handleCancel]);

  if (!previewUrl) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Upload Banner</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Drop your banner image here</p>
            <p className="text-sm text-muted-foreground mb-4">or click to select a file</p>
            <Button
              variant="outline"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="mb-2"
              data-testid="button-choose-file"
            >
              Choose File
            </Button>
            <p className="text-xs text-muted-foreground">
              {isPro
                ? 'Supports JPEG, PNG, WebP, GIF (max 5MB, GIF max 10MB)'
                : 'Supports JPEG, PNG, WebP (max 5MB)'}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={
              isPro
                ? 'image/jpeg,image/png,image/webp,image/gif'
                : 'image/jpeg,image/png,image/webp'
            }
            onChange={handleFileInputChange}
            className="hidden"
          />
        </CardContent>
      </Card>
    );
  }

  const scaledW = imageNaturalSize.w * scale;
  const scaledH = imageNaturalSize.h * scale;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Edit media</CardTitle>
        <p className="text-sm text-muted-foreground">
          Drag to reposition · use the slider to zoom
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-4">
        {/* Hidden img to read natural dimensions */}
        {!showEditor && (
          <img
            ref={imageRef}
            src={previewUrl}
            alt=""
            className="hidden"
            onLoad={handleImageLoad}
          />
        )}

        {/* Outer dark stage — full card width */}
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden bg-black select-none cursor-move"
          style={{ height: outerH > 0 ? outerH : 300 }}
          onMouseDown={showEditor ? handleMouseDown : undefined}
          onTouchStart={showEditor ? handleTouchStart : undefined}
        >
          {showEditor && (
            <>
              {/* The image, centred and offset by drag position */}
              <img
                ref={imageRef}
                src={previewUrl}
                alt=""
                className="pointer-events-none absolute"
                style={{
                  width: scaledW,
                  height: scaledH,
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                }}
                draggable={false}
              />

              {/* Dark overlay strips outside the crop box */}
              {/* top */}
              <div
                className="absolute inset-x-0 top-0 bg-black/60 pointer-events-none"
                style={{ height: SIDE_PADDING }}
              />
              {/* bottom */}
              <div
                className="absolute inset-x-0 bottom-0 bg-black/60 pointer-events-none"
                style={{ height: SIDE_PADDING }}
              />

              {/* Crop box border — full width, centred vertically */}
              <div
                className="absolute inset-x-0 pointer-events-none"
                style={{
                  top: SIDE_PADDING,
                  height: cropH,
                  border: '2px solid #1d9bf0',
                  boxSizing: 'border-box',
                }}
              />
            </>
          )}
        </div>

        {/* Zoom slider */}
        {showEditor && (
          <div className="flex items-center gap-3 px-4">
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
              onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
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

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2 px-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
            className="w-full sm:w-auto sm:flex-1"
            data-testid="button-cancel-banner"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || !showEditor}
            className="w-full sm:w-auto sm:flex-1"
            data-testid="button-upload-banner"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Apply
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
