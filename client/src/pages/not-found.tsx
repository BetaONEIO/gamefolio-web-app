import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  // Enforce onboarding completion even on 404 pages
  useEffect(() => {
    if (!isLoading && user && (!user.userType || !user.ageRange)) {
      setLocation("/onboarding");
    }
  }, [user, isLoading, setLocation]);

  // If user needs onboarding, don't show 404 page
  if (user && (!user.userType || !user.ageRange)) {
    return null;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="mt-6">
            <Button 
              onClick={() => setLocation("/")}
              className="w-full"
            >
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
