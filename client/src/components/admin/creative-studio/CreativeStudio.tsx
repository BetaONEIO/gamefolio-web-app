import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import type { ExportRequest } from '@shared/creative-studio';
import { ExportPreview } from './ExportPreview';

type Choice = { id: number; name: string };
type Background = { path: string; name: string; url: string };
const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
export function CreativeStudio() {
  const [type, setType] = useState<ExportRequest['type']>('profile');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [id, setId] = useState<number>();
  const [background, setBackground] = useState('');
  const [top, setTop] = useState<3 | 5 | 10>(3);
  const [flags, setFlags] = useState({ showXp: true, showRank: true, showAvatar: true, showUsername: true, showBadge: true });
  const [preview, setPreview] = useState<{ url: string; filename: string }>();
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const generation = useRef(0);
  const renderQueue = useRef<Promise<void>>(Promise.resolve());
  const blobUrl = useRef<string>();
  useEffect(() => { const timer = setTimeout(() => setQuery(search), 250); return () => clearTimeout(timer); }, [search]);
  const choices = useQuery<Choice[]>({ queryKey: ['creative-studio-options', type, query], queryFn: async () => (await apiRequest('GET', `/api/admin/creative-studio/options?type=${type}&search=${encodeURIComponent(query)}`)).json() });
  const backgrounds = useQuery<Background[]>({ queryKey: ['creative-studio-backgrounds'], queryFn: async () => (await apiRequest('GET', '/api/admin/creative-studio/backgrounds')).json() });
  useEffect(() => {
    const revision = ++generation.current;
    setPreview(undefined); setError(''); setWarnings([]);
    if (!id) { setBusy(false); return; }
    setBusy(true);
    const timer = setTimeout(() => {
      renderQueue.current = renderQueue.current.then(async () => {
      if (revision !== generation.current) return;
      try {
        const response = await apiRequest('POST', '/api/admin/creative-studio/export', { type, id, top, ...flags, ...(background ? { background } : {}) });
        const blob = await response.blob();
        if (revision !== generation.current) return;
        if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
        blobUrl.current = URL.createObjectURL(blob);
        const filename = response.headers.get('Content-Disposition')?.match(/filename="([a-zA-Z0-9_.-]+)"/)?.[1] || 'gamefolio-graphic.png';
        setPreview({ url: blobUrl.current, filename });
        setWarnings(JSON.parse(decodeURIComponent(response.headers.get('X-Studio-Warnings') || '%5B%5D')));
      } catch (e) { if (revision === generation.current) setError(e instanceof Error ? e.message : 'Could not generate this graphic.'); }
      finally { if (revision === generation.current) setBusy(false); }
      });
    }, 500);
    return () => { clearTimeout(timer); ++generation.current; };
  }, [type, id, top, flags, background, refresh]);
  useEffect(() => () => { if (blobUrl.current) URL.revokeObjectURL(blobUrl.current); }, []);
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setError('');
    try {
      if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Choose a PNG, JPEG or WebP image up to 10 MB.');
      const form = new FormData(); form.append('background', file);
      const response = await fetch('/api/admin/creative-studio/backgrounds', { method: 'POST', credentials: 'include', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Upload failed');
      await backgrounds.refetch(); setBackground(data.path);
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setUploading(false); }
  }
  return <Card><CardHeader><CardTitle>CREATE GAMEFOLIO GRAPHIC</CardTitle><p className="text-sm text-muted-foreground">Real profiles, season rankings and games. A finished graphic, ready to share.</p></CardHeader><CardContent className="space-y-6">
    <div className="flex flex-wrap gap-2" aria-label="Graphic type">{(['profile','leaderboard','game'] as const).map(value => <Button key={value} variant={type === value ? 'default' : 'outline'} aria-pressed={type === value} onClick={() => { setType(value); setId(undefined); setSearch(''); }}>{value === 'game' ? 'Gamefolio Card' : value === 'profile' ? 'Profile' : 'Leaderboard'}</Button>)}</div>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <div className="space-y-2"><label className="text-sm font-medium" htmlFor="studio-record">{type === 'profile' ? 'SELECT PROFILE' : type === 'game' ? 'SELECT GAME' : 'SELECT SEASON'}</label>{type !== 'leaderboard' && <Input aria-label={type === 'profile' ? 'Search users' : 'Search games'} placeholder={type === 'profile' ? 'Search users…' : 'Search games…'} value={search} onChange={e => setSearch(e.target.value)} />}
        <select id="studio-record" className={selectClass} value={id || ''} onChange={e => setId(e.target.value ? Number(e.target.value) : undefined)}><option value="">{choices.isLoading ? 'Loading…' : 'Choose a record'}</option>{choices.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{choices.isError && <p role="alert">Could not load selections. <button onClick={() => choices.refetch()}>Retry</button></p>}</div>
      <div className="space-y-2"><label htmlFor="studio-background" className="text-sm font-medium">BACKGROUND</label><select id="studio-background" className={selectClass} value={background} onChange={e => setBackground(e.target.value)}><option value="">Gamefolio Default</option>{backgrounds.data?.map((b,i) => <option key={b.path} value={b.path}>Custom background {i + 1}</option>)}</select><label className="block text-xs text-muted-foreground" htmlFor="studio-upload">Upload 1920 × 1080 · PNG, JPEG or WebP · max 10 MB</label><Input id="studio-upload" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} />{background && <Button variant="ghost" size="sm" onClick={() => setBackground('')}>Remove background from graphic</Button>}{uploading && <p role="status">Uploading…</p>}{backgrounds.isError && <p role="alert">Could not load saved backgrounds.</p>}</div>
      <div className="space-y-3"><p className="text-sm font-medium">CANVAS</p><p className="font-mono text-xl">1920 × 1080</p>{type === 'leaderboard' && <><label htmlFor="studio-top">Participants</label><select id="studio-top" className={selectClass} value={top} onChange={e => setTop(Number(e.target.value) as 3 | 5 | 10)}>{[3,5,10].map(n => <option key={n} value={n}>Top {n}</option>)}</select><div className="flex flex-wrap gap-3">{(Object.keys(flags) as (keyof typeof flags)[]).map(key => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flags[key]} onChange={e => setFlags(f => ({ ...f, [key]: e.target.checked }))} />{({ showXp:'XP',showRank:'Rank',showAvatar:'Avatar',showUsername:'Username',showBadge:'Equipped badge' })[key]}</label>)}</div></>}</div>
    </div>
    {error && <div role="alert" className="rounded-md border border-destructive p-3 text-sm">{error}<Button className="ml-3" variant="outline" size="sm" onClick={() => setRefresh(v => v + 1)}>Retry</Button></div>}
    {!!warnings.length && <ul className="text-sm text-amber-400">{warnings.map((w,i) => <li key={i}>{w}</li>)}</ul>}
    <ExportPreview url={preview?.url} loading={busy} />
    <div className="flex flex-wrap gap-3"><Button disabled={!preview || busy || uploading} onClick={() => { if (!preview) return; const a = document.createElement('a'); a.href = preview.url; a.download = preview.filename; a.click(); }}>{busy ? 'GENERATING…' : 'DOWNLOAD HIGH-QUALITY PNG'}</Button><Button variant="outline" disabled={!id || busy} onClick={() => setRefresh(v => v + 1)}>Refresh live data</Button></div>
  </CardContent></Card>;
}
