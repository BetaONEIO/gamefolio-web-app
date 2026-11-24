import { useId } from "react";
import { Star } from "lucide-react";

const ratings = [1, 2, 3, 4, 5];

export function savedReviewRating(raw: unknown): number | undefined {
  let data = raw;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { return; }
  }
  const rating = (data as { rating?: unknown } | null)?.rating;
  return typeof rating === "number" && ratings.includes(rating) ? rating : undefined;
}

export function ReviewStarRating({ value, onChange, disabled }: {
  value?: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="text-sm font-semibold text-white">Rate the game</legend>
      <div className="flex flex-wrap items-center gap-x-2">
        {ratings.map(rating => (
          <label key={rating} className={disabled ? "" : "cursor-pointer"}>
            <input type="radio" name={name} value={rating} checked={value === rating}
              onChange={() => onChange(rating)} aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`}
              className="peer sr-only" />
            <span className={`flex h-11 w-11 items-center justify-center rounded-md peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#B9FF1A] ${rating <= (value ?? 0) ? "text-[#B9FF1A]" : "text-[#A8ADBA]"}`}>
              <Star size={26} aria-hidden="true" fill={rating <= (value ?? 0) ? "currentColor" : "none"} />
            </span>
          </label>
        ))}
        <span aria-hidden="true" className="text-sm text-[#D2D6E0]">{value == null ? "Choose 1–5 stars" : `${value} / 5`}</span>
      </div>
    </fieldset>
  );
}

export function SavedReviewStars({ content }: { content: unknown }) {
  const rating = savedReviewRating(content);
  if (rating == null) return null;
  return (
    <div className="flex items-center gap-1.5 text-[#B9FF1A]" role="img" aria-label={`${rating} out of 5 stars`}>
      {ratings.map(star => <Star key={star} size={16} fill={star <= rating ? "currentColor" : "none"} aria-hidden="true" />)}
      <span aria-hidden="true" className="ml-1 text-sm font-semibold">{rating} / 5</span>
    </div>
  );
}
