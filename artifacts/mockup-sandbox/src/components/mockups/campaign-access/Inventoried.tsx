import './_group.css';
import './Inventoried.css';
import { ChangeEvent, CSSProperties, DragEvent, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight, FileUp, KeyRound, Plus, Upload, X } from 'lucide-react';

type AccessMode = 'key' | 'none';
type KeyType = 'full' | 'demo';
type Preset = { id: string; label: string; min: number; max: number; initial: number };

// Isolated preview data: mimics the selected game's inventory and canonical preset definitions.
const PRESETS: Preset[] = [
  { id: 'quick', label: 'Quick Creator', min: 3, max: 5, initial: 4 },
  { id: 'content', label: 'Content Boost', min: 5, max: 10, initial: 8 },
  { id: 'showcase', label: 'Creator Showcase', min: 10, max: 20, initial: 14 },
  { id: 'custom', label: 'Build Your Own', min: 2, max: 25, initial: 8 },
];
const DEMO_INVENTORY: Record<KeyType, number> = { full: 42, demo: 6 };

function readKeyLines(value: string) {
  return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function csvKeys(text: string) {
  const rows = text.split(/\r?\n/).filter(row => row.trim());
  if (!rows.length) return [];
  const firstCell = (row: string) => row.split(',')[0]?.trim().replace(/^"|"$/g, '') ?? '';
  const hasHeader = /key|code|access/i.test(firstCell(rows[0]));
  return rows.slice(hasHeader ? 1 : 0).map(firstCell).filter(Boolean);
}

export function Inventoried() {
  const [accessMode, setAccessMode] = useState<AccessMode>('key');
  const [keyType, setKeyType] = useState<KeyType>('full');
  const [presetId, setPresetId] = useState('content');
  const [capacity, setCapacity] = useState(8);
  const [addedKeys, setAddedKeys] = useState<Record<KeyType, number>>({ full: 0, demo: 0 });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const [manageOpen, setManageOpen] = useState(false);
  const [continued, setContinued] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const preset = PRESETS.find(item => item.id === presetId) ?? PRESETS[1];
  const available = DEMO_INVENTORY[keyType] + addedKeys[keyType];
  const required = accessMode === 'key' ? capacity : 0;
  const remaining = available - required;
  const missing = Math.max(0, required - available);
  const enough = accessMode === 'none' || missing === 0;
  const rangeProgress = ((capacity - preset.min) / (preset.max - preset.min)) * 100;
  const pastedCount = useMemo(() => readKeyLines(pasteValue).length, [pasteValue]);

  const selectPreset = (nextPreset: Preset) => {
    setPresetId(nextPreset.id);
    setCapacity(Math.min(nextPreset.max, Math.max(nextPreset.min, nextPreset.initial)));
    setContinued(false);
  };

  const importKeys = (keys: string[]) => {
    if (!keys.length) {
      setNotice('No keys found. Add one key per line, or upload a CSV with a key column.');
      return;
    }
    setAddedKeys(current => ({ ...current, [keyType]: current[keyType] + keys.length }));
    setPasteValue('');
    setNotice(`${keys.length} ${keyType === 'full' ? 'full-game' : 'demo / playtest'} key${keys.length === 1 ? '' : 's'} added to this preview inventory.`);
    setUploadOpen(true);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => importKeys(csvKeys(String(event.target?.result ?? '')));
    reader.onerror = () => setNotice('That file could not be read. Try another CSV or paste the keys.');
    reader.readAsText(file);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    event.target.value = '';
  };
  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files[0]);
  };

  return (
    <main className="inventoried">
      <div className="inv-shell">
        <header className="inv-topline">
          <div className="inv-step-heading">
            <span className="inv-step-number">3</span>
            <div>
              <div className="inv-kicker">Indie developer · Neon Rift</div>
              <h1 className="inv-step-title">Add Access</h1>
            </div>
          </div>
          <span className="inv-kicker">Campaign setup / 03</span>
        </header>

        <div className="inv-main">
          {continued && (
            <div className="inv-complete-note" role="status">
              Step saved — {capacity} creator places{accessMode === 'key' ? `, ${required} ${keyType === 'full' ? 'full-game' : 'demo'} keys to reserve` : ', no key reservation'}.
            </div>
          )}

          <section className="inv-section" aria-labelledby="inv-access-heading">
            <div className="inv-section-heading">
              <h2 id="inv-access-heading">Game access</h2>
              <p>Choose how accepted creators get into Neon Rift.</p>
            </div>
            <div className="inv-access-options">
              <button type="button" className="inv-choice" aria-pressed={accessMode === 'key'} onClick={() => { setAccessMode('key'); setContinued(false); }}>
                <span className="inv-choice-mark">{accessMode === 'key' && <Check size={12} strokeWidth={3} />}</span>
                <span className="inv-choice-copy"><strong>Game key for each creator</strong><small>One key is reserved from this game’s inventory per place.</small></span>
              </button>
              <button type="button" className="inv-choice" aria-pressed={accessMode === 'none'} onClick={() => { setAccessMode('none'); setContinued(false); }}>
                <span className="inv-choice-mark">{accessMode === 'none' && <Check size={12} strokeWidth={3} />}</span>
                <span className="inv-choice-copy"><strong>No key required</strong><small>Creators can participate without a supplied game key.</small></span>
              </button>
            </div>
          </section>

          {accessMode === 'key' && (
            <section className="inv-section" aria-labelledby="inv-keytype-heading">
              <div className="inv-section-heading">
                <h2 id="inv-keytype-heading">Key type</h2>
                <p>Inventory is scoped to Neon Rift and the selected access type.</p>
              </div>
              <div className="inv-key-options">
                <button type="button" className="inv-choice" aria-pressed={keyType === 'full'} onClick={() => { setKeyType('full'); setNotice(''); setContinued(false); }}>
                  <span className="inv-choice-mark">{keyType === 'full' && <Check size={12} strokeWidth={3} />}</span>
                  <span className="inv-choice-copy"><strong>Full-game key</strong><small>{DEMO_INVENTORY.full + addedKeys.full} currently available</small></span>
                </button>
                <button type="button" className="inv-choice" aria-pressed={keyType === 'demo'} onClick={() => { setKeyType('demo'); setNotice(''); setContinued(false); }}>
                  <span className="inv-choice-mark">{keyType === 'demo' && <Check size={12} strokeWidth={3} />}</span>
                  <span className="inv-choice-copy"><strong>Demo / playtest key</strong><small>{DEMO_INVENTORY.demo + addedKeys.demo} currently available</small></span>
                </button>
              </div>
            </section>
          )}

          <section className="inv-section" aria-labelledby="inv-size-heading">
            <div className="inv-section-heading">
              <h2 id="inv-size-heading">Campaign size</h2>
              <p>Set the number of creator places. Keys are allocated when the campaign is confirmed.</p>
            </div>
            <div className="inv-preset-row" role="group" aria-label="Campaign preset">
              {PRESETS.map(item => (
                <button key={item.id} type="button" className="inv-preset" aria-pressed={presetId === item.id} onClick={() => selectPreset(item)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="inv-size-label">
              <span>How many creators should be able to join?</span>
              <strong className="inv-size-value">{capacity} <em>creators</em></strong>
            </div>
            <div className="inv-range-wrap">
              <input
                aria-label={`Campaign size, ${preset.min} to ${preset.max} creators`}
                className="inv-range"
                type="range"
                min={preset.min}
                max={preset.max}
                step={1}
                value={capacity}
                style={{ '--range-progress': `${rangeProgress}%` } as CSSProperties}
                onChange={event => { setCapacity(Number(event.target.value)); setContinued(false); }}
              />
              <div className="inv-range-ticks"><span>{preset.min}</span><span>{preset.max}</span></div>
            </div>
            <div className="inv-required-line">
              <span>{accessMode === 'key' ? 'One creator place requires one game key.' : 'Creators join without a supplied game key.'}</span>
              <strong>{required} {required === 1 ? 'KEY' : 'KEYS'} REQUIRED</strong>
            </div>
            {accessMode === 'none' && <p className="inv-no-key-note">No key inventory is needed for this campaign. <strong>{capacity} creator places</strong> will be available.</p>}
          </section>

          {accessMode === 'key' && (
            <section className="inv-section" aria-labelledby="inv-inventory-heading">
              <div className="inv-section-heading inv-inventory-head">
                <div>
                  <h2 id="inv-inventory-heading">Game key inventory</h2>
                  <p className="inv-game-tag">Neon Rift <span aria-hidden="true">·</span> {keyType === 'full' ? 'Full-game keys' : 'Demo / playtest keys'}</p>
                </div>
                <span className="inv-kicker">Game-wide · not campaign-specific</span>
              </div>
              <div className="inv-metrics" aria-live="polite">
                <div className="inv-metric"><span className="inv-metric-label">Available</span><strong className="inv-metric-value">{available}</strong></div>
                <div className="inv-metric"><span className="inv-metric-label">Required</span><strong className="inv-metric-value">{required}</strong></div>
                <div className="inv-metric"><span className="inv-metric-label">{enough ? 'Remaining' : 'Missing'}</span><strong className={`inv-metric-value ${enough ? 'is-good' : 'is-alert'}`}>{enough ? remaining : missing}</strong></div>
              </div>
              {enough ? (
                <>
                  <div className="inv-status"><span className="inv-status-icon"><CheckCircle2 size={14} /></span>You have enough keys</div>
                  <p className="inv-status-detail">{available} available · {required} required. {remaining} {remaining === 1 ? 'key' : 'keys'} will remain available for other campaigns.</p>
                </>
              ) : (
                <>
                  <div className="inv-status is-alert"><span className="inv-status-icon"><X size={13} /></span>More game keys required</div>
                  <p className="inv-status-detail">{available} available · {required} required. Add {missing} more {missing === 1 ? 'key' : 'keys'} to support {capacity} creators.</p>
                </>
              )}
              <div className="inv-actions-line">
                <button type="button" className="inv-text-button" aria-expanded={manageOpen} onClick={() => setManageOpen(value => !value)}>
                  {manageOpen ? 'Close key inventory details' : 'Manage game keys'} <ChevronRight size={12} />
                </button>
                {!enough && <button type="button" className="inv-add-button" onClick={() => { setUploadOpen(true); setPasteOpen(false); }}>
                  <Plus size={15} /> Add {missing} {missing === 1 ? 'game key' : 'game keys'}
                </button>}
              </div>
              {manageOpen && <p className="inv-manage-note"><KeyRound size={13} /> Inventory management is separate from campaign setup. This preview shows {available} unassigned {keyType === 'full' ? 'full-game' : 'demo / playtest'} keys for Neon Rift; reserved or claimed keys are not included.</p>}

              {uploadOpen && (
                <div className="inv-upload">
                  <h3 className="inv-upload-title">Add keys to Neon Rift inventory</h3>
                  <p className="inv-upload-intro">Imported keys stay in this game’s inventory. They are not reserved until you confirm the campaign.</p>
                  <div className="inv-upload-tools">
                    <label
                      className={`inv-dropzone ${dragging ? 'is-dragging' : ''}`}
                      onDragOver={event => { event.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                    >
                      <input ref={fileRef} className="inv-file-input" type="file" accept=".csv,.txt,text/plain,text/csv" onChange={onFileChange} />
                      <FileUp size={17} />
                      <span><strong>{dragging ? 'Drop your file to import' : 'Choose a CSV or text file'}</strong><small>Drop here or browse · one key per row</small></span>
                    </label>
                    <button type="button" className="inv-paste-toggle" aria-expanded={pasteOpen} onClick={() => setPasteOpen(value => !value)}>
                      <Upload size={14} /> Paste keys manually {pasteOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                  </div>
                  {pasteOpen && (
                    <textarea className="inv-paste-area" aria-label="Paste game keys" value={pasteValue} onChange={event => setPasteValue(event.target.value)} placeholder={'One key per line\nNRFT-7K2P-4M9Q'} />
                  )}
                  <div className="inv-upload-footer">
                    <span className="inv-import-count">{pasteOpen ? `${pastedCount} key${pastedCount === 1 ? '' : 's'} detected` : 'CSV and plain-text files supported'}</span>
                    {pasteOpen && <button type="button" className="inv-import-button" disabled={pastedCount === 0} onClick={() => importKeys(readKeyLines(pasteValue))}>Add {pastedCount || ''} keys</button>}
                  </div>
                  {notice && <p className="inv-flash" role="status">{notice}</p>}
                </div>
              )}
              {!uploadOpen && notice && <p className="inv-flash" role="status">{notice}</p>}
            </section>
          )}
        </div>

        <footer className="inv-footer">
          <p className="inv-footer-hint">
            {accessMode === 'key' && !enough ? <><strong>{missing} more game {missing === 1 ? 'key' : 'keys'} required</strong> to continue.</> : 'You can review these settings before your campaign goes live.'}
          </p>
          <div className="inv-footer-actions">
            <button type="button" className="inv-back" onClick={() => { setContinued(false); setNotice('Previous step: campaign goals and creator deliverables.'); }}>Back</button>
            <button type="button" className="inv-continue" disabled={!enough} onClick={() => setContinued(true)}>
              Continue <ArrowRight size={15} />
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}