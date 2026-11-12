import type { RequestHandler } from 'express';
import { getBountyRewardPoolRevision } from './bounty-reward-pool';

const viewers = new Set<(event: string) => void>();
let revision: string | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let checking = false;
let healthy = false;

function broadcast(name: string) {
  viewers.forEach(send => send(`event: ${name}\ndata: {}\n\n`));
}

async function checkForRewards() {
  checking = true;
  try {
    const next = await getBountyRewardPoolRevision();
    if (!healthy) {
      healthy = true;
      broadcast('rewards-ready');
    } else if (next !== revision) {
      broadcast('rewards-changed');
    }
    revision = next;
  } catch (error) {
    if (healthy || revision == null) console.error('[Bounty Reward Pool] Live update check failed:', error);
    healthy = false;
    broadcast('rewards-stale');
  } finally {
    checking = false;
    if (viewers.size) {
      timer = setTimeout(() => {
        timer = undefined;
        void checkForRewards();
      }, 3_000);
    }
  }
}

export const streamBountyRewardPoolEvents: RequestHandler = (_req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'private, no-store, no-transform',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 5000\n\n');

  const send = (event: string) => {
    if (res.destroyed || res.writableEnded) return;
    // Reconnecting clients fetch a fresh snapshot, so slow connections can close.
    if (!res.write(event)) res.end();
  };
  const heartbeat = setInterval(() => send(': heartbeat\n\n'), 20_000);
  viewers.add(send);
  if (healthy) send('event: rewards-ready\ndata: {}\n\n');
  res.once('close', () => {
    viewers.delete(send);
    clearInterval(heartbeat);
    if (!viewers.size) {
      if (timer) clearTimeout(timer);
      timer = undefined;
      healthy = false;
    }
  });
  if (!checking && !timer) void checkForRewards();
};
