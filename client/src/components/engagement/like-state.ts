export type LikeContentType = "clip" | "screenshot";

export type LikeTarget = {
  contentId: number;
  contentType: LikeContentType;
};

export function sameLikeTarget(left: LikeTarget, right: LikeTarget): boolean {
  return left.contentId === right.contentId && left.contentType === right.contentType;
}

export function toggledLikeCount(wasLiked: boolean, count: number): number {
  const safeCount = Number.isFinite(count) ? count : 0;
  return wasLiked ? Math.max(0, safeCount - 1) : safeCount + 1;
}

/**
 * Viewers keep a single LikeButton and swap its content id while a request
 * is in flight. The confirmation belongs to the item that was tapped.
 */
export function shouldApplyLikeResult(current: LikeTarget, toggled: LikeTarget): boolean {
  return sameLikeTarget(current, toggled);
}

/**
 * A status payload can describe a different item, or this item from a request
 * that started before the tap. Neither should overwrite the optimistic heart.
 */
export function shouldApplyLikeStatus(options: {
  current: LikeTarget;
  reportedFor: LikeTarget;
  toggleInFlightFor: LikeTarget | null;
}): boolean {
  if (!sameLikeTarget(options.current, options.reportedFor)) return false;
  if (
    options.toggleInFlightFor &&
    sameLikeTarget(options.current, options.toggleInFlightFor)
  ) {
    return false;
  }
  return true;
}
