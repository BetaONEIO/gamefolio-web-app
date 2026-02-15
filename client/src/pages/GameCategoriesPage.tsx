import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Filter, Grid3X3, ThumbsUp, Gamepad2 } from 'lucide-react';
import { Game } from '@shared/schema';
import { Badge } from '@/components/ui/badge';

// Common game categories (would come from API in production)
const CATEGORIES = [
  { id: 'action', name: 'Action', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'adventure', name: 'Adventure', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'rpg', name: 'RPG', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'shooter', name: 'Shooter', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'strategy', name: 'Strategy', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'sports', name: 'Sports', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'simulation', name: 'Simulation', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'racing', name: 'Racing', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'fighting', name: 'Fighting', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'platformer', name: 'Platformer', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'puzzle', name: 'Puzzle', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'horror', name: 'Horror', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'battle-royale', name: 'Battle Royale', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'indie', name: 'Indie', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
  { id: 'mmo', name: 'MMO', icon: <Gamepad2 className="h-4 w-4 mr-2" /> },
];

interface GameCard {
  id: number;
  name: string;
  imageUrl: string;
  category: string;
  clipCount: number;
}

const GameCategoriesPage = () => {
  const [location, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Extract category from URL if present
  useEffect(() => {
    const pathSegments = location.split('/');
    if (pathSegments.length >= 3 && pathSegments[1] === 'browse' && pathSegments[2] === 'games') {
      const category = pathSegments[3];
      if (category && category !== 'categories') {
        setSelectedCategory(category);
      } else {
        setSelectedCategory(null);
      }
    }
  }, [location]);
  
  // Use the RAWG API to fetch games by category
  const { data: games, isLoading } = useQuery<GameCard[]>({
    queryKey: ['/api/games/by-category', selectedCategory],
    queryFn: async () => {
      // In production, this would fetch from RAWG API using the selectedCategory
      // For now, return mock data
      return [
        { id: 1, name: 'Elden Ring', imageUrl: 'https://media.rawg.io/media/games/5ec/5ecac5cb026ec26a56efcc546364e348.jpg', category: selectedCategory || 'action', clipCount: 32 },
        { id: 2, name: 'The Witcher 3', imageUrl: 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg', category: selectedCategory || 'rpg', clipCount: 47 },
        { id: 3, name: 'Cyberpunk 2077', imageUrl: 'https://media.rawg.io/media/games/26d/26d4437715bee60138dab4a7c8c59c92.jpg', category: selectedCategory || 'rpg', clipCount: 29 },
        { id: 4, name: 'God of War', imageUrl: 'https://media.rawg.io/media/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg', category: selectedCategory || 'action', clipCount: 41 },
        { id: 5, name: 'Red Dead Redemption 2', imageUrl: 'https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg', category: selectedCategory || 'adventure', clipCount: 38 },
        { id: 6, name: 'Fortnite', imageUrl: 'https://media.rawg.io/media/games/b72/b7233d5d5b1e75e91d5ee22e34d6c919.jpg', category: selectedCategory || 'battle-royale', clipCount: 56 },
      ];
    },
    enabled: true,
  });
  
  return (
    <div className="py-3 container max-w-7xl mx-auto">
      <div className="flex items-center mb-4">
        <Button variant="ghost" onClick={() => setLocation('/explore')} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold">
          {selectedCategory ? `${selectedCategory.charAt(0).toUpperCase()}${selectedCategory.slice(1)} Games` : 'Game Categories'}
        </h1>
      </div>
      
      {!selectedCategory && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {CATEGORIES.map(category => (
            <Link key={category.id} href={`/browse/games/${category.id}`}>
              <Card className="h-full cursor-pointer hover:bg-accent transition-colors">
                <CardContent className="flex items-center p-3">
                  {category.icon}
                  <span className="font-medium">{category.name}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      
      {selectedCategory && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map(category => (
              <Link key={category.id} href={`/browse/games/${category.id}`}>
                <Badge variant={selectedCategory === category.id ? "default" : "outline"} className="cursor-pointer">
                  {category.name}
                </Badge>
              </Link>
            ))}
          </div>
          
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3.5 w-3.5 mr-1.5" /> Filter
              </Button>
              <Button variant="outline" size="sm" className="h-8">
                <ThumbsUp className="h-3.5 w-3.5 mr-1.5" /> Most Popular
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="h-8">
              <Grid3X3 className="h-3.5 w-3.5 mr-1.5" /> Grid View
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {isLoading ? (
              Array(10).fill(0).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-32 w-full" />
                  <CardContent className="p-2">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))
            ) : (
              games?.map(game => (
                <Link key={game.id} href={`/explore?game=${game.id}`}>
                  <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img src={game.imageUrl} alt={game.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <CardContent className="p-2">
                      <h3 className="font-medium text-sm truncate">{game.name}</h3>
                      <p className="text-xs text-muted-foreground">{game.clipCount} clips</p>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCategoriesPage;