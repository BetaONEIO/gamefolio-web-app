import React from 'react';
import { UserWithStats } from '@shared/schema';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FaSteam, FaXbox, FaPlaystation, FaTwitter, FaYoutube, FaDiscord, FaInstagram, FaFacebook } from 'react-icons/fa';
import { SiEpicgames, SiNintendo } from 'react-icons/si';
import { cn } from '@/lib/utils';

interface PlatformConnectionsProps {
  profile: UserWithStats;
  className?: string;
}

const PlatformConnections: React.FC<PlatformConnectionsProps> = ({ 
  profile,
  className
}) => {
  // List of all platform connections with their respective icons and URLs
  const platforms = [
    {
      name: 'Steam',
      username: profile.steamUsername,
      icon: <FaSteam className="w-5 h-5" />,
      url: (username: string) => `https://steamcommunity.com/id/${username}`,
      color: 'text-[#1B2838] dark:text-[#66c0f4] hover:text-[#66c0f4]'
    },
    {
      name: 'Xbox',
      username: profile.xboxUsername,
      icon: <FaXbox className="w-5 h-5" />,
      url: (username: string) => `https://account.xbox.com/profile?gamertag=${username}`,
      color: 'text-[#107C10] hover:opacity-80'
    },
    {
      name: 'PlayStation',
      username: profile.playstationUsername,
      icon: <FaPlaystation className="w-5 h-5" />,
      url: (username: string) => `https://my.playstation.com/${username}`,
      color: 'text-[#003791] hover:opacity-80'
    },
    {
      name: 'Discord',
      username: profile.discordUsername,
      icon: <FaDiscord className="w-5 h-5" />,
      url: (username: string) => `https://discord.com/users/${username}`,
      color: 'text-[#7289DA] hover:opacity-80'
    },
    {
      name: 'Epic Games',
      username: profile.epicUsername,
      icon: <SiEpicgames className="w-5 h-5" />,
      url: (username: string) => `https://store.epicgames.com/u/${username}`,
      color: 'text-[#313131] hover:opacity-80'
    },
    {
      name: 'Nintendo',
      username: profile.nintendoUsername,
      icon: <SiNintendo className="w-5 h-5" />,
      url: (username: string) => `https://nintendo.com/`,
      color: 'text-[#E60012] hover:opacity-80'
    },
    {
      name: 'X',
      username: profile.twitterUsername,
      icon: <FaTwitter className="w-5 h-5" />,
      url: (username: string) => `https://twitter.com/${username}`,
      color: 'text-[#1DA1F2] hover:opacity-80'
    },
    {
      name: 'YouTube',
      username: profile.youtubeUsername,
      icon: <FaYoutube className="w-5 h-5" />,
      url: (username: string) => `https://youtube.com/@${username}`,
      color: 'text-[#FF0000] hover:opacity-80'
    },
    {
      name: 'Instagram',
      username: profile.instagramUsername,
      icon: <FaInstagram className="w-5 h-5" />,
      url: (username: string) => `https://instagram.com/${username}`,
      color: 'text-[#E4405F] hover:opacity-80'
    },
    {
      name: 'Facebook',
      username: profile.facebookUsername,
      icon: <FaFacebook className="w-5 h-5" />,
      url: (username: string) => `https://facebook.com/${username}`,
      color: 'text-[#1877F2] hover:opacity-80'
    }
  ];

  // Filter out platforms without a username
  const connectedPlatforms = platforms.filter(platform => platform.username);

  if (connectedPlatforms.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-3 pt-4 border-t border-primary", className)}>
      <TooltipProvider>
        {connectedPlatforms.map((platform, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <a 
                href={platform.url(platform.username!)} 
                target="_blank" 
                rel="noopener noreferrer"
                className={cn(
                  "transition-colors flex items-center gap-1.5", 
                  platform.color
                )}
              >
                {platform.icon}
                <span className="text-sm font-medium">{platform.username}</span>
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>{platform.name}: {platform.username}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
};

export default PlatformConnections;