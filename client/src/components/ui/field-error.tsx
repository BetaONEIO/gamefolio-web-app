import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldErrorProps {
  error?: string;
  success?: string;
  className?: string;
  variant?: "error" | "success" | "warning";
}

export function FieldError({ error, success, className, variant = "error" }: FieldErrorProps) {
  if (!error && !success) return null;
  
  const message = error || success;
  const isError = !!error;
  const isSuccess = !!success;
  
  return (
    <div 
      className={cn(
        "flex items-center gap-2 text-xs mt-1 px-3 py-2 rounded-md border transition-all duration-200 animate-in fade-in-0 slide-in-from-top-1",
        {
          // Error styling - using destructive theme
          "bg-destructive/10 border-destructive/30 text-destructive": isError,
          // Success styling - using primary theme (green)
          "bg-primary/10 border-primary/40 text-primary": isSuccess,
        },
        className
      )}
    >
      {isError && <XCircle className="h-3 w-3 text-destructive shrink-0" />}
      {isSuccess && <CheckCircle className="h-3 w-3 text-primary shrink-0" />}
      <span className="font-medium">{message}</span>
    </div>
  );
}

interface FieldStatusProps {
  status: "idle" | "checking" | "available" | "taken" | "invalid";
  className?: string;
}

export function FieldStatus({ status, className }: FieldStatusProps) {
  if (status === "idle") return null;
  
  const statusConfig = {
    checking: {
      text: "Checking availability...",
      className: "bg-primary/10 border-primary/30 text-primary",
      icon: <AlertCircle className="h-3 w-3 text-primary shrink-0 animate-pulse" />
    },
    available: {
      text: "Available",
      className: "bg-primary/10 border-primary/40 text-primary",
      icon: <CheckCircle className="h-3 w-3 text-primary shrink-0" />
    },
    taken: {
      text: "Username already taken",
      className: "bg-destructive/10 border-destructive/30 text-destructive",
      icon: <XCircle className="h-3 w-3 text-destructive shrink-0" />
    },
    invalid: {
      text: "Username must be 3-20 characters, letters/numbers/underscores only",
      className: "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400",
      icon: <XCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400 shrink-0" />
    }
  };
  
  const config = statusConfig[status];
  
  return (
    <div 
      className={cn(
        "flex items-center gap-2 text-xs mt-1 px-3 py-2 rounded-md border transition-all duration-200 animate-in fade-in-0 slide-in-from-top-1",
        config.className,
        className
      )}
    >
      {config.icon}
      <span className="font-medium">{config.text}</span>
    </div>
  );
}