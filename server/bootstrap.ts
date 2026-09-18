import { startServer } from './startup';

const port = process.env.NODE_ENV === 'development' && process.env.PORT ? Number(process.env.PORT) : 5000;
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
