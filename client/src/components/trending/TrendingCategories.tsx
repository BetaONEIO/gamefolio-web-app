import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TrendingCategoriesProps {
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
  className?: string;
}

export function TrendingCategories({
  selectedCategory,
  onCategorySelect,
  className,
}: TrendingCategoriesProps) {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['/api/games/categories'],
    queryFn: async () => {
      const response = await fetch('/api/games/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    },
  });

  const handleCategoryClick = (category: string) => {
    onCategorySelect(category === selectedCategory ? null : category);
  };

  if (isLoading) {
    return (
      <div className={cn("flex flex-wrap gap-2 mb-4", className)}>
        {Array(6).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2 mb-4", className)}>
      <Badge
        variant={selectedCategory === null ? "default" : "secondary"}
        className="cursor-pointer hover:bg-primary/80 transition-colors"
        onClick={() => onCategorySelect(null)}
      >
        All Games
      </Badge>
      {categories.map((category: { category: string; count: number }) => (
        <Badge
          key={category.category}
          variant={selectedCategory === category.category ? "default" : "secondary"}
          className="cursor-pointer hover:bg-primary/80 transition-colors"
          onClick={() => handleCategoryClick(category.category)}
        >
          {category.category}
          <span className="ml-1 text-xs opacity-75">({category.count})</span>
        </Badge>
      ))}
    </div>
  );
}