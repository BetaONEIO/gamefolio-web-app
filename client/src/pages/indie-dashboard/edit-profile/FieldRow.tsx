import { useState } from "react";
import { Check, X, Edit2, RotateCcw, ExternalLink, Plus, Trash2, ChevronDown, ChevronRight, Monitor, Smartphone, Globe, Gamepad2 } from "lucide-react";
import { NEON, CARD_BG, CARD_BORDER } from "../../IndieDashboardPage";
import { SOURCE_COLORS, PLATFORM_OPTIONS, formatFieldName, type FieldMeta, type Profile, type FieldType } from "./types";

// ─── Source Badge ─────────────────────────────────────────────────────────────

export function SourceBadge({ fieldName, fieldMeta }: { fieldName: string; fieldMeta: FieldMeta }) {
  const meta = fieldMeta[fieldName];
  if (!meta) return null;
  if (meta.isManualOverride) {
    return (
      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
        style={{ background: `${NEON}22`, color: NEON, border: `1px solid ${NEON}44` }}>
        Manual
      </span>
    );
  }
  if (meta.importSource) {
    const color = SOURCE_COLORS[meta.importSource] ?? "#aaa";
    return (
      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
        style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
        {meta.importSource}
      </span>
    );
  }
  return null;
}

// ─── Tag Array Editor ─────────────────────────────────────────────────────────

