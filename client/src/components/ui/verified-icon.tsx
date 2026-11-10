import verifiedIconPath from "@assets/green_badge_128_1758978841463.png";

interface VerifiedIconProps {
  size?: number;
  decorative?: boolean;
  className?: string;
}

export const VerifiedIcon = ({ size = 16, className = "", decorative = false }: VerifiedIconProps) => {
  return (
    <img 
      src={verifiedIconPath}
      alt={decorative ? "" : "Verified"}
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
      data-testid="icon-verified"
    />
  );
};