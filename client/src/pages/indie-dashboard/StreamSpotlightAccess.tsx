import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Check, KeyRound, Loader2, Trash2, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export type StreamKeyStage = {
  stageId: string;
  keyType: "demo" | "full";
  valid: number;
  keys: Array<{ id: number; masked: string }>;
};

type AccessMethod = "full_game_upfront" | "demo_to_full" | "free_to_play";
type Props = {
  gameId: number | null;
  hasDemo: boolean;
  accessMethod: string;
  onAccessChange: (method: AccessMethod) => void;
  stage: StreamKeyStage | null;
  setStage: Dispatch<SetStateAction<StreamKeyStage | null>>;
  onBusyChange: (busy: boolean) => void;
  maxPlaces: number;
  onMaxPlacesChange: (value: number) => void;
  requiredMinutes: number;
};

const ACCENT = "#B9FF1A";
const MAX_STREAMERS = 25;

function formatDuration(minutes: number) {
  return minutes === 60 ? "1 hour" : minutes === 120 ? "2 hours" : `${minutes} minutes`;
}

function formatCoverage(places: number, minutes: number) {
  const hours = (places * minutes) / 60;
  return `${Number.isInteger(hours) ? hours : Number(hours.toFixed(2))} ${hours === 1 ? "hour" : "hours"}`;
}

function csvRows(source: string): string[] {
  const rows = source.replace(/^\uFEFF/, "").split(/\r?\n/);
  while (rows.length && !rows[rows.length - 1].trim()) rows.pop();
  const parsed = rows.map((row) => {
    const cell = row.trim();
    if (cell.startsWith('"') && cell.endsWith('"') && /^"(?:[^"]|"")*"$/.test(cell)) {
      return cell.slice(1, -1).replace(/""/g, '"').trim();
    }
    if (cell.includes(",")) throw new Error("Use a single key per CSV row.");
    return cell;
  });
  if (/^(?:(?:game|access|steam|product)\s*)?keys?$/i.test(parsed[0] ?? "")) parsed.shift();
  return parsed;
}

function candidateCounts(rows: string[]) {
  const unique = new Set<string>();
  let invalid = 0;
  let duplicates = 0;
  for (const row of rows) {
    const value = row.trim();
    if (value.length < 4 || value.length > 256 || !/[a-z0-9]/i.test(value) ||
        /[\u0000-\u001f\u007f]/.test(value) || /^(?:(?:game|access|steam|product)\s*)?keys?$/i.test(value)) invalid++;
    else if (unique.has(value)) duplicates++;
    else unique.add(value);
  }
  return { valid: unique.size, invalid, duplicates };
}

