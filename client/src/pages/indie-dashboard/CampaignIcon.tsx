import type { CSSProperties } from "react";

export type CampaignIconType =
  | "quick-creator"
  | "content-boost"
  | "stream-spotlight"
  | "creator-showcase"
  | "custom-campaign";

type CampaignIconProps = {
  type: CampaignIconType;
  active?: boolean;
  disabled?: boolean;
  className?: string;
};

const labels: Record<CampaignIconType, string> = {
  "quick-creator": "Quick creator",
  "content-boost": "Content boost",
  "stream-spotlight": "Stream spotlight",
  "creator-showcase": "Creator showcase",
  "custom-campaign": "Build your own campaign",
};

export default function CampaignIcon({
  type,
  disabled = false,
  className,
}: CampaignIconProps) {
  const style: CSSProperties = { color: disabled ? "#82908C" : "#B9FF1A" };

  return (
    <svg
      aria-label={labels[type] ?? "Campaign"}
      className={className}
      role="img"
      viewBox="0 0 32 32"
      width="32"
      height="32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      {!labels[type] && <path d="M5 5h22v22H5zM10 16h12M16 10v12" stroke="currentColor" strokeWidth="2"/>}
      {type === "quick-creator" && (
        <>
          <path d="M3 11h4M2 16h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M19 3 6 18h8l-4 11 16-16h-8l4-10Zm-4.7 11.3 5.4 2.8-5.4 3.2v-6Z"
            fill="none"
            fillRule="evenodd"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="m14.3 14.3 5.4 2.8-5.4 3.2v-6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </>
      )}

      {type === "content-boost" && (
        <>
          <path d="M4 9.5h13v10H4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" opacity=".55" />
          <path d="M8 6h13v11" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" opacity=".72" />
          <rect x="10" y="12" width="15" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" />
          <path d="m16 15.3 4.4 2.7-4.4 2.7v-5.4Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="m25.7 4 .7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M24.5 10v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </>
      )}

      {type === "stream-spotlight" && (
        <>
          <path d="m16 3 2 4h-4l2-4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M16 8v2.5M13.2 10.8l-1.6 2M18.8 10.8l1.6 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7.1 9.2a10 10 0 0 0 0 13.6M3.7 6a14.5 14.5 0 0 0 0 20M24.9 9.2a10 10 0 0 1 0 13.6M28.3 6a14.5 14.5 0 0 1 0 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="m13 14 7 4-7 4v-8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M11 27h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".7" />
        </>
      )}

      {type === "creator-showcase" && <>
        <path d="M12 20 9 23 5 27l1-7 4-4M16 23l5 3 1-7M10 20C10 10 18 4 27 4c0 9-6 17-16 17Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <circle cx="21" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
        <path d="m5 4 .8 2.1L8 7l-2.2.8L5 10l-.8-2.2L2 7l2.2-.9L5 4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </>}

      {type === "custom-campaign" && (
        <>
          <path d="M5 7.5h7v7H5zM17 5h9v9h-9zM5 19h9v8H5z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
          <path d="M12 11h3M14 14v4M14 23h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".8" />
          <path d="M21.5 7.5v4M19.5 9.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8.5 21.5v3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M19 22.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="23.2" cy="22.5" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </>
      )}
    </svg>
  );
}