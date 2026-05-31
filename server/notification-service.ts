import { storage } from "./storage";
import { InsertNotification } from "@shared/schema";
import { sendPushToUser } from "./push-service";

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

export class NotificationService {
  // Create notification for when someone likes a clip
  static async createLikeNotification(clipId: number, likedByUserId: number) {
    try {
      // Get clip details and owner
      const clip = await storage.getClipWithUser(clipId);
      if (!clip) return;

      // Don't notify if user likes their own clip
      if (clip.userId === likedByUserId) return;

      // Get the user who liked the clip
      const likedByUser = await storage.getUser(likedByUserId);
      if (!likedByUser) return;

      const notification: InsertNotification = {
        userId: clip.userId,
        type: "like",
        title: "New Like",
        message: `${likedByUser.username} liked your clip "${clip.title}"`,
        fromUserId: likedByUserId,
        clipId: clipId,
        actionUrl: `/clips/${clipId}`
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating like notification:", error);
    }
  }

  // Create notification for when someone comments on a clip
  static async createCommentNotification(clipId: number, commentedByUserId: number, commentContent: string, commentId?: number) {
    try {
      // Get clip details and owner
      const clip = await storage.getClipWithUser(clipId);
      if (!clip) return;

      // Don't notify if user comments on their own clip
      if (clip.userId === commentedByUserId) return;

      // Get the user who commented
      const commentedByUser = await storage.getUser(commentedByUserId);
      if (!commentedByUser) return;

      const truncatedComment = commentContent.length > 50 
        ? commentContent.substring(0, 50) + "..." 
        : commentContent;

      const notification: InsertNotification = {
        userId: clip.userId,
        type: "comment",
        title: "New Comment",
        message: `${commentedByUser.username} commented on your clip "${clip.title}": "${truncatedComment}"`,
        fromUserId: commentedByUserId,
        clipId: clipId,
        actionUrl: `/clips/${clipId}?openComments=true${commentId ? `&highlightComment=${commentId}` : ''}`
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating comment notification:", error);
    }
  }

  // Create notification for when someone follows a user
  static async createFollowNotification(followedUserId: number, followerUserId: number) {
    try {
      // Don't notify if user follows themselves
      if (followedUserId === followerUserId) return;

      // Get the follower user
      const followerUser = await storage.getUser(followerUserId);
      if (!followerUser) return;

      const notification: InsertNotification = {
        userId: followedUserId,
        type: "follow",
        title: "New Follower",
        message: `${followerUser.username} started following you`,
        fromUserId: followerUserId,
        actionUrl: `/profile/${followerUser.username}`
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating follow notification:", error);
    }
  }

  // Create notification for follow requests
  static async createFollowRequestNotification(requestedUserId: number, requesterUserId: number) {
    try {
      // Don't notify if user requests themselves
      if (requestedUserId === requesterUserId) return;

      // Get the requester user
      const requesterUser = await storage.getUser(requesterUserId);
      if (!requesterUser) return;

      const notification: InsertNotification = {
        userId: requestedUserId,
        type: "follow_request",
        title: "Follow Request",
        message: `${requesterUser.username} wants to follow you`,
        fromUserId: requesterUserId,
        actionUrl: `/settings/follow-requests`
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating follow request notification:", error);
    }
  }

  // Create notification when follow request is accepted
  static async createFollowRequestAcceptedNotification(requesterUserId: number, acceptedByUserId: number) {
    try {
      // Don't notify if user accepts their own request
      if (requesterUserId === acceptedByUserId) return;

      // Get the user who accepted
      const acceptedByUser = await storage.getUser(acceptedByUserId);
      if (!acceptedByUser) return;

      const notification: InsertNotification = {
        userId: requesterUserId,
        type: "follow_request_accepted",
        title: "Follow Request Accepted",
        message: `${acceptedByUser.username} accepted your follow request`,
        fromUserId: acceptedByUserId,
        actionUrl: `/profile/${acceptedByUser.username}`
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating follow request accepted notification:", error);
    }
  }

  // Create notification for followers when someone uploads a new clip
  static async createUploadNotification(userId: number, clipId: number) {
    try {
      // Get the user who uploaded
      const uploader = await storage.getUser(userId);
      if (!uploader) return;

      // Get clip details
      const clip = await storage.getClip(clipId);
      if (!clip) return;

      // Get all followers of the user
      const followers = await storage.getFollowersByUserId(userId);

      // Create notifications for all followers
      const notifications: InsertNotification[] = followers.map(follower => ({
        userId: follower.id,
        type: "upload",
        title: "New Upload",
        message: `${uploader.username} uploaded a new clip: "${clip.title}"`,
        fromUserId: userId,
        clipId: clipId,
        actionUrl: `/clips/${clipId}`
      }));

      // Create all notifications
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
      // Get clip details and owner
      const clip = await storage.getClipWithUser(clipId);
      if (!clip) return;

      // Don't notify if user reacts to their own clip
      if (clip.userId === reactedByUserId) return;

      // Get the user who reacted
      const reactedByUser = await storage.getUser(reactedByUserId);
      if (!reactedByUser) return;

      const notification: InsertNotification = {
        userId: clip.userId,
        type: "reaction",
        title: "New Reaction",
        message: `${reactedByUser.username} reacted with ${emoji} to your clip "${clip.title}"`,
        fromUserId: reactedByUserId,
        clipId: clipId,
        actionUrl: `/clips/${clipId}`,
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
      const screenshot = await storage.getScreenshot(screenshotId);
      if (!screenshot) return;
      if (screenshot.userId === reactedByUserId) return;

      const reactedByUser = await storage.getUser(reactedByUserId);
      if (!reactedByUser) return;

      const notification: InsertNotification = {
        userId: screenshot.userId,
        type: "reaction",
        title: "New Reaction",
        message: `${reactedByUser.username} reacted with ${emoji} to your screenshot "${screenshot.title}"`,
        fromUserId: reactedByUserId,
        actionUrl: `/screenshots/${screenshotId}`,
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
      // Don't notify if user messages themselves
      if (senderId === receiverId) return;

      // Get the sender user
      const senderUser = await storage.getUser(senderId);
      if (!senderUser) return;

      // Truncate message content for notification
      const truncatedMessage = messageContent.length > 50 
        ? messageContent.substring(0, 50) + "..." 
        : messageContent;

      const notification: InsertNotification = {
        userId: receiverId,
        type: "message",
        title: "New Message",
        message: `${senderUser.username} sent you a message: "${truncatedMessage}"`,
        fromUserId: senderId,
        actionUrl: `/messages?user=${senderUser.username}`
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating message notification:", error);
    }
  }

  // Create notification for when someone likes a screenshot
  static async createScreenshotLikeNotification(screenshotId: number, likedByUserId: number) {
    try {
      // Get screenshot details and owner
      const screenshot = await storage.getScreenshotWithUser(screenshotId);
      if (!screenshot) return;

      // Don't notify if user likes their own screenshot
      if (screenshot.userId === likedByUserId) return;

      // Get the user who liked the screenshot
      const likedByUser = await storage.getUser(likedByUserId);
      if (!likedByUser) return;

      const notification: InsertNotification = {
        userId: screenshot.userId,
        type: "like",
        title: "New Like",
        message: `${likedByUser.username} liked your screenshot "${screenshot.title}"`,
        fromUserId: likedByUserId,
        screenshotId: screenshotId,
        actionUrl: `/@${screenshot.user.username}/screenshots/${screenshotId}`
      };

      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating screenshot like notification:", error);
    }
  }

  // Create notification for when someone comments on a screenshot
  static async createScreenshotCommentNotification(screenshotId: number, commentedByUserId: number, commentContent: string, commentId?: number) {
    try {
      // Get screenshot details and owner
      const screenshot = await storage.getScreenshotWithUser(screenshotId);
      if (!screenshot) return;

      // Don't notify if user comments on their own screenshot
      if (screenshot.userId === commentedByUserId) return;

      // Get the user who commented
      const commentedByUser = await storage.getUser(commentedByUserId);
      if (!commentedByUser) return;

      const truncatedComment = commentContent.length > 50 
        ? commentContent.substring(0, 50) + "..." 
        : commentContent;

      const notification: InsertNotification = {
        userId: screenshot.userId,
        type: "comment",
        title: "New Comment",
        message: `${commentedByUser.username} commented on your screenshot "${screenshot.title}": "${truncatedComment}"`,
        fromUserId: commentedByUserId,
        screenshotId: screenshotId,
        actionUrl: `/@${screenshot.user.username}/screenshots/${screenshotId}?openComments=true${commentId ? `&highlightComment=${commentId}` : ''}`
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
      // Don't notify if user downloads their own clip
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
        actionUrl: `/clips/${clipId}`,
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
      // Don't notify if user shares their own clip
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
        actionUrl: `/clips/${clipId}`,
      };
      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating share notification:", error);
    }
  }

  // Create notification when someone shares your screenshot
  static async createScreenshotShareNotification(screenshotId: number, sharedByUserId: number | undefined) {
    try {
      const screenshot = await storage.getScreenshot(screenshotId);
      if (!screenshot) return;
      // Don't notify if user shares their own screenshot
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
        actionUrl: `/screenshots/${screenshotId}`,
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
      const clip = await storage.getClip(clipId);
      if (!clip) return;

      const notification: InsertNotification = {
        userId: ownerId,
        type: "milestone",
        title: "View Milestone",
        message: `Your clip "${clip.title}" hit ${milestone.toLocaleString()} views!`,
        clipId: clipId,
        actionUrl: `/clips/${clipId}`,
        metadata: { viewCount, milestone },
      };
      await createAndPush(notification);
    } catch (error) {
      console.error("Error creating view milestone notification:", error);
    }
  }
}