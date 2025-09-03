import { useState, useRef } from 'react';
import { Upload, Upload as UploadIcon, X, Video, Image, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadConfig {
  limits: {
    video: { maxSizeMB: number; protocol: string };
    reel: { maxSizeMB: number; protocol: string };
    screenshot: { maxSizeMB: number; protocol: string };
  };
  supportedFormats: {
    video: string[];
    image: string[];
  };
  tusEndpoint: string;
}

type UploadType = 'video' | 'reel' | 'screenshot';

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<UploadType>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gameId, setGameId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Get upload configuration
  const { data: uploadConfig } = useQuery<UploadConfig>({
    queryKey: ['/api/upload/config'],
  });

  // Get games for selection
  const { data: games = [] } = useQuery<any[]>({
    queryKey: ['/api/twitch/games/top'],
  });

  // Screenshot upload mutation
  const screenshotUpload = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload/screenshot', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Screenshot upload failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setUploadStatus('success');
      setUploadResult(data);
      toast({ title: 'Success', description: 'Screenshot uploaded successfully!' });
      queryClient.invalidateQueries({ queryKey: ['/api/screenshots'] });
      setTimeout(() => {
        onClose();
        resetForm();
        // Navigate to enhanced confirmation screen
        setLocation(`/upload-success/screenshot/${data.id}`);
      }, 2000);
    },
    onError: (error) => {
      setUploadStatus('error');
      toast({ title: 'Error', description: 'Screenshot upload failed', variant: 'destructive' });
      console.error('Screenshot upload error:', error);
    }
  });

  // Video processing mutation
  const processVideo = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/upload/process-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Video processing failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setUploadStatus('success');
      setUploadResult(data);
      toast({ title: 'Success', description: 'Video processed successfully!' });
      queryClient.invalidateQueries({ queryKey: ['/api/clips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reels'] });
      setTimeout(() => {
        onClose();
        resetForm();
        // Navigate to enhanced confirmation screen with appropriate content type
        const contentType = uploadType === 'reel' ? 'reel' : 'clip';
        setLocation(`/upload-success/${contentType}/${data.id}`);
      }, 2000);
    },
    onError: (error) => {
      setUploadStatus('error');
      toast({ title: 'Error', description: 'Video processing failed', variant: 'destructive' });
      console.error('Video processing error:', error);
    }
  });

  const resetForm = () => {
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    setGameId('');
    setTags([]);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadStatus('idle');
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      toast({ title: 'Error', description: 'Please select a video or image file', variant: 'destructive' });
      return;
    }

    // Auto-detect upload type based on file
    if (isImage) {
      setUploadType('screenshot');
    } else if (isVideo) {
      // Keep current video/reel selection or default to video
      if (uploadType === 'screenshot') {
        setUploadType('video');
      }
    }

    setSelectedFile(file);
  };

  const validateFile = () => {
    if (!selectedFile || !uploadConfig) return false;

    const maxSizeMB = uploadConfig.limits[uploadType].maxSizeMB;
    const fileSizeMB = selectedFile.size / (1024 * 1024);

    if (fileSizeMB > maxSizeMB) {
      toast({
        title: 'File Too Large',
        description: `File size must be less than ${maxSizeMB}MB for ${uploadType}s`,
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleTusUpload = async () => {
    if (!selectedFile || !uploadConfig) return;

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      // For simplicity, use standard fetch with progress tracking
      // In production, you would use a proper TUS client
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('uploadType', uploadType);
      formData.append('filename', selectedFile.name);
      formData.append('filetype', selectedFile.type);

      // Simulate upload progress
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200) {
          setUploadStatus('processing');
          const result = JSON.parse(xhr.responseText);
          setUploadResult(result);
          
          // Process the video
          processVideo.mutate({
            uploadResult: result.result,
            title,
            description,
            gameId: gameId ? parseInt(gameId) : null,
            tags,
            videoType: uploadType === 'reel' ? 'reel' : 'clip'
          });
        } else {
          throw new Error('Upload failed');
        }
      };

      xhr.onerror = () => {
        throw new Error('Upload failed');
      };

      xhr.open('POST', '/api/upload/tus');
      xhr.setRequestHeader('Upload-Type', uploadType);
      xhr.send(formData);

    } catch (error) {
      setUploadStatus('error');
      setIsUploading(false);
      toast({ title: 'Error', description: 'Upload failed', variant: 'destructive' });
      console.error('TUS upload error:', error);
    }
  };

  const handleScreenshotUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('uploading');

    const formData = new FormData();
    formData.append('screenshot', selectedFile);
    formData.append('title', title);
    formData.append('description', description);
    if (gameId) formData.append('gameId', gameId);
    if (tags.length > 0) formData.append('tags', JSON.stringify(tags));

    screenshotUpload.mutate(formData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({ title: 'Error', description: 'Please select a file', variant: 'destructive' });
      return;
    }

    if (!title.trim()) {
      toast({ title: 'Error', description: 'Please enter a title', variant: 'destructive' });
      return;
    }

    if (!validateFile()) return;

    if (uploadType === 'screenshot') {
      handleScreenshotUpload();
    } else {
      handleTusUpload();
    }
  };

  const getUploadIcon = () => {
    switch (uploadType) {
      case 'video':
      case 'reel':
        return <Video className="h-6 w-6" />;
      case 'screenshot':
        return <Image className="h-6 w-6" />;
      default:
        return <UploadIcon className="h-6 w-6" />;
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getUploadIcon()}
            Upload Content
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Content Type</label>
            <Select value={uploadType} onValueChange={(value: UploadType) => setUploadType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video Clip</SelectItem>
                <SelectItem value="reel">Reel</SelectItem>
                <SelectItem value="screenshot">Screenshot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">File</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept={uploadType === 'screenshot' ? 'image/*' : 'video/*'}
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadIcon className="h-8 w-8 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Click to select {uploadType === 'screenshot' ? 'an image' : 'a video'} file
                  </p>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
            />
          </div>

          {/* Game Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Game</label>
            <Select value={gameId} onValueChange={setGameId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a game..." />
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

          {/* Upload Progress */}
          {(isUploading || uploadStatus !== 'idle') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {uploadStatus === 'uploading' && 'Uploading...'}
                  {uploadStatus === 'processing' && 'Processing...'}
                  {uploadStatus === 'success' && 'Complete!'}
                  {uploadStatus === 'error' && 'Failed'}
                </span>
                {getStatusIcon()}
              </div>
              {uploadStatus === 'uploading' && (
                <Progress value={uploadProgress} className="w-full" />
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
                resetForm();
              }}
              disabled={isUploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !selectedFile || !title.trim()}
              className="flex-1"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}