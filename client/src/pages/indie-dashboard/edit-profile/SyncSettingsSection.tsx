import { Section } from "./FieldRow";
import { NEON, CARD_BORDER } from "../../IndieDashboardPage";
import type { SectionWrapperProps } from "./types";
import { SiSteam, SiEpicgames, SiItchdotio } from "react-icons/si";

const SYNC_SOURCE_OPTIONS = [
  { value: "steam", label: "Steam", icon: SiSteam, color: "#66c0f4" },
  { value: "epic", label: "Epic Games", icon: SiEpicgames, color: "#a855f7" },
  { value: "itch", label: "itch.io", icon: SiItchdotio, color: "#fa5c5c" },
];

export function SyncSettingsSection({ profile, onSave, isSaving, open, onToggle, filledCount, totalCount }: SectionWrapperProps) {
  const autoSync = !!(profile as any)?.autoSyncEnabled;
  const preferred = (profile as any)?.preferredSyncSource ?? "";

  return (
    <Section id="sync-settings" title="Sync Settings" open={open} onToggle={onToggle} filledCount={filledCount} totalCount={totalCount}>
      <p className="text-[10px] text-white/30 pb-3">
        Control how store data is pulled into your profile. Manual overrides always take precedence over synced values when set.
      </p>

      {/* Auto-sync toggle */}
      <div className="py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white/50 mb-0.5">Auto-sync</div>
            <div className="text-[11px] text-white/30">Automatically pull store updates when you check for changes</div>
          </div>
          <button
            onClick={() => !isSaving && onSave("autoSyncEnabled", !autoSync)}
            disabled={isSaving}
            className="relative w-10 h-6 rounded-full transition-all"
            style={{ background: autoSync ? NEON : "rgba(255,255,255,0.12)" }}>
            <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ transform: autoSync ? "translateX(16px)" : "translateX(0)" }} />
          </button>
        </div>
      </div>

      {/* Preferred sync source */}
      <div className="py-3">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Preferred sync source</div>
        <div className="text-[11px] text-white/30 mb-3">Which store to prioritise when checking for field updates</div>
        <div className="grid grid-cols-3 gap-2">
          {SYNC_SOURCE_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = preferred === opt.value;
            return (
              <button key={opt.value}
                onClick={() => !isSaving && onSave("preferredSyncSource", active ? "" : opt.value)}
                disabled={isSaving}
                className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: active ? `${opt.color}1a` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? opt.color + "66" : CARD_BORDER}`,
                  color: active ? opt.color : "rgba(255,255,255,0.5)",
                }}>
                <Icon size={16} />
                {opt.label}
              </button>
            );
          })}
        </div>
        {!preferred && (
          <p className="text-[10px] text-white/25 mt-2">No preference — all connected stores will be checked.</p>
        )}
      </div>

      {/* Current override summary */}
      <div className="py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Override summary</div>
        <div className="text-[11px] text-white/40">
          Fields with manual edits are protected from sync. Use the{" "}
          <span className="font-bold" style={{ color: NEON }}>Revert</span> button on any field to restore its store-imported value.
          To override a store value permanently, simply edit the field — it will be marked as{" "}
          <span className="font-bold text-white/70">Manual</span>.
        </div>
      </div>
    </Section>
  );
}
