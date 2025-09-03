import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ClipCardSkeleton = () => {
  return (
    <Card className="overflow-hidden shadow">
      {/* Thumbnail */}
      <div style={{ aspectRatio: "16/9" }}>
        <Skeleton className="w-full h-full" />
      </div>
      
      {/* Content */}
      <CardContent className="p-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center">
            <Skeleton className="h-4 w-4 rounded-full mr-1" />
            <div>
              <Skeleton className="h-3 w-24 mb-0.5" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Footer */}
      <CardFooter className="px-1.5 py-0.5 border-t flex justify-between">
        <div className="flex space-x-1.5">
          <Skeleton className="h-2.5 w-6" />
          <Skeleton className="h-2.5 w-6" />
        </div>
        <Skeleton className="h-2.5 w-8" />
      </CardFooter>
    </Card>
  );
};

export default ClipCardSkeleton;