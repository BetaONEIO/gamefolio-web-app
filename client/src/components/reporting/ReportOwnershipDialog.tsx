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

interface ReportOwnershipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  displayName?: string;
}

const OWNERSHIP_REPORT_REASONS = [
  { value: "not_their_game", label: "This isn't their game" },
  { value: "impersonation", label: "Impersonating the real developer" },
  { value: "stolen_assets", label: "Using stolen screenshots/assets from another game" },
  { value: "other", label: "Other" },
];

export function ReportOwnershipDialog({ isOpen, onClose, username, displayName }: ReportOwnershipDialogProps) {
  const { toast } = useToast();
  const [selectedReason, setSelectedReason] = useState("");
  const [additionalMessage, setAdditionalMessage] = useState("");

  const reportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${username}/report-ownership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: selectedReason,
          additionalMessage: additionalMessage.trim() || undefined,
        }),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Failed to submit report");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Thank you for reporting this. Our moderation team will review it shortly.",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!selectedReason) {
      toast({ title: "Reason required", description: "Please select a reason for this report.", variant: "destructive" });
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
      <DialogContent className="max-w-md mx-4 my-8 sm:m-6 max-h-[90vh] overflow-y-auto z-[10001]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            Report False Ownership Claim
          </DialogTitle>
          <DialogDescription>
            Let us know if {displayName || username} is falsely claiming to own or develop this game.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Why are you reporting this profile?</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-2">
              {OWNERSHIP_REPORT_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={`ownership-${reason.value}`} />
                  <Label htmlFor={`ownership-${reason.value}`} className="text-sm cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownership-additional-message" className="text-sm font-medium">
              Additional details (optional)
            </Label>
            <Textarea
              id="ownership-additional-message"
              placeholder="Links or context that support this report..."
              value={additionalMessage}
              onChange={(e) => setAdditionalMessage(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500">{additionalMessage.length}/500 characters</p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              False reports may result in restrictions on your account. Please only report profiles that are genuinely misrepresenting game ownership.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
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
