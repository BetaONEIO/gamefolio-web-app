import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { getSourceColor, type SourceLabel } from "./types";

const SOURCE_ROWS: Array<{ label: SourceLabel; description: string }> = [
  { label: "MANUAL", description: "Entered or edited directly in Gamefolio." },
  { label: "IMPORTED", description: "Imported from a connected source that is not one of the named stores below." },
  { label: "STEAM", description: "Imported from your Steam store page." },
  { label: "ITCH.IO", description: "Imported from your itch.io page." },
  { label: "EPIC", description: "Imported from your Epic Games store page." },
  { label: "OVERRIDDEN", description: "A manual value is taking priority over a previously imported value." },
];

export function DataSourceExplainer({ className = "", showOverridden = false }: { className?: string; showOverridden?: boolean }) {
  const [open, setOpen] = useState(false);
  const rows = showOverridden ? SOURCE_ROWS : SOURCE_ROWS.filter(({ label }) => label !== "OVERRIDDEN");

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-[11px] text-white/45 hover:text-white/75 transition-colors ${className}`}
        aria-haspopup="dialog"
      >
        <Info size={13} />
        About data sources
      </button>
      {open && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.68)", backdropFilter: "blur(4px)" }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="data-source-explainer-title"
            className="w-full max-w-md rounded-2xl p-5 shadow-2xl"
            style={{ background: "#10171d", border: "1px solid rgba(255,255,255,0.14)" }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 id="data-source-explainer-title" className="text-sm font-bold text-white">About data sources</h2>
                <p className="text-xs text-white/45 mt-1 leading-relaxed">
                  Source labels show where each game profile value came from. They do not change how imports or sync work.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close data source explanation"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2.5">
              {rows.map(({ label, description }) => (
                <div key={label} className="flex items-start gap-3">
                  <span
                    className="shrink-0 min-w-[72px] text-center text-[9px] font-bold tracking-wider px-1.5 py-1 rounded"
                    style={{
                      color: getSourceColor(label),
                      background: `${getSourceColor(label)}18`,
                      border: `1px solid ${getSourceColor(label)}35`,
                    }}
                  >
                    {label}
                  </span>
                  <p className="text-xs text-white/55 leading-relaxed pt-0.5">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}