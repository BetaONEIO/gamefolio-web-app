import moderatorIconPath from "@assets/Moderator icon_1758988839137.png";

interface ModeratorIconProps {
  size?: number;
  className?: string;
}

export const ModeratorIcon = ({ size = 16, className = "" }: ModeratorIconProps) => {
  return (
    <img 
      src={moderatorIconPath}
      alt="Moderator"
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
      data-testid="icon-moderator"
    />
  );
};