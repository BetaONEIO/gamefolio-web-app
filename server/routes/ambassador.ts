import { Router, Request, Response } from 'express';
import { hybridAuth } from '../middleware/hybrid-auth';
import { storage } from '../storage';

const router = Router();

router.get('/api/ambassador/stats', hybridAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.isAmbassador) {
      return res.status(403).json({ message: 'Ambassador access required' });
    }

    const stats = await storage.getAmbassadorDashboardStats(user.id);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching ambassador stats:', error);
    res.status(500).json({ message: 'Failed to fetch ambassador stats' });
  }
});

export const ambassadorRouter = router;
