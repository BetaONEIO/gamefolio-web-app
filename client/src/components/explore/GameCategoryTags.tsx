import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, Star, TrendingUp, ZapIcon, Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Common game categories
const CATEGORIES = [
  { id: "action", name: "Action", icon: <Flame className="h-3 w-3 mr-1" /> },
  { id: "rpg", name: "RPG", icon: <Star className="h-3 w-3 mr-1" /> },
  { id: "fps", name: "FPS", icon: <ZapIcon className="h-3 w-3 mr-1" /> },
  { id: "sports", name: "Sports", icon: <TrendingUp className="h-3 w-3 mr-1" /> },
  { id: "racing", name: "Racing", icon: <TrendingUp className="h-3 w-3 mr-1" /> },
  { id: "strategy", name: "Strategy", icon: <Gamepad2 className="h-3 w-3 mr-1" /> },
  { id: "mmo", name: "MMO", icon: <Star className="h-3 w-3 mr-1" /> },
  { id: "indie", name: "Indie", icon: <Gamepad2 className="h-3 w-3 mr-1" /> }
];

interface GameCategoryTagsProps {
  className?: string;
  onCategorySelect?: (category: string) => void;
}

const GameCategoryTags = ({ className, onCategorySelect }: GameCategoryTagsProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Could fetch categories from RAWG in the future
  const { isLoading } = useQuery({
    queryKey: ['/api/game-categories'],
    queryFn: async () => {
      // This endpoint doesn't exist yet - we're using the hardcoded categories
      // In a future update we'd fetch real categories from RAWG
      return CATEGORIES;
    },
    enabled: false, // Disable actual fetching for now
  });
  
  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    }
  };
  
  if (isLoading) {
    return (
      <div className={cn("flex flex-wrap gap-1.5 mb-3", className)}>
        {Array(6).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>
    );
  }
  
  return (
    <div className={cn("flex flex-wrap gap-1.5 mb-3", className)}>
      <Button
        size="sm"
        variant={!selectedCategory ? "default" : "outline"}
        className="h-7 rounded-full text-xs px-3"
        onClick={() => handleCategoryClick("")}
      >
        <Flame className="h-3 w-3 mr-1" /> Hot
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        className="h-7 rounded-full text-xs px-3"
        onClick={() => handleCategoryClick("new")}
      >
        <Star className="h-3 w-3 mr-1" /> New
      </Button>
      
      {CATEGORIES.map(category => (
        <Link 
          key={category.id}
          href={`/browse/games/${category.id}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Badge 
            variant="outline"
            className="py-1.5 h-7 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {category.icon}
            {category.name}
          </Badge>
        </Link>
      ))}
      
      <Link href="/browse/games/categories">
        <Badge 
          variant="outline" 
          className="py-1.5 h-7 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Gamepad2 className="h-3 w-3 mr-1" />
          All Categories
        </Badge>
      </Link>
    </div>
  );
};

export default GameCategoryTags;