import { Router } from 'express';
import type { Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { adminMiddleware } from '../middleware/admin';
import { storage } from '../storage';
import { supabaseStorage } from '../supabase-storage';
import { SEASON_DEFS, getPublicSeasonNumber } from '../../shared/season-definitions';
import { exportRequestSchema } from '../../shared/creative-studio';
import { validateBackground } from '../creative-studio/assets';
import { captureRouteError } from '../sentry';
import { hasBearerToken } from '../services/service-token';

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

let exportBusy = false;
async function renderGraphic(body: unknown, res: Response) {
  const parsed = exportRequestSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ message: 'Select a valid graphic type, record and background.' });
  if (exportBusy) return res.status(429).json({ message: 'Creative Studio is rendering another graphic. Please try again shortly.' });
  exportBusy = true;
  try {
    // Lazy-load the renderer so normal application startup does not launch Chromium.
    const [{ loadComposition }, { renderExport }] = await Promise.all([import('../creative-studio/data'), import('../creative-studio/renderer')]);
    const data = await loadComposition(parsed.data);
    const png = await renderExport(data);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
    res.setHeader('X-Studio-Warnings', encodeURIComponent(JSON.stringify(data.warnings)));
    res.send(png);
  } catch (error) {
    captureRouteError(error);
    const message = error instanceof Error ? error.message : '';
    const helpful = /selected|season|ranked participants|does not fit|another graphic/.test(message);
    res.status(/another graphic/.test(message) ? 429 : 500).json({ message: helpful ? message : 'The graphic could not be rendered. Check image/font availability and the server Chromium installation, then retry.' });
  } finally { exportBusy = false; }
}

// Headless automation entry point. It is deliberately limited to the current
// season leaderboard; the token does not grant access to other admin routes.
router.post('/daily-leaderboard-export', async (req, res) => {
  if (!hasBearerToken(req.get('authorization'), process.env.CREATIVE_STUDIO_EXPORT_TOKEN)) return res.status(401).json({ message: 'Unauthorized' });
  const { top = 10, showXp = true, showRank = true, showAvatar = true, showUsername = true, showBadge = true } = req.body || {};
  return renderGraphic({
    type: 'leaderboard', id: SEASON_DEFS[0].num, top,
    showXp, showRank, showAvatar, showUsername, showBadge,
  }, res);
});

router.use(adminMiddleware);
router.get('/options', async (req, res) => {
  try {
    const search = String(req.query.search || '').slice(0, 100);
    const type = req.query.type;
    if (type === 'profile') {
      const users = await storage.getAllUsers(25, 0, search);
      return res.json(users.map(u => ({ id: u.id, name: `${u.displayName || u.username} (@${u.username})` })));
    }
    if (type === 'game') {
      const games = await storage.getAllGames();
      return res.json(games.filter(g => g.isApproved && g.name.toLowerCase().includes(search.toLowerCase())).slice(0, 50).map(g => ({ id: g.id, name: g.name })));
    }
    return res.json(SEASON_DEFS.map(s => ({ id: s.num, name: `${s.name} · Season ${getPublicSeasonNumber(s.num)} · ${s.dateRange}` })));
  } catch (error) { captureRouteError(error); res.status(500).json({ message: 'Could not load studio selections.' }); }
});
router.get('/backgrounds', async (_req, res) => {
  try {
    const files = await supabaseStorage.listBucketFiles('gamefolio-media', 'creative-studio');
    res.json(files.map(file => ({ path: file.path, name: file.name, url: file.publicUrl })));
  } catch (error) { captureRouteError(error); res.status(500).json({ message: 'Could not load uploaded backgrounds.' }); }
});
router.post('/backgrounds', (req, res, next) => upload.single('background')(req, res, error => {
  if (error) return res.status(400).json({ message: 'Upload one PNG, JPEG or WebP image up to 10 MB.' });
  next();
}), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Select a background image.' });
    const png = await validateBackground(req.file.buffer, req.file.mimetype);
    const result = await supabaseStorage.uploadBufferToFixedPath(png, `creative-studio/${randomUUID()}.png`, 'image/png');
    res.status(201).json(result);
  } catch (error) {
    captureRouteError(error);
    res.status(400).json({ message: error instanceof Error && /Backgrounds|Upload a/.test(error.message) ? error.message : 'Could not validate or save this background.' });
  }
});
router.post('/export', async (req, res) => {
  return renderGraphic(req.body, res);
});
export default router;
