import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, RotateCcw, Check, Move } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BannerUploadPreviewProps {
  onUpload?: (bannerUrl: string) => void;
  onCancel?: () => void;
  currentBannerUrl?: string;
  isUploading?: boolean;
}

export function BannerUploadPreview({ 
  onUpload, 
  onCancel, 
  currentBannerUrl,
  isUploading = false 
}: BannerUploadPreviewProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragMode, setIsDragMode] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback((file: File) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];
    
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, WebP).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPosition({ x: 0, y: 0 });
    setScale(1);
    setIsDragMode(true);
    setIsImageLoaded(false);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDragMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = position.x;
    const startPosY = position.y;
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newX = startPosX + deltaX;
      const newY = startPosY + deltaY;
      
      const maxX = 200;
      const maxY = 100;
      
      setPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY))
      });
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isDragMode, position, scale]);

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
    
    const widthScale = containerWidth / imageNaturalWidth;
    return Math.max(widthScale * 1.1, 1);
  }, []);

  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);
    setTimeout(() => {
      const autoScale = calculateFitToWidthScale();
      setScale(autoScale);
      setPosition({ x: 0, y: 0 });
    }, 100);
  }, [calculateFitToWidthScale]);

  const handleReset = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    const autoScale = calculateFitToWidthScale();
    setScale(autoScale);
  }, [calculateFitToWidthScale]);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPosition({ x: 0, y: 0 });
    setScale(1);
    setIsDragMode(false);
    onCancel?.();
  }, [onCancel]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !onUpload) return;

    try {
      console.log('Starting banner upload with positioning:', { position, scale });
      
      const formData = new FormData();
      formData.append('banner', selectedFile);
      formData.append('positionX', position.x.toString());
      formData.append('positionY', position.y.toString());
      formData.append('scale', scale.toString());

      const response = await fetch('/api/upload/banner', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('Upload response:', result);

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: Upload failed`);
      }

      if (!result.url) {
        throw new Error('No URL returned from server');
      }

      onUpload(result.url);
      
      toast({
        title: "Banner uploaded!",
        description: "Your custom banner has been uploaded successfully.",
        variant: "gamefolioSuccess",
      });
      
      handleCancel();
    } catch (error) {
      console.error('Banner upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload banner. Please try again.",
        variant: "destructive",
      });
    }
  }, [selectedFile, position, scale, onUpload, toast, handleCancel]);

  if (!isDragMode && !previewUrl) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Upload Banner</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/10' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              Drop your banner image here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to select a file
            </p>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="mb-2"
              data-testid="button-choose-file"
            >
              Choose File
            </Button>
            <p className="text-xs text-muted-foreground">
              Supports JPEG, PNG, WebP (max 5MB)
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Move className="h-5 w-5" />
          Position Your Banner
        </CardTitle>
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
            {previewUrl && (
              <img
                ref={imageRef}
                src={previewUrl}
                alt="Banner preview"
                className="absolute w-full h-full object-contain transition-transform duration-75"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'center',
                }}
                onLoad={handleImageLoad}
                draggable={false}
              />
            )}
            
            {/* Overlay with positioning hint */}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
              <div className="bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium">
                {isDragMode ? 'Drag to reposition' : 'Click to start positioning'}
              </div>
            </div>
          </div>
        </div>

        {/* Controls - Mobile Responsive */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              data-testid="button-zoom-out"
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
              data-testid="button-zoom-in"
            >
              +
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              title="Fit to width and reset position"
              data-testid="button-reset"
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
              data-testid="button-auto-fit"
            >
              Auto Fit
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full">
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
              disabled={!selectedFile || isUploading}
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
                  Upload Banner
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
