import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ClipSkeletonProps {
  className?: string;
}

const ClipSkeleton = ({ className }: ClipSkeletonProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Thumbnail skeleton */}
      <div className="aspect-square relative overflow-hidden rounded-sm bg-[#1E2327]">
        <Skeleton className="h-full w-full" />
        
        {/* Duration badge skeleton */}
        <div className="absolute bottom-1 right-1">
          <Skeleton className="h-4 w-10 rounded-sm" />
        </div>
      </div>
      
      {/* Title skeleton */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        
        <div className="flex items-center justify-between mt-3 pt-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-3 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClipSkeleton;