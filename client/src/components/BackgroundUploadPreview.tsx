import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Smartphone, Monitor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface CropPos { positionX: number; positionY: number; zoom: number; }
interface CropState { pos: { x: number; y: number }; scale: number; minScale: number; }

interface BackgroundUploadPreviewProps {
  onUpload?: (url: string, mobilePos: CropPos, desktopPos: CropPos) => void;
  onCancel?: () => void;
}

const OVERFLOW_PADDING = 40;
const MOBILE_ASPECT = 9 / 16;
const DESKTOP_ASPECT = 16 / 9;
const MAX_RESIZE_PX = 2048;

async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_RESIZE_PX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas unavailable'));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

export function BackgroundUploadPreview({ onUpload, onCancel }: BackgroundUploadPreviewProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<'selecting' | 'uploading' | 'editing'>('selecting');
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mobile' | 'desktop'>(() => typeof window !== 'undefined' && window.innerWidth > 768 ? 'desktop' : 'mobile');
  const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : true);
  const [imageNaturalSize, setImageNaturalSize] = useState({ w: 0, h: 0 });
  const [showEditor, setShowEditor] = useState(false);

  const [mobileState, setMobileState] = useState<CropState>({ pos: { x: 0, y: 0 }, scale: 1, minScale: 1 });
  const mobileStageRef = useRef<HTMLDivElement>(null);
  const [mobileStageDims, setMobileStageDims] = useState({ w: 0, h: 0 });

  const [desktopState, setDesktopState] = useState<CropState>({ pos: { x: 0, y: 0 }, scale: 1, minScale: 1 });
  const desktopStageRef = useRef<HTMLDivElement>(null);
  const [desktopStageDims, setDesktopStageDims] = useState({ w: 0, h: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenImageRef = useRef<HTMLImageElement>(null);
  const fileSelectedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    const check = () => setIsMobileViewport(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Auto-open file picker whenever phase becomes 'selecting'
  useEffect(() => {
    if (phase === 'selecting' && fileInputRef.current) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      fileSelectedRef.current = false;
      fileInputRef.current.click();
      const handleFocus = () => {
        setTimeout(() => { if (!fileSelectedRef.current) onCancel?.(); }, 500);
      };
      window.addEventListener('focus', handleFocus, { once: true });
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [phase]);

  useEffect(() => {
    const el = mobileStageRef.current;
    if (!el || !showEditor || activeTab !== 'mobile') return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? {};
      if (width && height) setMobileStageDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [showEditor, activeTab]);

  useEffect(() => {
    const el = desktopStageRef.current;
    if (!el || !showEditor || activeTab !== 'desktop') return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? {};
      if (width && height) setDesktopStageDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [showEditor, activeTab]);

  const clampV = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const clampPosition = useCallback((x: number, y: number, s: number, natW: number, natH: number, cW: number, cH: number) => {
    const maxX = Math.max(0, (natW * s - cW) / 2);
    const maxY = Math.max(0, (natH * s - cH) / 2);
    return { x: clampV(x, -maxX, maxX), y: clampV(y, -maxY, maxY) };
  }, []);

  const computeMinScale = useCallback((natW: number, natH: number, cW: number, cH: number) => {
    if (!natW || !natH || !cW || !cH) return 1;
    return Math.max(cW / natW, cH / natH);
  }, []);

  // Mobile: init scale to cover the crop box exactly (= minScale), matching CSS object-fit: cover
  useEffect(() => {
    if (!showEditor || mobileStageDims.h === 0 || imageNaturalSize.w === 0) return;
    const cH = mobileStageDims.h;
    const cW = Math.round(cH * MOBILE_ASPECT);
    const fit = computeMinScale(imageNaturalSize.w, imageNaturalSize.h, cW, cH);
    setMobileState({ pos: { x: 0, y: 0 }, scale: fit, minScale: fit });
  }, [showEditor, mobileStageDims, imageNaturalSize, computeMinScale]);

  // Desktop: init scale to cover
  useEffect(() => {
    if (!showEditor || desktopStageDims.w === 0 || imageNaturalSize.w === 0) return;
    const cW = desktopStageDims.w;
    const cH = Math.round(cW / DESKTOP_ASPECT);
    const fit = computeMinScale(imageNaturalSize.w, imageNaturalSize.h, cW, cH);
    setDesktopState({ pos: { x: 0, y: 0 }, scale: fit, minScale: fit });
  }, [showEditor, desktopStageDims, imageNaturalSize, computeMinScale]);

  const handleFileSelect = useCallback((file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast({ title: 'Invalid file type', description: 'Please select JPEG, PNG, or WebP.', variant: 'destructive' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Image must be under 50MB.', variant: 'destructive' });
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPhase('uploading');
  }, [toast]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { fileSelectedRef.current = true; handleFileSelect(file); }
  }, [handleFileSelect]);

  // Upload phase: resize then send
  useEffect(() => {
    if (phase !== 'uploading' || !selectedFile) return;
    const upload = async () => {
      try {
        const resized = await resizeImage(selectedFile);
        const formData = new FormData();
        formData.append('backgroundImage', resized, 'background.jpg');
        const response = await fetch('/api/upload/profile-background', { method: 'POST', body: formData });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Upload failed');
        if (!result.url) throw new Error('No URL returned');
        setUploadedUrl(result.url);
        setPhase('editing');
      } catch (err: any) {
        toast({ title: 'Upload failed', description: err.message || 'Please try again.', variant: 'destructive' });
        setPhase('selecting');
        setSelectedFile(null);
        setPreviewUrl(null);
      }
    };
    upload();
  }, [phase, selectedFile]);

  const handleImageLoad = useCallback(() => {
    const img = hiddenImageRef.current;
    if (!img) return;
    setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setShowEditor(true);
  }, []);

  const handleCancel = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setPhase('selecting');
    setShowEditor(false);
    onCancel?.();
  }, [onCancel]);

  // Convert editor drag position → CSS object-position percentages
  // Uses overflow-based formula so values match CSS object-fit: cover behaviour exactly.
  // When the image aspect exactly matches the crop (overflow = 0), default to 50% centre.
  const calcCropPos = (state: CropState, natW: number, natH: number, cW: number, cH: number): CropPos => {
    const scaledW = natW * state.scale;
    const scaledH = natH * state.scale;
    const overflowX = scaledW - cW;
    const overflowY = scaledH - cH;
    const posX = overflowX <= 0 ? 50 : clampV(((scaledW - cW) / 2 - state.pos.x) / overflowX * 100, 0, 100);
    const posY = overflowY <= 0 ? 50 : clampV(((scaledH - cH) / 2 - state.pos.y) / overflowY * 100, 0, 100);
    return { positionX: Math.round(posX), positionY: Math.round(posY), zoom: 100 };
  };

  const handleApply = useCallback(() => {
    if (!uploadedUrl || !onUpload) return;
    const mCH = mobileStageDims.h > 0 ? mobileStageDims.h : 400;
    const mCW = Math.round(mCH * MOBILE_ASPECT);
    const mobilePos = calcCropPos(mobileState, imageNaturalSize.w, imageNaturalSize.h, mCW, mCH);
    const dCW = desktopStageDims.w > 0 ? desktopStageDims.w : 320;
    const dCH = Math.round(dCW / DESKTOP_ASPECT);
    const desktopPos = calcCropPos(desktopState, imageNaturalSize.w, imageNaturalSize.h, dCW, dCH);
    onUpload(uploadedUrl, mobilePos, desktopPos);
    handleCancel();
  }, [uploadedUrl, mobileState, desktopState, mobileStageDims, desktopStageDims, imageNaturalSize, onUpload, handleCancel]);

  const makeDragHandler = (
    getCropDims: () => { cW: number; cH: number },
    getPos: () => { x: number; y: number },
    getScale: () => number,
    setStateFn: (updater: (prev: CropState) => CropState) => void
  ) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startPos = getPos();
    const onMove = (ev: MouseEvent) => {
      ev.preventDefault();
      const { cW, cH } = getCropDims();
      setStateFn(prev => ({
        ...prev,
        pos: clampPosition(startPos.x + ev.clientX - startX, startPos.y + ev.clientY - startY, getScale(), imageNaturalSize.w, imageNaturalSize.h, cW, cH)
      }));
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const makeTouchHandler = (
    getCropDims: () => { cW: number; cH: number },
    getPos: () => { x: number; y: number },
    getScale: () => number,
    setStateFn: (updater: (prev: CropState) => CropState) => void
  ) => (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    const startX = t.clientX, startY = t.clientY;
    const startPos = getPos();
    const onMove = (ev: TouchEvent) => {
      if (ev.touches.length !== 1) return;
      ev.preventDefault();
      const touch = ev.touches[0];
      const { cW, cH } = getCropDims();
      setStateFn(prev => ({
        ...prev,
        pos: clampPosition(startPos.x + touch.clientX - startX, startPos.y + touch.clientY - startY, getScale(), imageNaturalSize.w, imageNaturalSize.h, cW, cH)
      }));
    };
    const onEnd = () => { document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  const handleMobileMouseDown = makeDragHandler(
    () => { const cH = mobileStageDims.h; return { cW: Math.round(cH * MOBILE_ASPECT), cH }; },
    () => mobileState.pos, () => mobileState.scale, setMobileState
  );
  const handleMobileTouchStart = makeTouchHandler(
    () => { const cH = mobileStageDims.h; return { cW: Math.round(cH * MOBILE_ASPECT), cH }; },
    () => mobileState.pos, () => mobileState.scale, setMobileState
  );

  const handleDesktopMouseDown = makeDragHandler(
    () => { const cW = desktopStageDims.w; return { cW, cH: Math.round(cW / DESKTOP_ASPECT) }; },
    () => desktopState.pos, () => desktopState.scale, setDesktopState
  );
  const handleDesktopTouchStart = makeTouchHandler(
    () => { const cW = desktopStageDims.w; return { cW, cH: Math.round(cW / DESKTOP_ASPECT) }; },
    () => desktopState.pos, () => desktopState.scale, setDesktopState
  );

  const mobileCropH = mobileStageDims.h > 0 ? mobileStageDims.h : 400;
  const mobileCropW = Math.round(mobileCropH * MOBILE_ASPECT);
  const mobileStageW = mobileCropW + OVERFLOW_PADDING * 2;

  const desktopCropW = desktopStageDims.w > 0 ? desktopStageDims.w : 320;
  const desktopCropH = Math.round(desktopCropW / DESKTOP_ASPECT);
  const desktopStageH = desktopCropH + OVERFLOW_PADDING * 2;

  if (phase === 'selecting') {
    return <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileInputChange} className="hidden" />;
  }

  return (
    <>
      {previewUrl && <img ref={hiddenImageRef} src={previewUrl} alt="" className="hidden" onLoad={handleImageLoad} />}

      <Dialog open={true} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent className="w-[95vw] max-w-lg md:max-w-4xl p-0 bg-background border overflow-hidden gap-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Edit background image</DialogTitle>
          <DialogDescription className="sr-only">Drag to position your background image for mobile and desktop, then click Apply.</DialogDescription>

          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-3">
              <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold">Edit media</h2>
            </div>
            {phase === 'editing' && (
              <Button onClick={handleApply} disabled={!showEditor} size="sm">Apply</Button>
            )}
          </div>

          {phase === 'uploading' && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">Uploading image…</p>
            </div>
          )}

          {phase === 'editing' && (
            <>
              <div className="flex border-b">
                <button
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === 'desktop' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'} ${isMobileViewport ? 'opacity-40 cursor-not-allowed' : 'hover:text-foreground'}`}
                  onClick={() => { if (!isMobileViewport) setActiveTab('desktop'); }}
                  title={isMobileViewport ? 'Use a desktop device to set the desktop crop' : undefined}
                >
                  <Monitor className="h-4 w-4" />
                  Desktop
                  {isMobileViewport && <span className="text-xs ml-1 opacity-70">(desktop only)</span>}
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === 'mobile' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveTab('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </button>
              </div>

              {activeTab === 'mobile' && (
                <div
                  className="relative overflow-hidden bg-black select-none cursor-move mx-auto"
                  style={{ width: mobileStageW > 80 ? mobileStageW : 280, height: '60vh' }}
                >
                  <div
                    ref={mobileStageRef}
                    className="absolute"
                    style={{ left: OVERFLOW_PADDING, top: 0, width: mobileCropW > 0 ? mobileCropW : 200, height: '100%' }}
                    onMouseDown={showEditor ? handleMobileMouseDown : undefined}
                    onTouchStart={showEditor ? handleMobileTouchStart : undefined}
                  >
                    {showEditor && (
                      <img
                        src={previewUrl!}
                        alt="Mobile background preview"
                        className="pointer-events-none absolute"
                        style={{
                          left: '50%', top: '50%', maxWidth: 'none',
                          width: imageNaturalSize.w, height: imageNaturalSize.h,
                          transform: `translate(calc(-50% + ${mobileState.pos.x}px), calc(-50% + ${mobileState.pos.y}px)) scale(${mobileState.scale})`,
                          transformOrigin: 'center center',
                        }}
                        draggable={false}
                      />
                    )}
                  </div>
                  {showEditor && (
                    <>
                      <div className="absolute top-0 bottom-0 left-0 pointer-events-none bg-black/60" style={{ width: OVERFLOW_PADDING }} />
                      <div className="absolute top-0 bottom-0 right-0 pointer-events-none bg-black/60" style={{ width: OVERFLOW_PADDING }} />
                      <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: OVERFLOW_PADDING, width: mobileCropW > 0 ? mobileCropW : 200, border: '2px solid #1d9bf0', boxSizing: 'border-box' }} />
                    </>
                  )}
                </div>
              )}

              {activeTab === 'desktop' && (
                <div
                  className="relative overflow-hidden bg-black select-none w-full"
                  style={{ height: desktopStageH > 80 ? desktopStageH : 260, cursor: isMobileViewport ? 'not-allowed' : 'move' }}
                >
                  <div
                    ref={desktopStageRef}
                    className="absolute left-0 right-0"
                    style={{ top: OVERFLOW_PADDING, height: desktopCropH > 0 ? desktopCropH : 200 }}
                    onMouseDown={showEditor && !isMobileViewport ? handleDesktopMouseDown : undefined}
                    onTouchStart={showEditor && !isMobileViewport ? handleDesktopTouchStart : undefined}
                  >
                    {showEditor && (
                      <img
                        src={previewUrl!}
                        alt="Desktop background preview"
                        className="pointer-events-none absolute"
                        style={{
                          left: '50%', top: '50%', maxWidth: 'none',
                          width: imageNaturalSize.w, height: imageNaturalSize.h,
                          transform: `translate(calc(-50% + ${desktopState.pos.x}px), calc(-50% + ${desktopState.pos.y}px)) scale(${desktopState.scale})`,
                          transformOrigin: 'center center',
                        }}
                        draggable={false}
                      />
                    )}
                  </div>
                  {showEditor && (
                    <>
                      <div className="absolute left-0 right-0 top-0 pointer-events-none bg-black/60" style={{ height: OVERFLOW_PADDING }} />
                      <div className="absolute left-0 right-0 bottom-0 pointer-events-none bg-black/60" style={{ height: OVERFLOW_PADDING }} />
                      <div className="absolute left-0 right-0 pointer-events-none" style={{ top: OVERFLOW_PADDING, height: desktopCropH > 0 ? desktopCropH : 200, border: '2px solid #1d9bf0', boxSizing: 'border-box' }} />
                    </>
                  )}
                  {isMobileViewport && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 pointer-events-none">
                      <p className="text-white text-sm text-center px-6">Open on a desktop device to set the desktop crop</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
