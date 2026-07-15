import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportOwnershipDialog } from "./ReportOwnershipDialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface ReportOwnershipButtonProps {
  username: string;
  displayName?: string;
  variant?: "default" | "ghost" | "minimal";
  size?: "sm" | "lg";
  className?: string;
}

export function ReportOwnershipButton({
  username,
  displayName,
  variant = "ghost",
  size = "sm",
  className = "",
}: ReportOwnershipButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showReportDialog, setShowReportDialog] = useState(false);

  const handleReportClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({ title: "Login required", description: "Please login to report a profile.", variant: "destructive" });
      return;
    }
    if (user.username === username) return;

    setShowReportDialog(true);
  };

  const sizeClasses = { sm: "h-6 px-2", lg: "h-10 px-4" };
  const iconSizes = { sm: "h-3 w-3", lg: "h-5 w-5" };

  if (variant === "minimal") {
    return (
      <>
        <button
          onClick={handleReportClick}
          className={`text-gray-500 hover:text-red-500 transition-colors ${className}`}
          title="Report false ownership claim"
        >
          <Flag className={iconSizes[size]} />
        </button>
        <ReportOwnershipDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          username={username}
          displayName={displayName}
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
        title="Report false ownership claim"
      >
        <Flag className={iconSizes[size]} />
        <span className="ml-1">Report</span>
      </Button>
      <ReportOwnershipDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        username={username}
        displayName={displayName}
      />
    </>
  );
}
