import LatestContentSlider from "@/components/home/LatestContentSlider";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LatestContentPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0B1319" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-32">
        {/* Back button */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 shrink-0">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Latest Content</h1>
            <p className="text-xs text-gray-400 mt-0.5">Top 3 newest clips and reels from the community</p>
          </div>
        </div>

        <LatestContentSlider />
      </div>
    </div>
  );
}
