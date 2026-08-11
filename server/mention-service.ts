import { nanoid } from "nanoid";
import { type IStorage } from './storage';
import { getRealtimeNotificationService } from './realtime-notification-service';
import { sendPushToUser } from './push-service';

export interface MentionMatch {
  username: string;
  userId: number;
  startIndex: number;
  endIndex: number;
}

// Build a user-scoped clip URL from a clip+user record.
// Generates and persists a shareCode via nanoid(8) if the clip has none.
async function buildClipUrl(
  storage: IStorage,
  clipId: number,
  username: string,
  shareCode: string | null | undefined,
  suffix?: string
): Promise<string> {
  let code = shareCode;
  if (!code) {
    code = nanoid(8);
    await storage.updateClip(clipId, { shareCode: code });
  }
  const base = `/@${username}/clip/${code}`;
  return suffix ? `${base}${suffix}` : base;
}

export class MentionService {
  constructor(private storage: IStorage) {}

  /**
   * Extracts @username mentions from text and validates them against the database
   * @param text The text to parse for mentions
   * @returns Array of valid mention matches with user IDs
   */
  async parseMentions(text: string): Promise<MentionMatch[]> {
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const mentions: MentionMatch[] = [];
    let match;

    const potentialMentions: Array<{ username: string; startIndex: number; endIndex: number }> = [];
    while ((match = mentionRegex.exec(text)) !== null) {
      potentialMentions.push({
        username: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    if (potentialMentions.length === 0) {
      return [];
    }

    const uniqueUsernames = Array.from(new Set(potentialMentions.map(m => m.username)));
    const validUsers = await this.storage.getUsersByUsernames(uniqueUsernames);
    const validUsernameMap = new Map(validUsers.map(user => [user.username.toLowerCase(), user]));

    for (const potential of potentialMentions) {
      const user = validUsernameMap.get(potential.username.toLowerCase());
      if (user) {
        mentions.push({
          username: user.username,
          userId: user.id,
          startIndex: potential.startIndex,
          endIndex: potential.endIndex
        });
      }
    }

    return mentions;
  }

  /**
   * Creates mention records and notifications for a clip upload
   * @param clipId The ID of the clip
   * @param mentionedUserIds Array of user IDs that were mentioned
   * @param mentionedByUserId The ID of the user who created the mention
   * @param clipTitle The title of the clip for notification context
   */
  async createClipMentions(
    clipId: number,
    mentionedUserIds: number[],
    mentionedByUserId: number,
    clipTitle: string
  ): Promise<void> {
    if (mentionedUserIds.length === 0) return;

    const mentionCreator = await this.storage.getUserById(mentionedByUserId);
    if (!mentionCreator) return;

    const clip = await this.storage.getClipWithUser(clipId);
    if (!clip || !clip.user) return;

    const actionUrl = await buildClipUrl(this.storage, clipId, clip.user.username, clip.shareCode);

    const uniqueUserIds = Array.from(new Set(mentionedUserIds)).filter(id => id !== mentionedByUserId);

    for (const userId of uniqueUserIds) {
      await this.storage.createClipMention({
        clipId,
        mentionedUserId: userId,
        mentionedByUserId
      });

      const notif = await this.storage.createNotification({
        userId: userId,
        type: 'clip_mention',
        title: `@${mentionCreator.username} mentioned you in a clip`,
        message: `${mentionCreator.displayName} mentioned you in "${clipTitle}"`,
        fromUserId: mentionedByUserId,
        clipId: clipId,
        actionUrl,
        metadata: {
          mentionType: 'clip',
          clipTitle,
          mentionedBy: {
            id: mentionCreator.id,
            username: mentionCreator.username,
            displayName: mentionCreator.displayName
          }
        }
      });
      void sendPushToUser(userId, {
        title: notif.title,
        body: notif.message,
        actionUrl: notif.actionUrl,
        data: { notificationId: String(notif.id), type: notif.type },
      }).catch(err => console.warn('[mention-service] push fan-out failed:', err));

      const realtimeService = getRealtimeNotificationService();
      if (realtimeService) {
        realtimeService.sendMentionNotification(userId, {
          type: 'clip_mention',
          mentionedByUserId: mentionedByUserId,
          mentionedByUsername: mentionCreator.username,
          contentId: clipId,
          contentTitle: clipTitle
        });
      }
    }
  }

  /**
   * Creates mention records and notifications for a comment on a clip
   * @param commentId The ID of the comment
   * @param mentionedUserIds Array of user IDs that were mentioned
   * @param mentionedByUserId The ID of the user who created the mention
   * @param clipId The ID of the clip being commented on
   */
  async createCommentMentions(
    commentId: number,
    mentionedUserIds: number[],
    mentionedByUserId: number,
    clipId: number
  ): Promise<void> {
    if (mentionedUserIds.length === 0) return;

    const mentionCreator = await this.storage.getUserById(mentionedByUserId);
    if (!mentionCreator) return;

    const clip = await this.storage.getClipWithUser(clipId);
    if (!clip || !clip.user) return;

    const actionUrl = await buildClipUrl(
      this.storage,
      clipId,
      clip.user.username,
      clip.shareCode,
      `?openComments=true&highlightComment=${commentId}`
    );

    const uniqueUserIds = Array.from(new Set(mentionedUserIds)).filter(id => id !== mentionedByUserId);

    for (const userId of uniqueUserIds) {
      await this.storage.createCommentMention({
        commentId,
        mentionedUserId: userId,
        mentionedByUserId
      });

      const notif = await this.storage.createNotification({
        userId: userId,
        type: 'comment_mention',
        title: `@${mentionCreator.username} mentioned you in a comment`,
        message: `${mentionCreator.displayName} mentioned you in a comment`,
        fromUserId: mentionedByUserId,
        clipId: clipId,
        commentId: commentId,
        actionUrl,
        metadata: {
          mentionType: 'comment',
          mentionedBy: {
            id: mentionCreator.id,
            username: mentionCreator.username,
            displayName: mentionCreator.displayName
          }
        }
      });
      void sendPushToUser(userId, {
        title: notif.title,
        body: notif.message,
        actionUrl: notif.actionUrl,
        data: { notificationId: String(notif.id), type: notif.type },
      }).catch(err => console.warn('[mention-service] push fan-out failed:', err));

      const realtimeService = getRealtimeNotificationService();
      if (realtimeService) {
        realtimeService.sendMentionNotification(userId, {
          type: 'comment_mention',
          mentionedByUserId: mentionedByUserId,
          mentionedByUsername: mentionCreator.username,
          contentId: commentId,
          contentText: `Comment on clip by ${clip.user.username}`
        });
      }
    }
  }

  /**
   * Creates mention records and notifications for a screenshot comment
   * @param screenshotCommentId The ID of the screenshot comment
   * @param mentionedUserIds Array of user IDs that were mentioned
   * @param mentionedByUserId The ID of the user who created the mention
   * @param screenshotId The ID of the screenshot being commented on
   */
  async createScreenshotCommentMentions(
    screenshotCommentId: number,
    mentionedUserIds: number[],
    mentionedByUserId: number,
    screenshotId: number
  ): Promise<void> {
    if (mentionedUserIds.length === 0) return;

    const mentionCreator = await this.storage.getUserById(mentionedByUserId);
    if (!mentionCreator) return;

    const screenshot = await this.storage.getScreenshotWithUser(screenshotId);
    const username = screenshot?.user?.username;
    const actionUrl = username
      ? `/@${username}/screenshots/${screenshotId}?openComments=true&highlightComment=${screenshotCommentId}`
      : null;

    const uniqueUserIds = Array.from(new Set(mentionedUserIds)).filter(id => id !== mentionedByUserId);

    for (const userId of uniqueUserIds) {
      await this.storage.createScreenshotCommentMention({
        screenshotCommentId,
        mentionedUserId: userId,
        mentionedByUserId
      });

      const notif = await this.storage.createNotification({
        userId: userId,
        type: 'comment_mention',
        title: `@${mentionCreator.username} mentioned you in a comment`,
        message: `${mentionCreator.displayName} mentioned you in a comment on a screenshot`,
        fromUserId: mentionedByUserId,
        screenshotId: screenshotId,
        actionUrl,
        metadata: {
          mentionType: 'screenshot_comment',
          mentionedBy: {
            id: mentionCreator.id,
            username: mentionCreator.username,
            displayName: mentionCreator.displayName
          }
        }
      });
      void sendPushToUser(userId, {
        title: notif.title,
        body: notif.message,
        actionUrl: notif.actionUrl,
        data: { notificationId: String(notif.id), type: notif.type },
      }).catch(err => console.warn('[mention-service] push fan-out failed:', err));
    }
  }

  /**
   * Renders text with mention highlights for display
   * @param text The text containing mentions
   * @param mentions Array of mention matches
   * @returns Text with HTML span elements around mentions
   */
  renderMentionsAsHTML(text: string, mentions: MentionMatch[]): string {
    if (mentions.length === 0) return text;

    const sortedMentions = [...mentions].sort((a, b) => b.startIndex - a.startIndex);

    let result = text;
    for (const mention of sortedMentions) {
      const beforeMention = result.substring(0, mention.startIndex);
      const afterMention = result.substring(mention.endIndex);
      const mentionHtml = `<span class="mention" data-user-id="${mention.userId}">@${mention.username}</span>`;
      result = beforeMention + mentionHtml + afterMention;
    }

    return result;
  }
}
