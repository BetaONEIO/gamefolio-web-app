import { storage } from "./storage";
import { InsertNotification } from "@shared/schema";
import { sendPushToUser } from "./push-service";
import { nanoid } from "nanoid";

// Create the in-app notification row, then fire a push to the recipient.
// Push failure is logged but does not block in-app delivery.
// Exported so callers outside this file (mentions, streaks, birthday, etc.) get
// the same fan-out behaviour without duplicating the dispatch logic.
export async function createAndPush(notification: InsertNotification): Promise<void> {
  const row = await storage.createNotification(notification);
  void sendPushToUser(notification.userId, {
    title: notification.title,
    body: notification.message,
    actionUrl: notification.actionUrl ?? null,
    data: {
      notificationId: String(row.id),
      type: notification.type,
    },
  }).catch(err => console.warn("[notification-service] push fan-out failed:", err));
}

// Returns a user-scoped clip URL. Generates and persists a share code if the
// clip doesn't have one yet. Never exposes the numeric ID in the URL.
async function clipUrl(clipId: number, username: string, shareCode: string | null | undefined): Promise<string> {
  let code = shareCode;
  if (!code) {
    code = nanoid(8);
    await storage.updateClip(clipId, { shareCode: code });
  }
  return `/@${username}/clip/${code}`;
}

