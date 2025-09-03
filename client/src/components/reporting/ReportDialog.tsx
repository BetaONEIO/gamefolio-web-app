import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Flag, AlertTriangle } from "lucide-react";

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'clip' | 'screenshot' | 'comment';
  contentId: number;
  contentTitle?: string;
  contentPreview?: React.ReactNode;
}

const REPORT_REASONS = [
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "spam", label: "Spam or misleading" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "copyright", label: "Copyright infringement" },
  { value: "other", label: "Other" }
];

export function ReportDialog({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentTitle,
  contentPreview
}: ReportDialogProps) {
  const { toast } = useToast();
  const [selectedReason, setSelectedReason] = useState("");
  const [additionalMessage, setAdditionalMessage] = useState("");

  const reportMutation = useMutation({
    mutationFn: async () => {
      const endpoint = contentType === 'comment' 
        ? `/api/comments/${contentId}/report`
        : contentType === 'clip'
        ? `/api/clips/${contentId}/report`
        : `/api/screenshots/${contentId}/report`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: selectedReason,
          additionalMessage: additionalMessage.trim() || undefined
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit report');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Report submitted",
        description: `Thank you for reporting this ${contentType}. Our moderation team will review it shortly.`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedReason) {
      toast({
        title: "Reason required",
        description: "Please select a reason for reporting this content.",
        variant: "destructive",
      });
      return;
    }

    reportMutation.mutate();
  };

  const handleClose = () => {
    setSelectedReason("");
    setAdditionalMessage("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            Report Content
          </DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting inappropriate content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Content Preview */}
          {(contentTitle || contentPreview) && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border">
              <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Content being reported:
              </Label>
              {contentTitle && (
                <p className="font-medium mt-1 line-clamp-2">{contentTitle}</p>
              )}
              {contentPreview && (
                <div className="mt-2">
                  {contentPreview}
                </div>
              )}
            </div>
          )}

          {/* Reason Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Why are you reporting this {contentType}?
            </Label>
            <RadioGroup
              value={selectedReason}
              onValueChange={setSelectedReason}
              className="space-y-2"
            >
              {REPORT_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="text-sm cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Additional Message */}
          <div className="space-y-2">
            <Label htmlFor="additional-message" className="text-sm font-medium">
              Additional details (optional)
            </Label>
            <Textarea
              id="additional-message"
              placeholder="Provide any additional context that might help our moderation team..."
              value={additionalMessage}
              onChange={(e) => setAdditionalMessage(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {additionalMessage.length}/500 characters
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              False reports may result in restrictions on your account. Please only report content that violates our community guidelines.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || reportMutation.isPending}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {reportMutation.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}