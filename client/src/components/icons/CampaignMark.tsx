import { forwardRef, type SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string };
/** Gamefolio campaign mark: a planted flag on an angular rock. */
const CampaignMark = forwardRef<SVGSVGElement, Props>(function CampaignMark(
  { size = 24, strokeWidth = 1.8, ...props }, ref,
) {
  return <svg ref={ref} width={size} height={size} viewBox="0 0 32 32" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M13 22V4" />
    <path d="M13 5h13l-4 5 4 5H13" />
    <path d="m3 28 5-6 6-2 7 2 8 6H3Z" />
    <path d="m14 20-2 8M21 22l-3 3" strokeWidth="1.4" />
  </svg>;
});
export default CampaignMark;
