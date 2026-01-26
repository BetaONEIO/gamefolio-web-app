import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import notFoundImage from "@assets/404_gamefolio_1769456375736.png";

export default function NotFound() {
  const [location, setLocation] = useLocation();
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-black">
      <div className="max-w-2xl w-full text-center space-y-6">
        {/* 404 Image */}
        <div className="flex justify-center mb-4">
          <img
            src={notFoundImage}
            alt="404 - Page Not Found"
            className="max-w-xs sm:max-w-sm md:max-w-md w-auto h-auto drop-shadow-2xl"
          />
        </div>

        {/* Error Message */}
        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Page Not Found</h2>
          <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
          <Button
            onClick={() => setLocation("/")}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3"
            data-testid="button-home"
          >
            <Home className="mr-2 h-5 w-5" />
            Go Home
          </Button>
          
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="w-full sm:w-auto border-primary/20 hover:bg-primary/10 font-semibold px-6 py-3"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go Back
          </Button>
          
          <Button
            onClick={() => setLocation("/explore")}
            variant="outline"
            className="w-full sm:w-auto border-primary/20 hover:bg-primary/10 font-semibold px-6 py-3"
            data-testid="button-explore"
          >
            <Search className="mr-2 h-5 w-5" />
            Explore
          </Button>
        </div>

        {/* Help Text */}
        <div className="pt-8 border-t border-border/20">
          <p className="text-sm text-muted-foreground">
            Need help? Check out our{" "}
            <Link href="/" className="text-primary hover:text-primary/80 underline">
              homepage
            </Link>{" "}
            or browse{" "}
            <Link href="/explore" className="text-primary hover:text-primary/80 underline">
              trending content
            </Link>
            .
          </p>
        </div>

        {/* Alpha Version Badge */}
        <div className="pt-4">
          <div className="inline-block px-3 py-1 bg-orange-500/10 text-orange-600 text-xs font-bold rounded-full border border-orange-500/20">
            Alpha 1.2 • Oct 11, 2025
          </div>
        </div>
      </div>
    </div>
  );
}
