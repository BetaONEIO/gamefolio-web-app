import { useEffect, useState, type ReactNode } from "react";
import { useSignedUrl } from "@/hooks/use-signed-url";

/** Try the game's actual banner, cover and catalogue artwork in that order. */
export function StudioBannerArtwork({ sources, className, fallback, onSourceChange }: {
  sources: readonly string[];
  className: string;
  fallback: ReactNode;
  onSourceChange?: (url: string) => void;
}) {
  const sourceKey = JSON.stringify(sources);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  useEffect(() => setFailedSources([]), [sourceKey]);
  const source = sources.find(url => !failedSources.includes(url));
  const { signedUrl } = useSignedUrl(source);

  if (!source || !signedUrl) return <>{fallback}</>;
  return <img key={source} src={signedUrl} alt="Studio banner preview" className={className} onLoad={() => onSourceChange?.(source)} onError={() => setFailedSources(failed => [...failed, source])} />;
}
