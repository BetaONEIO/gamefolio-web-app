import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocation } from 'wouter';
import { Loader2, Upload, Image as ImageIcon, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToastAction } from '@/components/ui/toast';
import ProUpgradeDialog from '@/components/ProUpgradeDialog';
import type { UploadLimits } from '@shared/schema';

// Shape of the structured error payload returned by /api/screenshots/upload
// and /api/upload/* when an upload is rejected for a tier limit.
interface UploadErrorPayload {
  error?: string;
  message?: string;
  limits?: UploadLimits;
}

class UploadLimitError extends Error {
  limits?: UploadLimits;
  constructor(message: string, limits?: UploadLimits) {
    super(message);
    this.name = 'UploadLimitError';
    this.limits = limits;
  }
}

const ScreenshotUploadPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showProUpgrade, setShowProUpgrade] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dragCounterRef = React.useRef(0);

  // Fetch games for selection
  const { data: games = [] } = useQuery({
    queryKey: ['/api/games'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/games');
      return response.json();
    }
  });

  // Fetch the current user's tier-aware upload limits so we can render a
  // short hint before file selection. Falls back to a sensible Free-tier
  // copy until the limits arrive.
  const { data: uploadLimits } = useQuery<UploadLimits>({
    queryKey: ['/api/upload/limits'],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  const processFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Please select only image files",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length + imageFiles.length > 3) {
      toast({
        title: "Too many files",
        description: "You can upload a maximum of 3 screenshots at once",
        variant: "destructive",
      });
      return;
    }

    const newFiles = [...selectedFiles, ...imageFiles];
    setSelectedFiles(newFiles);

    const newPreviews = [...previews];
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        setPreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (isUploading || selectedFiles.length >= 3) return;
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one screenshot to upload",
        variant: "destructive",
      });
      return;
    }

    if (!selectedGameId) {
      toast({
        title: "Game required",
        description: "Please select a game for your screenshots",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your screenshots",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('screenshot', file);
        formData.append('gameId', selectedGameId);
        formData.append('title', title.trim());
        formData.append('description', description);

        const response = await fetch('/api/screenshots/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          // Server returns { error, message, limits } for tier-limit
          // rejections (HTTP 403/413). Surface the friendly message and
          // the limits payload so the catch block can show an Upgrade-to-Pro
          // CTA for Free users instead of a generic "Upload failed".
          const errorData: UploadErrorPayload = await response.json().catch(
            (): UploadErrorPayload => ({}),
          );
          throw new UploadLimitError(
            errorData.message || errorData.error || 'Upload failed',
            errorData.limits,
          );
        }

        return response.json();
      });

      await Promise.all(uploadPromises);

      // Refresh tier-aware upload limits so the hint reflects any change
      // (e.g. user just hit their cap or upgraded to Pro mid-session).
      queryClient.invalidateQueries({ queryKey: ['/api/upload/limits'] });

      toast({
        title: "Success",
        description: `${selectedFiles.length} screenshot${selectedFiles.length > 1 ? 's' : ''} uploaded successfully`,
      });

      // Reset form
      setSelectedFiles([]);
      setPreviews([]);
      setSelectedGameId('');
      setTitle('');
      setDescription('');
      
      // Navigate to user's profile page to view the uploaded content
      navigate(`/profile/${user?.username}`);

    } catch (error) {
      console.error('Upload error:', error);
      const limits = error instanceof UploadLimitError ? error.limits : undefined;
      const showUpgradeCta = limits ? limits.isPro === false : false;
      toast({
        title: "Upload failed",
        description: (error instanceof Error && error.message)
          ? error.message
          : "Failed to upload screenshots. Please try again.",
        variant: "destructive",
        action: showUpgradeCta ? (
          <ToastAction
            altText="Upgrade to Pro"
            onClick={() => setShowProUpgrade(true)}
          >
            Upgrade to Pro
          </ToastAction>
        ) : undefined,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Upload Screenshots</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Share your gaming moments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tier-aware upload-limit hint shown BEFORE the user opens
              the file picker, so they know whether their screenshot will
              fit. Falls back to the Free-tier defaults until /api/upload/limits
              resolves. */}
          {(() => {
            const limits = uploadLimits;
            const maxMB = limits?.maxScreenshotSizeMB ?? 10;
            const isPro = limits?.isPro === true;
            const hint = isPro
              ? `Pro: screenshots up to ${maxMB} MB.`
              : `Free users: screenshots up to ${maxMB} MB. Upgrade to Pro for larger uploads.`;
            return (
              <div
                className="flex items-start gap-2 rounded-md border border-muted-foreground/20 bg-muted/40 p-3 text-sm"
                data-testid="upload-limits-hint"
              >
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <span className="text-muted-foreground">{hint}</span>
                  {!isPro && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 ml-2 align-baseline"
                      onClick={() => setShowProUpgrade(true)}
                      data-testid="button-upgrade-pro-hint"
                    >
                      Upgrade to Pro
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* File Upload Area - Always Show */}
          <div className="space-y-4">
            <Label>Screenshots ({selectedFiles.length}/3 selected)</Label>
            
            {/* Single hidden input for all file selections */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="screenshot-upload"
              disabled={isUploading}
              data-testid="input-screenshot-upload"
            />
            
            {selectedFiles.length === 0 ? (
              <div
                className={`border-2 border-dashed ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'} rounded-lg p-8 text-center transition-colors cursor-pointer flex flex-col items-center space-y-4`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">{isDragging ? 'Drop files here' : 'Drag & drop or click to browse'}</p>
                  <p className="text-sm text-muted-foreground">
                    Select up to 3 screenshots • PNG, JPG, JPEG • Hold Ctrl/Cmd to select multiple
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={`space-y-4 rounded-lg transition-colors ${selectedFiles.length < 3 && isDragging ? 'border-2 border-dashed border-primary bg-primary/5 p-4' : ''}`}
                onDragOver={selectedFiles.length < 3 ? handleDragOver : undefined}
                onDragEnter={selectedFiles.length < 3 ? handleDragEnter : undefined}
                onDragLeave={selectedFiles.length < 3 ? handleDragLeave : undefined}
                onDrop={selectedFiles.length < 3 ? handleDrop : undefined}
              >
                {/* Preview Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="w-full rounded-lg border overflow-hidden bg-muted flex items-center justify-center">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-auto object-contain"
                          data-testid={`img-preview-${index}`}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full p-0 shadow-lg"
                        onClick={() => removeFile(index)}
                        data-testid={`button-remove-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Another Button or drop hint */}
                {selectedFiles.length < 3 && (
                  isDragging ? (
                    <p className="text-center text-sm font-medium text-primary py-2">
                      Drop to add screenshot ({3 - selectedFiles.length} remaining)
                    </p>
                  ) : (
                    <label htmlFor="screenshot-upload" className="block">
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        disabled={isUploading}
                        data-testid="button-add-another"
                        asChild
                      >
                        <span className="cursor-pointer flex items-center justify-center gap-2">
                          <Upload className="h-5 w-5" />
                          Add Another Screenshot ({3 - selectedFiles.length} remaining)
                        </span>
                      </Button>
                    </label>
                  )
                )}
              </div>
            )}
          </div>

          {/* Game Selection */}
          <div className="space-y-2">
            <Label htmlFor="game-select">Game *</Label>
            <Select value={selectedGameId} onValueChange={setSelectedGameId}>
              <SelectTrigger data-testid="select-game">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent>
                {games.map((game: any) => (
                  <SelectItem key={game.id} value={game.id.toString()}>
                    {game.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Give your screenshots a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              data-testid="input-title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a description for your screenshots..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="input-description"
            />
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || !selectedGameId || !title.trim() || isUploading}
            className="w-full"
            size="lg"
            data-testid="button-upload"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                Upload {selectedFiles.length > 0 ? `${selectedFiles.length} Screenshot${selectedFiles.length > 1 ? 's' : ''}` : 'Screenshots'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <ProUpgradeDialog
        open={showProUpgrade}
        onOpenChange={setShowProUpgrade}
        subtitle="Get larger screenshot uploads"
      />
    </div>
  );
};

export default ScreenshotUploadPage;