import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "./ReportDialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface ReportButtonProps {
  contentType: 'clip' | 'screenshot' | 'comment';
  contentId: number;
  contentTitle?: string;
  contentPreview?: React.ReactNode;
  variant?: 'default' | 'ghost' | 'minimal';
  size?: 'sm' | 'lg';
  className?: string;
}

export function ReportButton({
  contentType,
  contentId,
  contentTitle,
  contentPreview,
  variant = 'ghost',
  size = 'sm',
  className = ""
}: ReportButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showReportDialog, setShowReportDialog] = useState(false);

  const handleReportClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to report content.",
        variant: "destructive",
      });
      return;
    }

    setShowReportDialog(true);
  };

  const sizeClasses = {
    sm: "h-6 px-2",
    lg: "h-10 px-4"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    lg: "h-5 w-5"
  };

  if (variant === 'minimal') {
    return (
      <>
        <button
          onClick={handleReportClick}
          className={`text-gray-500 hover:text-red-500 transition-colors ${className}`}
          title="Report content"
        >
          <Flag className={iconSizes[size]} />
        </button>
        <ReportDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          contentType={contentType}
          contentId={contentId}
          contentTitle={contentTitle}
          contentPreview={contentPreview}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleReportClick}
        className={`text-gray-500 hover:text-red-500 ${sizeClasses[size]} ${className}`}
        title="Report content"
      >
        <Flag className={iconSizes[size]} />
        <span className="ml-1">Report</span>
      </Button>
      <ReportDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        contentType={contentType}
        contentId={contentId}
        contentTitle={contentTitle}
        contentPreview={contentPreview}
      />
    </>
  );
}