export default function StreamSpotlightAccess({
  gameId, hasDemo, accessMethod, onAccessChange, stage, setStage, onBusyChange,
  maxPlaces, onMaxPlacesChange, requiredMinutes,
}: Props) {
  const needsKey = accessMethod !== "free_to_play";
  const keyType = accessMethod === "demo_to_full" && hasDemo ? "demo" : "full";
  const storageKey = `stream-spotlight-key-stage:${gameId ?? "primary"}`;
  const [pendingText, setPendingText] = useState("");
  const [inputOpen, setInputOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<{ added: number; duplicates: number; invalid: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rows = pendingText ? pendingText.split(/\r?\n/).filter((line, index, all) => index < all.length - 1 || line.trim()) : [];
  const preview = candidateCounts(rows);
  const places = needsKey ? stage?.valid ?? 0 : maxPlaces;
  const limitValid = Number.isInteger(maxPlaces) && maxPlaces >= 1 && maxPlaces <= MAX_STREAMERS;
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);

  useEffect(() => {
    if (stage || !gameId) return;
    const remembered = sessionStorage.getItem(storageKey);
    if (!remembered) return;
    let cancelled = false;
    fetch(`/api/campaigns/stream-spotlight/key-stages/${encodeURIComponent(remembered)}`, { credentials: "include" })
      .then(async response => {
        if (!response.ok) throw new Error("The saved key upload is no longer available.");
        return response.json() as Promise<StreamKeyStage>;
      })
      .then(data => {
        if (!cancelled) setStage(data);
      })
      .catch(() => {
        if (!cancelled) sessionStorage.removeItem(storageKey);
      });
    return () => { cancelled = true; };
  }, [stage, gameId, setStage, storageKey]);

  async function readFile(file: File) {
    setError("");
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("Choose a CSV file.");
      const parsed = csvRows(await file.text());
      if (parsed.length > 500) throw new Error("Upload no more than 500 rows at a time.");
      if (!parsed.length) throw new Error("This CSV has no game keys.");
      setPendingText(parsed.join("\n"));
      setInputOpen(true);
    } catch (reason: any) {
      setError(reason.message || "Could not read the CSV.");
    }
  }

  async function addKeys() {
    if (!rows.length || busy) return;
    if (rows.length > 500) { setError("Upload no more than 500 rows at a time."); return; }
    if (stage && stage.keyType !== keyType) { setError("Clear uploaded keys before changing the key type."); return; }
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest("POST", "/api/campaigns/stream-spotlight/key-stages", {
        keyType, keys: rows, ...(stage ? { stageId: stage.stageId } : {}),
      });
      const result = await response.json();
      sessionStorage.setItem(storageKey, result.stageId);
      setStage({
        stageId: result.stageId, keyType, valid: result.valid,
        keys: [...(stage?.keys ?? []), ...result.keys],
      });
      setOutcome({ added: result.added, duplicates: result.duplicates, invalid: result.invalid });
      setPendingText("");
      setInputOpen(false);
      const details = await fetch(`/api/campaigns/stream-spotlight/key-stages/${encodeURIComponent(result.stageId)}`, { credentials: "include" });
      if (details.ok) setStage(await details.json());
      else setError("Keys were saved. Refresh this step if their summary looks out of date.");
    } catch (reason: any) {
      setError(reason.message || "Could not upload keys.");
    } finally {
      setBusy(false);
    }
  }

  async function removeKey(id: number) {
    if (!stage || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest("DELETE", `/api/campaigns/stream-spotlight/key-stages/${encodeURIComponent(stage.stageId)}/keys/${id}`);
      const result = await response.json();
      setStage({ ...stage, valid: result.valid, keys: stage.keys.filter(key => key.id !== id) });
      setOutcome(null);
    } catch (reason: any) {
      setError(reason.message || "Could not remove this key.");
    } finally {
      setBusy(false);
    }
  }

  async function clearKeys() {
    if (!stage || busy) return false;
    setBusy(true);
    setError("");
    try {
      await apiRequest("DELETE", `/api/campaigns/stream-spotlight/key-stages/${encodeURIComponent(stage.stageId)}`);
      sessionStorage.removeItem(storageKey);
      setStage(null);
      setOutcome(null);
      return true;
    } catch (reason: any) {
      setError(reason.message || "Could not clear uploaded keys.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function selectAccess(method: AccessMethod) {
    if (accessMethod === method || busy) return;
    if (stage) {
      if (stage.valid > 0 && !window.confirm("Changing access will remove the game keys you uploaded to this draft. Continue?")) return;
      if (!await clearKeys()) return;
    }
    onAccessChange(method);
    setPendingText("");
    setOutcome(null);
  }

  return (
    <section className="mx-auto max-w-[760px] space-y-5 text-white" aria-label="Stream campaign access">
      <fieldset className="space-y-3">
        <legend className="text-sm font-black">Game access</legend>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Game access">
          {([
            { method: "full_game_upfront" as const, title: "Game key for each creator", description: "Each accepted creator receives one game key." },
            { method: "free_to_play" as const, title: "No key required", description: "Set a maximum number of campaign participants instead." },
          ]).map(option => {
            const active = option.method === "free_to_play" ? !needsKey : needsKey;
            return <label key={option.method}
              className="flex min-h-[88px] cursor-pointer items-start gap-3 rounded-xl border p-4 text-left focus-within:ring-2 focus-within:ring-[#B9FF1A]"
              style={{ background: active ? "#182817" : "#111923", borderColor: active ? ACCENT : "#354153" }}>
              <input type="radio" name="stream-spotlight-access" value={option.method}
                checked={active} disabled={busy} onChange={() => void selectAccess(option.method)}
                className="sr-only" />
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                style={{ background: active ? ACCENT : "transparent", borderColor: active ? ACCENT : "#7B8797" }}>
                {active && <Check size={13} color="#0F101B" />}
              </span>
              <span><strong className="block text-sm">{option.title}</strong>
                <span className="mt-1 block text-xs text-[#BFC7D3]">{option.description}</span></span>
            </label>;
          })}
        </div>
      </fieldset>

      {needsKey ? <>
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#DCE4EC]">Key type</h3>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Key type">
            {(hasDemo ? [
              { label: "Demo key", method: "demo_to_full" as const },
              { label: "Full-game key", method: "full_game_upfront" as const },
            ] : [{ label: "Full-game key", method: "full_game_upfront" as const }]).map(option => {
              const active = accessMethod === option.method;
              return <label key={option.method}
                className="flex min-h-11 cursor-pointer items-center rounded-lg border px-4 text-xs font-bold focus-within:ring-2 focus-within:ring-[#B9FF1A]"
                style={{ background: active ? "#182817" : "#172536", borderColor: active ? ACCENT : "#354153", color: active ? ACCENT : "#F0F4F7" }}>
                <input type="radio" name="stream-spotlight-key-type" value={option.method}
                  checked={active} disabled={busy} onChange={() => void selectAccess(option.method)} className="sr-only" />
                {active && <Check size={13} className="mr-1 inline" />}{option.label}
              </label>;
            })}
          </div>
        </div>
        <div className="rounded-xl border border-[#354153] bg-[#111923] p-4 sm:p-5">
          <h3 className="text-base font-black">Upload Game Keys</h3>
          <p className="mt-1 text-xs text-[#D2DAE3]">Upload one unique key for every streamer you want to accept.</p>
          <p className="mt-1 text-xs font-bold text-[#B9FF1A]">Access type: {keyType === "demo" ? "Demo" : "Full game"}</p>
          <div onDragOver={event => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={event => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files[0]) void readFile(event.dataTransfer.files[0]); }}
            className="mt-4 flex min-h-[110px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 text-center"
            style={{ background: dragging ? "#1D3324" : "#172536", borderColor: dragging ? ACCENT : "#526275" }}>
            <Upload size={20} color={ACCENT} />
            <span className="mt-2 text-sm font-bold">Drag and drop a CSV file here</span>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="mt-1 min-h-11 px-3 text-xs font-bold text-[#B9FF1A] underline underline-offset-4">or browse your device</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={event => { if (event.target.files?.[0]) void readFile(event.target.files[0]); event.target.value = ""; }} />
          </div>
          <p className="mt-2 text-xs text-[#BFC7D3]">One key per row. A header row is optional.</p>
          <button type="button" aria-expanded={inputOpen} onClick={() => setInputOpen(value => !value)}
            className="mt-3 min-h-11 text-xs font-bold text-[#B9FF1A] underline underline-offset-4">Paste keys manually</button>
          {inputOpen && <div className="space-y-3">
            <label htmlFor="spotlight-keys" className="block text-xs font-bold">Paste one game key per line.</label>
            <textarea id="spotlight-keys" value={pendingText} rows={6}
              onChange={event => { setPendingText(event.target.value); setOutcome(null); }}
              className="min-h-[136px] w-full resize-y rounded-lg border border-[#526275] bg-[#172536] p-3 text-sm text-white outline-none focus:border-[#B9FF1A]"
              placeholder="One key per line" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#D2DAE3]">{preview.valid} new {preview.valid === 1 ? "key" : "keys"} · {preview.duplicates} duplicate · {preview.invalid} invalid or empty</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setPendingText(""); setError(""); }}
                  disabled={!pendingText || busy} className="min-h-11 rounded-lg border border-[#526275] px-4 text-xs font-bold disabled:opacity-50">Clear all</button>
                <button type="button" onClick={() => void addKeys()} disabled={!rows.length || busy}
                  className="min-h-11 rounded-lg px-5 text-xs font-black disabled:cursor-not-allowed"
                  style={{ background: !rows.length || busy ? "#263445" : ACCENT, color: !rows.length || busy ? "#BFC7D3" : "#0F101B" }}>
                  {busy ? "Adding…" : "Add Keys"}
                </button>
              </div>
            </div>
          </div>}
          {outcome && <div role="status" className="mt-3 space-y-1 text-xs text-[#D2DAE3]">
            <p>{outcome.added} valid {outcome.added === 1 ? "key" : "keys"} added</p>
            <p>{outcome.duplicates} duplicate {outcome.duplicates === 1 ? "key was" : "keys were"} ignored</p>
            <p>{outcome.invalid} invalid or empty {outcome.invalid === 1 ? "row was" : "rows were"} rejected</p>
          </div>}
          {stage && stage.keys.length > 0 && <div className="mt-4 border-t border-[#354153] pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold">{stage.valid} valid {stage.valid === 1 ? "key" : "keys"} uploaded</p>
              <button type="button" disabled={busy} onClick={() => void clearKeys()}
                className="min-h-11 px-2 text-xs font-bold text-[#E6B5B5] disabled:opacity-50">Clear all</button>
            </div>
            <ul className="max-h-36 space-y-1 overflow-y-auto">
              {stage.keys.map(key => <li key={key.id} className="flex items-center justify-between rounded-lg bg-[#172536] px-3">
                <span className="font-mono text-xs text-[#D2DAE3]">{key.masked}</span>
                <button type="button" aria-label={`Remove key ending ${key.masked.slice(-5)}`}
                  disabled={busy} onClick={() => void removeKey(key.id)}
                  className="min-h-11 min-w-11 text-[#E6B5B5] disabled:opacity-50"><Trash2 size={15} className="mx-auto" /></button>
              </li>)}
            </ul>
          </div>}
        </div>
      </> : <div className="rounded-xl border border-[#354153] bg-[#111923] p-4">
        <h3 className="text-xs font-black uppercase tracking-widest">Maximum streamers</h3>
        <p className="mt-1 text-xs text-[#D2DAE3]">Choose how many creators can join this campaign.</p>
        <div className="mt-3 flex items-center gap-3">
          <button type="button" aria-label="Fewer streamers" disabled={maxPlaces <= 1}
            onClick={() => onMaxPlacesChange(Math.max(1, maxPlaces - 1))}
            className="min-h-11 min-w-11 rounded-lg bg-[#203044] text-lg font-bold disabled:opacity-45">−</button>
          <span className="min-w-[95px] text-center text-sm font-bold">{maxPlaces} {maxPlaces === 1 ? "streamer" : "streamers"}</span>
          <button type="button" aria-label="More streamers" disabled={maxPlaces >= MAX_STREAMERS}
            onClick={() => onMaxPlacesChange(Math.min(MAX_STREAMERS, maxPlaces + 1))}
            className="min-h-11 min-w-11 rounded-lg bg-[#203044] text-lg font-bold disabled:opacity-45">+</button>
        </div>
        {!limitValid && <p role="alert" className="mt-2 text-xs text-amber-200">Choose 1 to {MAX_STREAMERS} streamers.</p>}
      </div>}

      {needsKey && !places ? <div role="status" className="rounded-xl border border-[#354153] bg-[#111923] p-4">
        <p className="text-xs font-black uppercase tracking-widest text-[#D2DAE3]">No campaign places yet</p>
        <p className="mt-2 text-sm text-[#D2DAE3]">Upload at least one valid game key to create a place for a streamer.</p>
      </div> : limitValid || needsKey ? <div className="rounded-xl border border-[#B9FF1A]/30 bg-[#142016] p-4" aria-live="polite">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#B9FF1A]">Your stream campaign</h3>
        <div className="mt-3 grid gap-2 text-sm font-semibold text-white sm:grid-cols-2">
          {needsKey && <p><KeyRound size={14} className="mr-1 inline text-[#B9FF1A]" />{places} game {places === 1 ? "key" : "keys"} uploaded</p>}
          <p>{places} available streamer {places === 1 ? "place" : "places"}</p>
          <p>{formatDuration(requiredMinutes)} required per stream</p>
          <p>Up to {formatCoverage(places, requiredMinutes)} of livestream coverage</p>
          {!needsKey && <p>No game key required</p>}
        </div>
      </div> : null}
      {error && <p role="alert" className="text-xs text-amber-200">{error}</p>}
      {busy && <p role="status" className="flex items-center gap-2 text-xs text-[#D2DAE3]"><Loader2 size={14} className="animate-spin" />Updating game keys…</p>}
    </section>
  );
}