export function TagArrayEditor({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => { const t = input.trim(); if (t && !values.includes(t)) onChange([...values, t]); setInput(""); };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {values.map((v, i) => (
          <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${CARD_BORDER}` }}>
            {v}
            <button onClick={() => onChange(values.filter((_, j) => j !== i))} className="opacity-50 hover:opacity-100 ml-0.5"><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Type and press Enter"
          className="flex-1 bg-transparent border rounded px-2 py-1 text-sm text-white outline-none"
          style={{ borderColor: "rgba(255,255,255,0.2)" }} />
        <button onClick={add} className="px-2 py-1 rounded text-xs font-bold"
          style={{ background: `${NEON}22`, color: NEON, border: `1px solid ${NEON}44` }}>Add</button>
      </div>
    </div>
  );
}

// ─── URL Array Editor ─────────────────────────────────────────────────────────

export function UrlArrayEditor({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => { const t = input.trim(); if (t && !values.includes(t)) onChange([...values, t]); setInput(""); };
  return (
    <div className="space-y-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={v} onChange={e => { const c = [...values]; c[i] = e.target.value; onChange(c); }}
            className="flex-1 bg-transparent border rounded px-2 py-1 text-xs text-white outline-none font-mono"
            style={{ borderColor: "rgba(255,255,255,0.15)" }} />
          <button onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-red-400 opacity-60 hover:opacity-100">
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="https://..."
          className="flex-1 bg-transparent border rounded px-2 py-1 text-xs text-white outline-none font-mono"
          style={{ borderColor: "rgba(255,255,255,0.2)" }} />
        <button onClick={add} className="px-2 py-1 rounded text-xs font-bold"
          style={{ background: `${NEON}22`, color: NEON, border: `1px solid ${NEON}44` }}>
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Platform Select ──────────────────────────────────────────────────────────

const ICON_MAP = { Monitor, Globe, Gamepad2, Smartphone };

export function PlatformToggleGrid({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {PLATFORM_OPTIONS.map(opt => {
        const selected = values.includes(opt.id);
        const Icon = ICON_MAP[opt.icon as keyof typeof ICON_MAP];
        return (
          <button key={opt.id}
            onClick={() => onChange(selected ? values.filter(p => p !== opt.id) : [...values, opt.id])}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-all"
            style={{ background: selected ? `${NEON}22` : "rgba(255,255,255,0.04)", border: `1px solid ${selected ? NEON : CARD_BORDER}`, color: selected ? NEON : "rgba(255,255,255,0.6)" }}>
            <Icon size={12} />{opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────

export interface FieldRowProps {
  fieldName: string;
  label: string;
  profile: Profile | null;
  fieldMeta: FieldMeta;
  type: FieldType;
  selectOptions?: { value: string; label: string }[];
  onSave: (fieldName: string, value: any) => void;
  onRevert: (fieldName: string) => void;
  isSaving: boolean;
}

export function FieldRow({ fieldName, label, profile, fieldMeta, type, selectOptions, onSave, onRevert, isSaving }: FieldRowProps) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState<any>(null);
  const meta = fieldMeta[fieldName];
  const currentVal = (profile as any)?.[fieldName] ?? (type.includes("array") || type === "platform-select" ? [] : null);
  const canRevert = meta?.isManualOverride && !!(meta?.importedValue);

  const startEdit = () => {
    setEditVal(type.includes("array") || type === "platform-select" ? [...(Array.isArray(currentVal) ? currentVal : [])] : (currentVal ?? ""));
    setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setEditVal(null); };
  const saveEdit = () => { onSave(fieldName, editVal); setEditing(false); setEditVal(null); };

  return (
    <div className="py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50">{label}</span>
          <SourceBadge fieldName={fieldName} fieldMeta={fieldMeta} />
        </div>
        <div className="flex items-center gap-1">
          {canRevert && !editing && (
            <button onClick={() => onRevert(fieldName)} disabled={isSaving} title="Revert to imported value"
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: SOURCE_COLORS[(meta as any).importSource ?? ""] ?? "#aaa", border: "1px solid currentColor" }}>
              <RotateCcw size={9} /> Revert
            </button>
          )}
          {!editing && (
            <button onClick={startEdit}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded opacity-60 hover:opacity-100 transition-opacity text-white"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
              <Edit2 size={9} /> Edit
            </button>
          )}
        </div>
      </div>

      {!editing ? (
        <div className="text-sm text-white/70 break-words">
          {type === "url-array" ? (
            Array.isArray(currentVal) && currentVal.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {(currentVal as string[]).map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                    className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100" style={{ color: NEON }}>
                    <ExternalLink size={10} /> Screenshot {i + 1}
                  </a>
                ))}
              </div>
            ) : <span className="opacity-30 italic text-sm">Not set</span>
          ) : type === "tag-array" ? (
            Array.isArray(currentVal) && currentVal.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(currentVal as string[]).map((t, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${CARD_BORDER}` }}>{t}</span>
                ))}
              </div>
            ) : <span className="opacity-30 italic text-sm">Not set</span>
          ) : type === "platform-select" ? (
            Array.isArray(currentVal) && currentVal.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(currentVal as string[]).map(p => {
                  const opt = PLATFORM_OPTIONS.find(o => o.id === p);
                  const Icon = ICON_MAP[(opt?.icon ?? "Gamepad2") as keyof typeof ICON_MAP];
                  return (
                    <span key={p} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${CARD_BORDER}` }}>
                      <Icon size={11} />{opt?.label ?? p}
                    </span>
                  );
                })}
              </div>
            ) : <span className="opacity-30 italic text-sm">Not set</span>
          ) : type === "select" ? (
            currentVal ? <span>{selectOptions?.find(o => o.value === currentVal)?.label ?? currentVal}</span> : <span className="opacity-30 italic">Not set</span>
          ) : type === "url" && currentVal ? (
            <a href={currentVal} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline text-sm" style={{ color: NEON }}>
              {(currentVal as string).length > 60 ? (currentVal as string).slice(0, 57) + "…" : currentVal}
              <ExternalLink size={10} />
            </a>
          ) : currentVal ? (
            <span className="whitespace-pre-wrap text-sm">
              {String(currentVal).length > 300 ? String(currentVal).slice(0, 297) + "…" : String(currentVal)}
            </span>
          ) : <span className="opacity-30 italic text-sm">Not set</span>}
        </div>
      ) : (
        <div className="space-y-2">
          {type === "textarea" ? (
            <textarea value={editVal ?? ""} onChange={e => setEditVal(e.target.value)} rows={5}
              className="w-full bg-transparent border rounded px-3 py-2 text-sm text-white outline-none resize-none"
              style={{ borderColor: `${NEON}66` }} />
          ) : type === "tag-array" ? (
            <TagArrayEditor values={editVal ?? []} onChange={setEditVal} />
          ) : type === "url-array" ? (
            <UrlArrayEditor values={editVal ?? []} onChange={setEditVal} />
          ) : type === "platform-select" ? (
            <PlatformToggleGrid values={editVal ?? []} onChange={setEditVal} />
          ) : type === "select" ? (
            <select value={editVal ?? ""} onChange={e => setEditVal(e.target.value)}
              className="w-full bg-[#0d1117] border rounded px-3 py-2 text-sm text-white outline-none"
              style={{ borderColor: `${NEON}66` }}>
              {selectOptions?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          ) : (
            <input type="text" value={editVal ?? ""} onChange={e => setEditVal(e.target.value)}
              className="w-full bg-transparent border rounded px-3 py-2 text-sm text-white outline-none"
              style={{ borderColor: `${NEON}66` }} />
          )}
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold"
              style={{ background: NEON, color: "#070b10" }}>
              <Check size={11} /> Save
            </button>
            <button onClick={cancelEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-white/60 hover:text-white border border-white/15">
              <X size={11} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Accordion Section Wrapper ────────────────────────────────────────────────

export function Section({ id: _id, title, children, filledCount, totalCount, open, onToggle }: {
  id: string; title: string; children: React.ReactNode;
  filledCount: number; totalCount: number; open: boolean; onToggle: () => void;
}) {
  const pct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={16} className="text-white/50" /> : <ChevronRight size={16} className="text-white/50" />}
          <span className="font-bold text-white text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold" style={{ color: pct === 100 ? NEON : "rgba(255,255,255,0.3)" }}>
            {filledCount}/{totalCount}
          </span>
          <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? NEON : "#fff4" }} />
          </div>
        </div>
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}
