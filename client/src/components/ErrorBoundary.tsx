import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: "app" | "feature";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  handleFullReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isAppLevel = this.props.level === "app";

      return (
        <div className="flex items-center justify-center min-h-[200px] p-6">
          <div className="flex flex-col items-center space-y-4 text-center max-w-md">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {isAppLevel ? "Something went wrong" : "This section encountered an error"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isAppLevel
                ? "The application ran into an unexpected problem. You can try reloading the page."
                : "This part of the page couldn't load properly. The rest of the app should still work."}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReload}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              {isAppLevel && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={this.handleFullReload}
                  className="gap-2"
                >
                  Reload Page
                </Button>
              )}
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="text-left w-full mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Error Details
                </summary>
                <pre className="text-xs text-destructive mt-2 p-2 bg-destructive/5 rounded overflow-auto max-h-40">
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
