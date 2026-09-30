import { startServer } from './startup';

// Some hosting environments reserve or omit provider-prefixed variables.
// Accept neutral aliases and normalize them before any application modules load.
process.env.SUPABASE_URL ||= process.env.STORAGE_SUPABASE_URL;
process.env.SUPABASE_ANON_KEY ||= process.env.STORAGE_SUPABASE_ANON_KEY;

// Hosting providers such as Railway inject PORT in production. Replit normally
// uses 5000, so retaining that fallback keeps the current deployment working.
const port = process.env.PORT ? Number(process.env.PORT) : 5000;
void startServer({
  listen: { port, host: process.env.HOST || '0.0.0.0', ...(process.platform !== 'darwin' ? { reusePort: true } : {}) },
  load: async server => {
    const started = performance.now();
    const load = () => import('./index');
    const { startApplication } = process.env.NODE_ENV === 'production' && process.env.STARTUP_DIAGNOSTICS !== 'false'
      ? await (await import('./startup-diagnostics')).profileStartupImports(load)
      : await load();
    console.log(JSON.stringify({ event: 'startup_stage', stage: 'imports', durationMs: Math.round(performance.now() - started) }));
    return startApplication(server);
  },
  onFailure: error => { console.error('Fatal server startup error:', error); process.exit(1); },
}).catch(error => { console.error('Failed to open server port:', error); process.exit(1); });
