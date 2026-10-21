import { Camera, Film, MessageSquare, Radio, Star, Clock, Play } from 'lucide-react';
const outputDetails: Record<string, { label: string; Icon: typeof Film }> = {
  clip: { label: 'Gameplay clips', Icon: Film },
  reel: { label: 'Vertical reels', Icon: Play },
  screenshot: { label: 'Screenshots', Icon: Camera },
  feedback: { label: 'Feedback responses', Icon: MessageSquare },
  review: { label: 'Creator reviews', Icon: Star },
  stream: { label: 'Verified livestreams', Icon: Radio },
  coverage: { label: 'Total live coverage', Icon: Clock },
};
export default function CampaignOutputStats({ outputs }: { outputs: { type: string; min: number; max: number; unit?: string; upTo?: boolean }[] }) {
  const gridColumns = outputs.length === 1
    ? 'grid-cols-1'
    : outputs.length === 2
      ? 'grid-cols-2'
      : outputs.length === 3
        ? 'grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-2 lg:grid-cols-4';
  return <div className={`mt-4 grid min-w-0 gap-3 ${gridColumns}`}>
    {outputs.map((output, index) => {
      const { label, Icon } = outputDetails[output.type] ?? { label: output.type, Icon: Film };
      return <div key={output.type} className={`min-w-0 rounded-lg border border-[#303447] bg-[#151827] p-3 ${outputs.length > 1 && outputs.length % 2 === 1 && index === outputs.length - 1 ? 'col-span-2 lg:col-span-1' : ''}`}>
        <p className="whitespace-nowrap text-[32px] font-bold leading-tight tabular-nums text-white xl:text-[40px]">{output.upTo && <span className="mr-1 text-sm font-semibold text-[#D2D6E0]">Up to</span>}{output.min === output.max ? output.max : `${output.min}–${output.max}`}{output.unit && <span className="ml-1 text-sm font-semibold">{output.unit}</span>}</p>
        <Icon size={16} aria-hidden="true" className="mb-1 mt-3 text-[#B9FF1A]"/>
        <p className="text-xs font-semibold uppercase leading-5 tracking-wide text-[#D2D6E0]">{label}</p>
      </div>;
    })}
  </div>;
}
