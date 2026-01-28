import { Router, Request, Response } from 'express';
import { getStakePosition, getStakingStats, StakingError } from '../gf-staking-service';
import { hybridAuth } from '../middleware/hybrid-auth';

const router = Router();

router.get('/api/staking/position/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const position = await getStakePosition(address);
    
    return res.json({
      staked: position.staked,
      earned: position.earned,
    });
  } catch (error: any) {
    if (error instanceof StakingError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    console.error('Get stake position error:', error);
    return res.status(500).json({ error: 'Failed to get stake position' });
  }
});

router.get('/api/staking/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getStakingStats();
    return res.json(stats);
  } catch (error: any) {
    if (error instanceof StakingError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    console.error('Get staking stats error:', error);
    return res.status(500).json({ error: 'Failed to get staking stats' });
  }
});

export default router;
