import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { UserWithStats, User, Game } from "@shared/schema";
import FeaturedProfileCard from "./FeaturedProfileCard";
import { ChevronRight } from "lucide-react";

const FeaturedGamefoliosSection = () => {
  // This query would normally fetch featured users, for now we'll use the existing API
  const { data: featuredUsers, isLoading } = useQuery<UserWithStats[]>({
    queryKey: ["/api/users/featured"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/users/featured");
        return response.json();
      } catch (error) {
        // If the endpoint doesn't exist yet, return empty array
        console.error("Failed to fetch featured users:", error);
        return [];
      }
    }
  });

  return (
    <section className="mt-16">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground border-b-4 border-primary pb-2 inline-block">
          Featured Gamefolios
        </h2>
        <Link 
          href="/explore?tab=creators" 
          className="text-primary text-sm font-medium hover:underline flex items-center"
        >
          View all <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col items-center p-4 space-y-3">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      ) : featuredUsers && featuredUsers.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredUsers.map((user) => (
            <FeaturedProfileCard key={user.id} user={user} />
          ))}
        </div>
      ) : (
        // Display sample featured users if API doesn't return any
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {SAMPLE_FEATURED_USERS.map((user) => (
            <FeaturedProfileCard key={user.id} user={user as unknown as User & { favoriteGames?: Game[] }} />
          ))}
        </div>
      )}
    </section>
  );
};

// Sample data to use if the API doesn't exist yet
const SAMPLE_FEATURED_USERS = [
  {
    id: 1,
    username: "ProGamer42",
    displayName: "Pro Gamer",
    email: "progamer@example.com",
    password: "",
    emailVerified: true,
    bio: "Professional FPS player with 5+ years competitive experience. Currently top 100 in Valorant.",
    avatarUrl: "/attached_assets/image_1747082610599.png",
    bannerUrl: null,
    accentColor: "#00B2FF",
    primaryColor: "#02172C",
    layoutStyle: "grid",
    steamUsername: "progamer42",
    xboxUsername: null,
    playstationUsername: null,
    twitterUsername: "progamer42",
    youtubeUsername: "progamer42channel",
    createdAt: new Date(),
    updatedAt: new Date(),
    favoriteGames: [
      { id: 10, name: "Valorant", imageUrl: null, createdAt: new Date() },
      { id: 11, name: "CS:GO", imageUrl: null, createdAt: new Date() },
      { id: 12, name: "Apex Legends", imageUrl: null, createdAt: new Date() }
    ]
  },
  {
    id: 2,
    username: "RPGQueen",
    displayName: "RPG Queen",
    email: "rpgqueen@example.com",
    password: "",
    emailVerified: true,
    bio: "RPG enthusiast and speedrunner. I live for fantasy worlds and epic quests!",
    avatarUrl: "/attached_assets/image_1747083409829.png",
    bannerUrl: null,
    accentColor: "#FF00B2",
    primaryColor: "#02172C",
    layoutStyle: "grid",
    steamUsername: "rpgqueen",
    xboxUsername: "rpgqueen",
    playstationUsername: "rpg_queen",
    twitterUsername: null,
    youtubeUsername: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    favoriteGames: [
      { id: 20, name: "The Witcher 3", imageUrl: null, createdAt: new Date() },
      { id: 21, name: "Skyrim", imageUrl: null, createdAt: new Date() },
      { id: 22, name: "Dragon Age", imageUrl: null, createdAt: new Date() },
      { id: 23, name: "Elden Ring", imageUrl: null, createdAt: new Date() }
    ]
  },
  {
    id: 3,
    username: "SpeedyGonzalez",
    displayName: "Speedy Gonzalez",
    email: "speedy@example.com",
    password: "",
    emailVerified: false,
    bio: "Racing game specialist and world record holder in multiple tracks.",
    avatarUrl: "/attached_assets/image_1747083583825.png",
    bannerUrl: null,
    accentColor: "#00FF8C",
    primaryColor: "#02172C",
    layoutStyle: "grid",
    steamUsername: null,
    xboxUsername: "speedygonzalez",
    playstationUsername: "speedy_gonzalez",
    twitterUsername: "speedyg",
    youtubeUsername: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    favoriteGames: [
      { id: 30, name: "Forza Horizon 5", imageUrl: null, createdAt: new Date() },
      { id: 31, name: "Gran Turismo 7", imageUrl: null, createdAt: new Date() },
      { id: 32, name: "F1 2023", imageUrl: null, createdAt: new Date() }
    ]
  },
  {
    id: 4,
    username: "StrategyMaster",
    displayName: "Strategy Master",
    email: "strategy@example.com",
    password: "",
    emailVerified: true,
    bio: "4X and strategy game player. I never lose at chess and rarely at Civilization.",
    avatarUrl: "/attached_assets/image_1747084154568.png",
    bannerUrl: null,
    accentColor: "#FFB800",
    primaryColor: "#02172C",
    layoutStyle: "grid",
    steamUsername: "strategy_master",
    xboxUsername: null,
    playstationUsername: null,
    twitterUsername: "strategy_master",
    youtubeUsername: "strategymasterchannel",
    createdAt: new Date(),
    updatedAt: new Date(),
    favoriteGames: [
      { id: 40, name: "Civilization VI", imageUrl: null, createdAt: new Date() },
      { id: 41, name: "Age of Empires IV", imageUrl: null, createdAt: new Date() },
      { id: 42, name: "Stellaris", imageUrl: null, createdAt: new Date() }
    ]
  }
];

export default FeaturedGamefoliosSection;