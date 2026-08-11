---
name: FFmpeg scale2ref fails with remote URL inputs
description: scale2ref filter produces 0kB output when either input is a remote (Supabase signed) URL; use explicit scale with pre-probed dimensions instead.
---

# FFmpeg remote URL + complexFilter: scale2ref fails

## The rule
Never use `scale2ref` when inputs are remote URLs (Supabase signed URLs, HTTPS). It produces `frame=0 fps=0 Lsize=0kB` and exits with code 234 because FFmpeg cannot pre-seek the remote stream to determine reference dimensions.

## Why
`scale2ref` needs to read the reference stream's W×H before the filter graph starts encoding. With seekable local files this works. With remote HTTP streams it fails silently — the filter graph initialises but produces zero output.

## How to apply
When concating a watermarked clip (remote URL) with an outro (remote URL):
1. Run `ffprobe` on the clip first to get W and H.
2. Build an explicit scale filter for the outro:
   `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=fps=30`
3. Apply `setsar=1,fps=fps=30` on the clip stream too before concat.
4. Use normal concat: `[clip_n][audio_n][outro_n][outro_audio_n]concat=n=2:v=1:a=1`.
