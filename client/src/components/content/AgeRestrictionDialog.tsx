import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AgeRestrictionDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  contentType?: 'clip' | 'reel' | 'screenshot';
}

export function AgeRestrictionDialog({
  isOpen,
  onAccept,
  onDecline,
  contentType = 'content',
}: AgeRestrictionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // When dialog is dismissed (escape/outside-click), treat as decline
      if (!open) {
        onDecline();
      }
    }}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-age-restriction">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-yellow-500/10 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
            <DialogTitle className="text-xl" data-testid="text-age-warning-title">
              Age-Restricted Content
            </DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed pt-2" data-testid="text-age-warning-description">
            This {contentType} has been marked as age-restricted by the uploader. 
            It may contain content that is not suitable for all audiences.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg my-4">
          <p className="text-sm text-muted-foreground">
            By continuing, you confirm that you are of appropriate age to view this content 
            and understand that it may contain mature themes.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onDecline}
            className="w-full sm:w-auto"
            data-testid="button-decline-age-warning"
          >
            Go Back
          </Button>
          <Button
            onClick={onAccept}
            className="w-full sm:w-auto"
            data-testid="button-accept-age-warning"
          >
            I Understand, Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
