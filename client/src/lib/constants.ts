// Format video duration from seconds to MM:SS format
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Define the available time periods for feed filtering
export const feedPeriods = [
  { value: 'recent', label: 'Most Recent' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: 'ever', label: 'Ever' },
];

// Define the placeholder thumbnail when no image is available
export const defaultThumbnail = "https://placehold.co/600x340/222/444?text=Video";

// Define the placeholder avatar when no user image is available
export const defaultAvatar = "https://placehold.co/100x100/222/444?text=User";

// Define max file upload size in bytes (500MB)
export const MAX_FILE_SIZE = 500 * 1024 * 1024;

// Define allowed video mime types
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-flv'
];

// Define platform sections for navigation
export const platformSections = [
  { name: "Home", path: "/", icon: "home" },
  { name: "Explore", path: "/explore", icon: "compass" },
  { name: "Trending", path: "/trending", icon: "flame" },
  { name: "Messages", path: "/messages", icon: "messageSquare" },
  { name: "Profile", path: "/profile", icon: "user" }
];

// Define share platforms
export const sharePlatforms = [
  { name: "Twitter", icon: "twitter" },
  { name: "Facebook", icon: "facebook" },
  { name: "Reddit", icon: "reddit" },
  { name: "WhatsApp", icon: "whatsapp" },
  { name: "Telegram", icon: "telegram" },
  { name: "Email", icon: "mail" }
];
