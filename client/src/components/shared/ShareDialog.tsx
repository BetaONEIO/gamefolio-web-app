import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, Facebook, Twitter, MessageCircle, Mail, Share2 } from "lucide-react";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contentTitle: string;
  shareUrl: string;
  qrCode: string;
  socialMediaLinks: {
    facebook: string;
    twitter: string;
    discord: string;
    linkedin: string;
  };
  contentType?: "clip" | "reel" | "screenshot";
}

export function ShareDialog({
  isOpen,
  onClose,
  contentTitle,
  shareUrl,
  qrCode,
  socialMediaLinks,
  contentType = "clip"
}: ShareDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "The share link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `gamefolio-${contentType}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSocialShare = (platform: string, url: string) => {
    if (platform === 'discord') {
      // For Discord, copy the link to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied for Discord!",
        description: "Paste this link in your Discord channel.",
      });
    } else {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-4xl gamefolio-share-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Share2 className="h-5 w-5 text-primary" />
            Share your gamefolio
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            gamefolio.gg/demo
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Share Link - Single Line Layout */}
          <div className="flex items-center gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="flex-1 text-sm gamefolio-share-input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="px-4"
              style={{ 
                borderColor: 'hsl(var(--primary)) !important', 
                color: copied ? '#166534' : 'hsl(var(--primary))',
                backgroundColor: copied ? '#dcfce7' : '#101821'
              }}
            >
              <Copy className="h-4 w-4 mr-1" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSocialShare('twitter', socialMediaLinks.twitter)}
              className="px-4"
              style={{ 
                backgroundColor: 'hsl(var(--primary)) !important', 
                borderColor: 'hsl(var(--primary)) !important', 
                color: 'white !important' 
              }}
            >
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}