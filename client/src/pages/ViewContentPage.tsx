import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function ViewContentPage() {
  const [, params] = useRoute("/view/:id");
  const [location, navigate] = useLocation();

  useEffect(() => {
    // This component should rarely be seen as the server should handle redirects
    // But if we get here, try to redirect to the appropriate content page
    if (params?.id) {
      const contentId = params.id;

      // Check if this is a screenshot view
      if (location.includes('/view/screenshot/')) {
        // Let the server handle screenshot redirects
        return;
      }

      // For regular content, redirect to clips page
      // The server should have already handled the redirect, but this is a fallback
      setTimeout(() => {
        navigate(`/clips/${contentId}`);
      }, 100);
    }
  }, [params?.id, location, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Loading Content</h1>
          <p className="text-muted-foreground">
            Redirecting you to the content...
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => navigate("/")} 
            variant="default"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Button>

          <Button 
            onClick={() => window.history.back()} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>If you continue to see this page, the content may have been removed or is no longer available.</p>
        </div>
      </div>
    </div>
  );
}