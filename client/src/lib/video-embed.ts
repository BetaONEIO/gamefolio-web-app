// Converts a YouTube watch/shorts/youtu.be URL into an embeddable iframe URL.
// Returns null for anything else (direct video files, HLS manifests, Vimeo,
// etc.) — those play through a <video>/HlsVideo element instead of an iframe.
export function getVideoEmbedUrl(url: string): string | null {
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  return null;
}
