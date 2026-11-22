import { useEffect, useState, type CSSProperties } from "react";
import { useSignedUrl } from "@/hooks/use-signed-url";

/** The shared logo shape used by the public studio profile and its editor. */
export function StudioLogo({ url, name, borderColor, accentColor, className = "" }: {
  url?: string | null;
  name: string;
  borderColor: string;
  accentColor?: string;
  className?: string;
}) {
  const { signedUrl } = useSignedUrl(url);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [signedUrl]);

  return (
    <div className={`shrink-0 overflow-hidden rounded-[1.25rem] border-4 ${className}`} style={{ borderColor, ...(accentColor ? { "--studio-accent": accentColor } : {}) } as CSSProperties}>
      {signedUrl && !failed ? (
        <img src={signedUrl} alt={`${name} logo`} className="h-full w-full rounded-[1rem] object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-[1rem] bg-[var(--studio-accent,#B9FF1A)] text-3xl font-bold text-[var(--studio-button-text,#071018)]">
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}
