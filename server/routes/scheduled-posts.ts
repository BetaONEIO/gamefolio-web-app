import express from 'express';
import { storage } from '../storage';
import { hybridFullAccess } from '../middleware/hybrid-auth';

const router = express.Router();

// List the current user's scheduled posts (pending queue + recent history).
router.get('/', hybridFullAccess, async (req, res) => {
  try {
    const posts = await storage.getScheduledPostsByUser(req.user!.id);
    res.json({ posts });
  } catch (error) {
    console.error('Error listing scheduled posts:', error);
    res.status(500).json({ error: 'Failed to load scheduled posts' });
  }
});

// Current user's scheduling quota (used / remaining / unlimited).
router.get('/limits', hybridFullAccess, async (req, res) => {
  try {
    const limits = await storage.getScheduledPostLimits(req.user!.id);
    res.json(limits);
  } catch (error) {
    console.error('Error fetching scheduled post limits:', error);
    res.status(500).json({ error: 'Failed to fetch scheduling limits' });
  }
});

// Reschedule a pending post to a new future time.
router.patch('/:id', hybridFullAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const post = await storage.getScheduledPost(id);
    if (!post || post.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }
    if (post.status !== 'scheduled') {
      return res.status(400).json({ error: `Cannot reschedule a post that is already ${post.status}.` });
    }

    const date = new Date(req.body.scheduledAt);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid schedule date/time.' });
    }
    if (date.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Schedule time must be in the future.' });
    }

    const updated = await storage.updateScheduledPost(id, { scheduledAt: date });
    res.json({ success: true, post: updated });
  } catch (error) {
    console.error('Error rescheduling post:', error);
    res.status(500).json({ error: 'Failed to reschedule post' });
  }
});

// Cancel (delete) a pending scheduled post. Published posts are left alone.
router.delete('/:id', hybridFullAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const post = await storage.getScheduledPost(id);
    if (!post || post.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }
    if (post.status !== 'scheduled') {
      return res.status(400).json({ error: `Cannot cancel a post that is already ${post.status}.` });
    }

    await storage.deleteScheduledPost(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling scheduled post:', error);
    res.status(500).json({ error: 'Failed to cancel scheduled post' });
  }
});

export default router;
