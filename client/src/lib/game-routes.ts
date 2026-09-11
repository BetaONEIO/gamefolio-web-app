export function toGameSlug(name: string | null | undefined) {
  return (name || "untitled-game")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "untitled-game";
}

export function publicGamePath(name: string | null | undefined) {
  return `/games/${encodeURIComponent(toGameSlug(name))}`;
}