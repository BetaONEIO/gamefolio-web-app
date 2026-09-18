export function ExportPreview({ url, loading }: { url?: string; loading: boolean }) {
  return <section aria-label="Live preview" className="space-y-3">
    <div className="flex items-center justify-between"><h3 className="text-sm font-semibold tracking-widest">LIVE PREVIEW</h3><span className="text-xs text-muted-foreground">1920 × 1080</span></div>
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-[#0b0d0b]">
      {url && <img src={url} alt="Current Gamefolio graphic, exactly as it will download" className="h-full w-full object-contain" />}
      {!url && !loading && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Select a record to create your graphic.</div>}
      {loading && <div role="status" className="absolute inset-0 flex items-center justify-center bg-black/75 text-primary">GENERATING…</div>}
    </div>
  </section>;
}
