import { forwardRef, type HTMLAttributes } from 'react';
/** Shared homepage track: preserve card dimensions and the 16px spacing. */
export const GamefolioCarouselTrack = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function GamefolioCarouselTrack({children,className='',style,...props},ref){
  return <div ref={ref} className={`fire-carousel-track ${className}`} style={{display:'flex',width:'max-content',gap:16,...style}} {...props}>{children}</div>;
});
