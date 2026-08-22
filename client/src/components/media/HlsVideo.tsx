import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HlsVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
}

// Trailer URLs are sometimes HLS manifests (.m3u8) — e.g. Steam's appdetails
// API now only exposes movies as hls_h264/dash_h264 streams, no flat mp4.
// Chrome/Firefox need hls.js to play those; Safari plays them natively via
// the video element, and a direct .mp4 needs neither.
export default function HlsVideo({ src, ...videoProps }: HlsVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (!src.includes('.m3u8')) {
      video.src = src;
      return;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
  }, [src]);

  return <video ref={videoRef} {...videoProps} />;
}
