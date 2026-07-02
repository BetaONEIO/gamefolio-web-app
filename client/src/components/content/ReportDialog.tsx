import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Flag, AlertTriangle } from "lucide-react";

interface ReportDialogProps {
  contentType: 'clip' | 'screenshot' | 'comment';
  contentId: number;
  contentTitle?: string;
  contentAuthor: string;
  trigger?: React.ReactNode;
  // Optional external control (e.g. opened from a dropdown menu item). When
  // `open` is provided the component is controlled and no trigger is rendered.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const REPORT_REASONS = {
  'inappropriate-content': 'Inappropriate or offensive content',
  'spam': 'Spam or irrelevant content',
  'harassment': 'Harassment or bullying',
  'violence': 'Violence or threats',
  'hate-speech': 'Hate speech or discrimination',
  'copyright': 'Copyright infringement',
  'misleading': 'Misleading or false information',
  'other': 'Other (please specify)'
};

export function ReportDialog({
  contentType,
  contentId,
  contentTitle,
  contentAuthor,
  trigger,
  open,
  onOpenChange,
}: ReportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const { toast } = useToast();

  const reportMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/${contentType}s/${contentId}/report`, {
        reason: selectedReason,
        additionalDetails: additionalDetails.trim() || undefined
      });
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe. We'll review this content soon.",
        variant: "gamefolioSuccess",
      });
      setIsOpen(false);
      setSelectedReason('');
      setAdditionalDetails('');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      toast({
        title: "Please select a reason",
        description: "You must select a reason for reporting this content.",
        variant: "destructive",
      });
      return;
    }
    reportMutation.mutate();
  };

  const contentTypeLabel = contentType === 'clip' ? 'video' : contentType;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <button
              className="focus:outline-none"
              data-testid={`button-report-${contentType}`}
            >
              <Flag className="h-5 w-5 text-red-500 hover:text-red-400 transition-colors" />
            </button>
          )}
        </DialogTrigger>
      )}
      {/* z above the fullscreen clip viewers (z-[100001]) so the report form
          is visible when opened from a clip's ⋯ menu inside the viewer. */}
      <DialogContent className="z-[200001] max-w-md mx-4 my-8 sm:m-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report {contentTypeLabel}
          </DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting content that violates our guidelines.
            {contentTitle && (
              <div className="mt-2 p-2 bg-muted rounded text-sm">
                <strong>Content:</strong> {contentTitle} by @{contentAuthor}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Why are you reporting this {contentTypeLabel}?</Label>
            <RadioGroup 
              value={selectedReason} 
              onValueChange={setSelectedReason}
              className="space-y-2"
            >
              {Object.entries(REPORT_REASONS).map(([value, label]) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={value} 
                    id={value}
                    data-testid={`radio-reason-${value}`}
                  />
                  <Label 
                    htmlFor={value} 
                    className="text-sm cursor-pointer flex-1"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label 
              htmlFor="additional-details" 
              className="text-sm font-medium"
            >
              Additional details (optional)
            </Label>
            <Textarea
              id="additional-details"
              placeholder="Please provide any additional context that might help us understand the issue..."
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              className="resize-none"
              rows={3}
              maxLength={500}
              data-testid="textarea-report-details"
            />
            <div className="text-xs text-muted-foreground text-right">
              {additionalDetails.length}/500 characters
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
              data-testid="button-cancel-report"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!selectedReason || reportMutation.isPending}
              className="flex-1"
              data-testid="button-submit-report"
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}