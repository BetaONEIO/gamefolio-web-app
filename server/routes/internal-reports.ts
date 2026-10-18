import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import {
  claimDailyActivityReport,
  completeDailyActivityReport,
  failDailyActivityReport,
} from '../daily-telegram-report';
import { captureRouteError } from '../sentry';

const router = Router();
const REPORT_DATE = /^\d{4}-\d{2}-\d{2}$/;

function authorized(req: Request): boolean {
  const expected = process.env.INTERNAL_REPORTS_SECRET;
  const authorization = req.get('authorization');
  const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!expected || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function guard(req: Request, res: Response): boolean {
  if (!process.env.INTERNAL_REPORTS_SECRET) {
    res.status(503).json({ error: 'Internal reports integration is not configured' });
    return false;
  }
  if (!authorized(req)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return false;
  }
  return true;
}

router.post('/daily-activity/claim', async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const summary = await claimDailyActivityReport();
    if (!summary) return res.sendStatus(204);
    return res.json({ summary });
  } catch (error) {
    captureRouteError(error, { context: 'internal-daily-activity-claim' });
    return res.status(500).json({ error: 'Unable to prepare daily activity report' });
  }
});

router.post('/daily-activity/:reportDate/complete', async (req, res) => {
  if (!guard(req, res)) return;
  if (!REPORT_DATE.test(req.params.reportDate)) return res.status(400).json({ error: 'Invalid report date' });
  try {
    await completeDailyActivityReport(req.params.reportDate);
    return res.sendStatus(204);
  } catch (error) {
    captureRouteError(error, { context: 'internal-daily-activity-complete' });
    return res.status(500).json({ error: 'Unable to complete daily activity report' });
  }
});

router.post('/daily-activity/:reportDate/fail', async (req, res) => {
  if (!guard(req, res)) return;
  if (!REPORT_DATE.test(req.params.reportDate)) return res.status(400).json({ error: 'Invalid report date' });
  try {
    await failDailyActivityReport(req.params.reportDate);
    return res.sendStatus(204);
  } catch (error) {
    captureRouteError(error, { context: 'internal-daily-activity-fail' });
    return res.status(500).json({ error: 'Unable to release daily activity report' });
  }
});

export default router;
