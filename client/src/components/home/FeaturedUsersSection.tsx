import { User } from "@shared/schema";
import FeaturedProfileCard from "@/components/profile/FeaturedProfileCard";

// Demo users to showcase custom avatar border colors
const demoFeaturedUsers: User[] = [
  {
    id: 1,
    username: "Lord_Lurk87",
    displayName: "Lord Lurk",
    bio: "Competitive FPS player with a passion for clutch moments",
    avatarUrl: "/attached_assets/gamefolio social logo 3d circle web.png",
    bannerUrl: null,
    avatarBorderColor: "#FF6B35",
    accentColor: "#FF6B35",
    primaryColor: "#FF6B35",
    backgroundColor: null,
    cardColor: null,
    location: null,
    website: null,
    socialLinks: null,
    gamePreferences: null,
    privacySettings: null,
    notificationSettings: null,
    userType: "gamer",
    ageRange: "18-24",
    createdAt: new Date(),
    updatedAt: new Date(),
    username: "Lord_Lurk87",
    email: null,
    password: "",
    emailVerified: true,
    steamUsername: null,
    xboxUsername: null,
    playstationUsername: null,
    twitterUsername: null,
    youtubeUsername: null,
    discordUsername: null,
    epicUsername: null,
    nintendoUsername: null,
    role: "user",
    totalLoginTime: 0
  },
  {
    id: 2,
    username: "Goliath",
    displayName: "Goliath",
    bio: "Professional esports player focusing on strategy games",
    avatarUrl: "/attached_assets/gamefolio social logo 3d circle web.png",
    bannerUrl: null,
    avatarBorderColor: "#E91E63",
    accentColor: "#E91E63",
    primaryColor: "#E91E63",
    backgroundColor: null,
    cardColor: null,
    location: null,
    website: null,
    socialLinks: null,
    gamePreferences: null,
    privacySettings: null,
    notificationSettings: null,
    userType: "gamer",
    ageRange: "25-34",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: null,
    password: "",
    emailVerified: true,
    steamUsername: null,
    xboxUsername: null,
    playstationUsername: null,
    twitterUsername: null,
    youtubeUsername: null,
    discordUsername: null,
    epicUsername: null,
    nintendoUsername: null,
    role: "user",
    totalLoginTime: 0
  },
  {
    id: 3,
    username: "mod_tom",
    displayName: "Administrator",
    bio: "Platform Administrator",
    avatarUrl: "/attached_assets/gamefolio social logo 3d circle web.png",
    bannerUrl: null,
    avatarBorderColor: "#9C27B0",
    accentColor: "#9C27B0",
    primaryColor: "#9C27B0",
    backgroundColor: null,
    cardColor: null,
    location: null,
    website: null,
    socialLinks: null,
    gamePreferences: null,
    privacySettings: null,
    notificationSettings: null,
    userType: "gamer",
    ageRange: "25-34",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: null,
    password: "",
    emailVerified: true,
    steamUsername: null,
    xboxUsername: null,
    playstationUsername: null,
    twitterUsername: null,
    youtubeUsername: null,
    discordUsername: null,
    epicUsername: null,
    nintendoUsername: null,
    role: "admin",
    totalLoginTime: 0
  }
];

const FeaturedUsersSection = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {demoFeaturedUsers.map((user) => (
        <FeaturedProfileCard key={user.id} user={user} />
      ))}
    </div>
  );
};

export default FeaturedUsersSection;