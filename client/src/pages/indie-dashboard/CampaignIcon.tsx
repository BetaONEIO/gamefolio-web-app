import CampaignMark from '@/components/icons/CampaignMark';
export type CampaignIconType = 'quick-creator' | 'content-boost' | 'stream-spotlight' | 'creator-showcase' | 'custom-campaign';
type CampaignIconProps = { type?: CampaignIconType; active?: boolean; disabled?: boolean; className?: string };
export default function CampaignIcon({disabled=false,className}:CampaignIconProps) {
  return <CampaignMark size={32} className={className} style={{color:disabled?'#82908C':'#B9FF1A'}} />;
}
