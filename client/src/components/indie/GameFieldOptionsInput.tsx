import { useId, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { GAME_FIELD_OPTIONS } from "@/lib/game-field-options";

export function GameFieldOptionsInput({ value = [], onChange, placeholder, fieldName }: {
  value?: string[]; onChange: (value: string[]) => void; placeholder?: string; fieldName?: string;
}) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const options = GAME_FIELD_OPTIONS[fieldName ?? ""] ?? [];
  const selected = new Set(value.map(item => item.toLocaleLowerCase()));
  const matches = options.filter(option => option.toLocaleLowerCase().includes(input.trim().toLocaleLowerCase()));
  const add = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const canonical = options.find(option => option.toLocaleLowerCase() === trimmed.toLocaleLowerCase()) ?? trimmed;
    if (!selected.has(canonical.toLocaleLowerCase())) onChange([...value, canonical]);
    setInput("");
  };
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      {value.map((tag, index) => <span key={`${tag}-${index}`} className="flex items-center gap-1 rounded-full border border-white/10 bg-[#151827] px-3 py-1.5 text-xs font-medium text-white/90">
        <span className="mr-1 h-2 w-2 shrink-0 rounded-full bg-[#B7FF18]" aria-hidden="true" />
        {tag}<button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((_, i) => i !== index))} className="ml-1 text-white/45 transition hover:text-white"><X size={12} /></button>
      </span>)}
    </div>
    <div className="flex gap-2">
      <input data-profile-field={fieldName} aria-label={`Search or add ${fieldName ?? "options"}`} value={input}
        onFocus={() => setOpen(true)} onChange={event => { setInput(event.target.value); setOpen(true); }}
        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); add(input); } if (event.key === "Escape") setOpen(false); }}
        placeholder={options.length ? "Search options or type a custom value…" : placeholder}
        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white outline-none focus:border-[#B7FF18]/60" />
      <button type="button" aria-label="Add custom value" onClick={() => add(input)} disabled={!input.trim()} className="rounded-lg border border-white/10 px-3 py-2 text-white/60 disabled:opacity-40 hover:text-[#B7FF18]"><Plus size={14} /></button>
    </div>
    {options.length > 0 && <>
      <button type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs font-semibold text-[#B7FF18]">
        {open ? "Hide options" : "Browse options"}<ChevronDown size={14} className={open ? "rotate-180" : ""} />
      </button>
      {open && <div id={listId} className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[#151724] p-2" aria-label={`Suggested ${fieldName}`}>
        <div className="flex flex-wrap gap-1.5">
          {matches.map(option => {
            const active = selected.has(option.toLocaleLowerCase());
            return <button key={option} type="button" aria-pressed={active} onClick={() => active ? onChange(value.filter(item => item.toLocaleLowerCase() !== option.toLocaleLowerCase())) : add(option)}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs transition ${active ? "border-white/20 bg-[#0e1520] text-white/90" : "border-white/10 text-white/75 hover:border-[#B7FF18]/50 hover:text-white"}`}>
              {active && <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#B7FF18] text-[#0e1520]"><Check size={10} strokeWidth={3} aria-hidden="true" /></span>}{option}
            </button>;
          })}
        </div>
        {matches.length === 0 && <p className="p-2 text-xs text-white/50">No matching options. Press Enter or + to add your own.</p>}
      </div>}
    </>}
  </div>;
}
