import { describe, expect, it } from 'bun:test';
import { formatNewBountyNotification } from '../server/telegram-notify';

describe('formatNewBountyNotification', () => {
  it('includes campaign, creator and game details', () => {
    const message = formatNewBountyNotification({
      id: 42,
      title: 'Launch <Week>',
      creatorId: 7,
      creatorUsername: 'studio&co',
      gameName: 'Quest > Two',
      status: 'draft',
      commercialType: 'starter',
      source: 'campaign',
    });

    expect(message).toContain('New bounty created');
    expect(message).toContain('Launch &lt;Week&gt;');
    expect(message).toContain('studio&amp;co');
    expect(message).toContain('Quest &gt; Two');
    expect(message).toContain('Starter Bounty · draft · Bounty #42');
    expect(message).toContain('/game-dashboard?tab=campaigns');
  });

  it('falls back safely when optional labels are absent', () => {
    const message = formatNewBountyNotification({
      id: 9,
      title: 'Clip bounty',
      creatorId: 3,
      source: 'game_bounty',
    });

    expect(message).toContain('user-3');
    expect(message).toContain('Game bounty · draft · Bounty #9');
  });
});