export class NotificationService {
  // Create notification for when someone likes a clip
  static async createLikeNotification(clipId: number, likedByUserId: number) {
    try {
      const clip = await storage.getClipWithUser(clipId);
      if (!clip) return;

      // Don't notify if user likes their own clip
      if (clip.userId === likedByUserId) return;

      const likedByUser = await storage.getUser(likedByUserId);
      if (!likedByUser) return;

      const notification: InsertNotification = {
        userId: clip.userId,
        type: "like",
        title: "New Like",
        message: `${likedByUser.username} liked your clip "${clip.title}"`,
        fromUserId: likedByUserId,
        clipId: clipId,
        actionUrl: await clipUrl(clipId, clip.user.username, clip.shareCode),
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating like notification:", error);
    }
  }

  // Create notification for when someone comments on a clip
  static async createCommentNotification(clipId: number, commentedByUserId: number, commentContent: string, commentId?: number) {
    try {
      const clip = await storage.getClipWithUser(clipId);
      if (!clip) return;

      // Don't notify if user comments on their own clip
      if (clip.userId === commentedByUserId) return;

      const commentedByUser = await storage.getUser(commentedByUserId);
      if (!commentedByUser) return;

      const truncatedComment = commentContent.length > 50
        ? commentContent.substring(0, 50) + "..."
        : commentContent;

      const base = await clipUrl(clipId, clip.user.username, clip.shareCode);
      const suffix = commentId
        ? `?openComments=true&highlightComment=${commentId}`
        : `?openComments=true`;

      const notification: InsertNotification = {
        userId: clip.userId,
        type: "comment",
        title: "New Comment",
        message: `${commentedByUser.username} commented on your clip "${clip.title}": "${truncatedComment}"`,
        fromUserId: commentedByUserId,
        clipId: clipId,
        actionUrl: `${base}${suffix}`,
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating comment notification:", error);
    }
  }

  // Create notification for when someone follows a user
  static async createFollowNotification(followedUserId: number, followerUserId: number) {
    try {
      if (followedUserId === followerUserId) return;

      const followerUser = await storage.getUser(followerUserId);
      if (!followerUser) return;

      const notification: InsertNotification = {
        userId: followedUserId,
        type: "follow",
        title: "New Follower",
        message: `${followerUser.username} started following you`,
        fromUserId: followerUserId,
        actionUrl: `/profile/${followerUser.username}`,
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating follow notification:", error);
    }
  }

  // Create notification for follow requests
  static async createFollowRequestNotification(requestedUserId: number, requesterUserId: number) {
    try {
      if (requestedUserId === requesterUserId) return;

      const requesterUser = await storage.getUser(requesterUserId);
      if (!requesterUser) return;

      const notification: InsertNotification = {
        userId: requestedUserId,
        type: "follow_request",
        title: "Follow Request",
        message: `${requesterUser.username} wants to follow you`,
        fromUserId: requesterUserId,
        actionUrl: `/settings/follow-requests`,
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating follow request notification:", error);
    }
  }

  // Create notification when follow request is accepted
  static async createFollowRequestAcceptedNotification(requesterUserId: number, acceptedByUserId: number) {
    try {
      if (requesterUserId === acceptedByUserId) return;

      const acceptedByUser = await storage.getUser(acceptedByUserId);
      if (!acceptedByUser) return;

      const notification: InsertNotification = {
        userId: requesterUserId,
        type: "follow_request_accepted",
        title: "Follow Request Accepted",
        message: `${acceptedByUser.username} accepted your follow request`,
        fromUserId: acceptedByUserId,
        actionUrl: `/profile/${acceptedByUser.username}`,
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating follow request accepted notification:", error);
    }
  }

  // Create notification for followers when someone uploads a new clip
  static async createUploadNotification(userId: number, clipId: number) {
    try {
      const clip = await storage.getClipWithUser(clipId);
      if (!clip) return;

      const uploader = clip.user;
      if (!uploader) return;

      const followers = await storage.getFollowersByUserId(userId);
      const url = await clipUrl(clipId, uploader.username, clip.shareCode);

      const notifications: InsertNotification[] = followers.map(follower => ({
        userId: follower.id,
        type: "upload",
        title: "New Upload",
        message: `${uploader.username} uploaded a new clip: "${clip.title}"`,
        fromUserId: userId,
        clipId: clipId,
        actionUrl: url,
      }));

      for (const notification of notifications) {
        await createAndPush(notification);
      }
    } catch (error) {
      console.error("Error creating upload notifications:", error);
    }
  }

  // Create notification for emoji reaction on a clip
  static async createReactionNotification(clipId: number, reactedByUserId: number, emoji: string) {
    try {
      const clip = await storage.getClipWithUser(clipId);
      if (!clip) return;

      if (clip.userId === reactedByUserId) return;

      const reactedByUser = await storage.getUser(reactedByUserId);
      if (!reactedByUser) return;

      const notification: InsertNotification = {
        userId: clip.userId,
        type: "reaction",
        title: "New Reaction",
        message: `${reactedByUser.username} reacted with ${emoji} to your clip "${clip.title}"`,
        fromUserId: reactedByUserId,
        clipId: clipId,
        actionUrl: await clipUrl(clipId, clip.user.username, clip.shareCode),
        metadata: { emoji },
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating reaction notification:", error);
    }
  }

  // Create notification for emoji reaction on a screenshot
  static async createScreenshotReactionNotification(screenshotId: number, reactedByUserId: number, emoji: string) {
    try {
      const screenshot = await storage.getScreenshotWithUser(screenshotId);
      if (!screenshot || !screenshot.user) return;
      if (screenshot.userId === reactedByUserId) return;

      const reactedByUser = await storage.getUser(reactedByUserId);
      if (!reactedByUser) return;

      const notification: InsertNotification = {
        userId: screenshot.userId,
        type: "reaction",
        title: "New Reaction",
        message: `${reactedByUser.username} reacted with ${emoji} to your screenshot "${screenshot.title}"`,
        fromUserId: reactedByUserId,
        actionUrl: `/@${screenshot.user.username}/screenshots/${screenshotId}`,
        metadata: { emoji },
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating screenshot reaction notification:", error);
    }
  }

  // Create notification for new message
  static async createMessageNotification(senderId: number, receiverId: number, messageContent: string) {
    try {
      if (senderId === receiverId) return;

      const senderUser = await storage.getUser(senderId);
      if (!senderUser) return;

      const truncatedMessage = messageContent.length > 50
        ? messageContent.substring(0, 50) + "..."
        : messageContent;

      const notification: InsertNotification = {
        userId: receiverId,
        type: "message",
        title: "New Message",
        message: `${senderUser.username} sent you a message: "${truncatedMessage}"`,
        fromUserId: senderId,
        actionUrl: `/messages?user=${senderUser.username}`,
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating message notification:", error);
    }
  }

  // Create notification for when someone likes a screenshot
  static async createScreenshotLikeNotification(screenshotId: number, likedByUserId: number) {
    try {
      const screenshot = await storage.getScreenshotWithUser(screenshotId);
      if (!screenshot) return;

      if (screenshot.userId === likedByUserId) return;

      const likedByUser = await storage.getUser(likedByUserId);
      if (!likedByUser) return;

      const notification: InsertNotification = {
        userId: screenshot.userId,
        type: "like",
        title: "New Like",
        message: `${likedByUser.username} liked your screenshot "${screenshot.title}"`,
        fromUserId: likedByUserId,
        screenshotId: screenshotId,
        actionUrl: `/@${screenshot.user.username}/screenshots/${screenshotId}`,
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating screenshot like notification:", error);
    }
  }

  // Create notification for when someone comments on a screenshot
  static async createScreenshotCommentNotification(screenshotId: number, commentedByUserId: number, commentContent: string, commentId?: number) {
    try {
      const screenshot = await storage.getScreenshotWithUser(screenshotId);
      if (!screenshot) return;

      if (screenshot.userId === commentedByUserId) return;

      const commentedByUser = await storage.getUser(commentedByUserId);
      if (!commentedByUser) return;

      const truncatedComment = commentContent.length > 50
        ? commentContent.substring(0, 50) + "..."
        : commentContent;

      const base = `/@${screenshot.user.username}/screenshots/${screenshotId}`;
      const suffix = commentId
        ? `?openComments=true&highlightComment=${commentId}`
        : `?openComments=true`;

      const notification: InsertNotification = {
        userId: screenshot.userId,
        type: "comment",
        title: "New Comment",
        message: `${commentedByUser.username} commented on your screenshot "${screenshot.title}": "${truncatedComment}"`,
        fromUserId: commentedByUserId,
        screenshotId: screenshotId,
        actionUrl: `${base}${suffix}`,
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating screenshot comment notification:", error);
    }
  }

  // Create notification when someone downloads your clip
  static async createDownloadNotification(clipId: number, downloadedByUserId: number | undefined) {
    try {
      const clip = await storage.getClipWithUser(clipId);
      if (!clip) return;
      if (downloadedByUserId && clip.userId === downloadedByUserId) return;

      const downloader = downloadedByUserId ? await storage.getUser(downloadedByUserId) : null;
      const message = downloader
        ? `${downloader.username} downloaded your clip "${clip.title}"`
        : `Your clip "${clip.title}" was downloaded`;

      const notification: InsertNotification = {
        userId: clip.userId,
        type: "download",
        title: "New Download",
        message,
        fromUserId: downloadedByUserId,
        clipId: clipId,
        actionUrl: await clipUrl(clipId, clip.user.username, clip.shareCode),
      };
      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating download notification:", error);
    }
  }

  // Create notification when someone shares your clip
  static async createShareNotification(clipId: number, sharedByUserId: number | undefined) {
    try {
      const clip = await storage.getClipWithUser(clipId);
      if (!clip) return;
      if (sharedByUserId && clip.userId === sharedByUserId) return;

      const sharer = sharedByUserId ? await storage.getUser(sharedByUserId) : null;
      const message = sharer
        ? `${sharer.username} shared your clip "${clip.title}"`
        : `Your clip "${clip.title}" was shared`;

      const notification: InsertNotification = {
        userId: clip.userId,
        type: "share",
        title: "New Share",
        message,
        fromUserId: sharedByUserId,
        clipId: clipId,
        actionUrl: await clipUrl(clipId, clip.user.username, clip.shareCode),
      };
      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating share notification:", error);
    }
  }

  // Create notification when someone shares your screenshot
  static async createScreenshotShareNotification(screenshotId: number, sharedByUserId: number | undefined) {
    try {
      const screenshot = await storage.getScreenshotWithUser(screenshotId);
      if (!screenshot || !screenshot.user) return;
      if (sharedByUserId && screenshot.userId === sharedByUserId) return;

      const sharer = sharedByUserId ? await storage.getUser(sharedByUserId) : null;
      const message = sharer
        ? `${sharer.username} shared your screenshot "${screenshot.title}"`
        : `Your screenshot "${screenshot.title}" was shared`;

      const notification: InsertNotification = {
        userId: screenshot.userId,
        type: "share",
        title: "New Share",
        message,
        fromUserId: sharedByUserId,
        screenshotId: screenshotId,
        actionUrl: `/@${screenshot.user.username}/screenshots/${screenshotId}`,
      };
      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating screenshot share notification:", error);
    }
  }

  // Create notification when a clip reaches a view milestone
  static async createViewMilestoneNotification(
    clipId: number,
    ownerId: number,
    viewCount: number,
    milestone: number
  ) {
    try {
      const clip = await storage.getClipWithUser(clipId);
      if (!clip) return;

      const notification: InsertNotification = {
        userId: ownerId,
        type: "milestone",
        title: "View Milestone",
        message: `Your clip "${clip.title}" hit ${milestone.toLocaleString()} views!`,
        clipId: clipId,
        actionUrl: await clipUrl(clipId, clip.user.username, clip.shareCode),
        metadata: { viewCount, milestone },
      };
      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating view milestone notification:", error);
    }
  }

  // Notify a bounty owner when a creator submits content for review
  static async createBountySubmissionNotification(
    ownerId: number,
    submitterId: number,
    bountyId: number,
    bountyTitle: string
  ) {
    try {
      const submitter = await storage.getUser(submitterId);
      if (!submitter) return;
      const notification: InsertNotification = {
        userId: ownerId,
        type: "bounty_submission",
        title: "New Bounty Submission",
        message: `${submitter.username} submitted content for "${bountyTitle}"`,
        fromUserId: submitterId,
        actionUrl: `/indie/dashboard?tab=review&bounty=${bountyId}`,
        metadata: { bountyId },
      };
      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating bounty submission notification:", error);
    }
  }

  // Notify a creator when their bounty submission is approved or rejected
  static async createBountySubmissionReviewedNotification(
    submitterId: number,
    bountyId: number,
    bountyTitle: string,
    approved: boolean,
    reason?: string
  ) {
    try {
      const notification: InsertNotification = {
        userId: submitterId,
        type: "bounty_review",
        title: approved ? "Submission Approved" : "Submission Rejected",
        message: approved
          ? `Your submission for "${bountyTitle}" was approved! Rewards have been credited.`
          : `Your submission for "${bountyTitle}" was rejected.${reason ? ` Reason: ${reason}` : ""}`,
        actionUrl: `/indie/dashboard?tab=bounties&bounty=${bountyId}`,
        metadata: { bountyId, approved },
      };
      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating bounty review notification:", error);
    }
  }
}
