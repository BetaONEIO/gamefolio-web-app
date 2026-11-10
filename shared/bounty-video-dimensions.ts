export function bountyVideoDimensionError(type: "clip" | "reel", width: number, height: number): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "Couldn’t read the video dimensions. Choose another video.";
  }

  if (type === "reel" ? height > width : width > height) return null;

  const dimensions = `${Math.round(width)} × ${Math.round(height)}`;
  if (width === height) {
    return `This video is square (${dimensions}). Choose a ${type === "reel" ? "vertical video for a Reel" : "horizontal video for a Gameplay Clip"}.`;
  }
  return type === "reel"
    ? `This video is horizontal (${dimensions}). Choose a vertical video for a Reel, or use this one for a Gameplay Clip.`
    : `This video is vertical (${dimensions}). Choose a horizontal video for a Gameplay Clip, or use this one for a Reel.`;
}

// ffprobe reports coded dimensions. Correct for non-square pixels and phone
// rotation metadata before comparing with the browser's display dimensions.
export function videoDisplayDimensions(width: number, height: number, sampleAspectRatio?: string, rotation = 0) {
  const [sampleWidth, sampleHeight] = (sampleAspectRatio ?? "").split(":").map(Number);
  const displayWidth = sampleWidth > 0 && sampleHeight > 0 ? width * sampleWidth / sampleHeight : width;
  const quarterTurns = Math.round(rotation / 90);
  return Math.abs(quarterTurns % 2) === 1
    ? { width: height, height: displayWidth }
    : { width: displayWidth, height };
}
