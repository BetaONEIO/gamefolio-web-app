// Store to keep track of clip playback positions
// This is a simple global state that persists between page navigations

// Initialize the global store
if (!window.__CLIP_PLAYBACK_TIMES) {
  window.__CLIP_PLAYBACK_TIMES = {};
}

// Type for the store
declare global {
  interface Window {
    __CLIP_PLAYBACK_TIMES: Record<number, number>;
  }
}

/**
 * Get the stored playback time for a clip
 */
export function getClipPlaybackTime(clipId: number): number {
  return window.__CLIP_PLAYBACK_TIMES[clipId] || 0;
}

/**
 * Save the playback time for a clip
 */
export function saveClipPlaybackTime(clipId: number, time: number): void {
  window.__CLIP_PLAYBACK_TIMES[clipId] = time;
}

/**
 * Clear the playback time for a clip
 */
export function clearClipPlaybackTime(clipId: number): void {
  delete window.__CLIP_PLAYBACK_TIMES[clipId];
}

/**
 * Clear all stored playback times
 */
export function clearAllPlaybackTimes(): void {
  window.__CLIP_PLAYBACK_TIMES = {};
}

// Export the global store object for direct access if needed
export const clipPlaybackTimes = window.__CLIP_PLAYBACK_TIMES;