import Anthropic from '@anthropic-ai/sdk';
import type { TranscriptSegment } from './whisper-transcription';

export interface HighlightCandidate {
  title: string;
  reasoning: string;
  startTime: number; // seconds into the source VOD
  endTime: number;
  confidence: number; // 0-1
}

const WINDOW_SECONDS = 9 * 60;
const WINDOW_OVERLAP_SECONDS = 30;
const MIN_CLIP_SECONDS = 8;
const MAX_CLIP_SECONDS = 90;
const MAX_CANDIDATES_PER_WINDOW = 4;
const MIN_CANDIDATES_PER_WINDOW = 1;
const MAX_TOTAL_CANDIDATES = 10;
const DEDUPE_OVERLAP_THRESHOLD = 0.5;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HIGHLIGHT_TOOL: Anthropic.Tool = {
  name: 'report_highlights',
  description: 'Report candidate clip-worthy moments found in this transcript window. Always report at least one, even if nothing is an obvious standout — pick the most interesting, funniest, or most noteworthy moment available and reflect your uncertainty in its confidence score rather than omitting it.',
  input_schema: {
    type: 'object',
    properties: {
      candidates: {
        type: 'array',
        minItems: MIN_CANDIDATES_PER_WINDOW,
        maxItems: MAX_CANDIDATES_PER_WINDOW,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short, catchy clip title (max ~60 chars)' },
            reasoning: { type: 'string', description: 'One or two sentences on why this moment is clip-worthy' },
            startTime: { type: 'number', description: 'Start timestamp in seconds, from the [start,end] markers in the transcript' },
            endTime: { type: 'number', description: 'End timestamp in seconds' },
            confidence: { type: 'number', description: '0 to 1 — how exciting/funny/impressive this moment genuinely is. Low (e.g. 0.2-0.4) is fine for a "best available" pick from a quiet stretch; reserve high scores for real standouts.' },
          },
          required: ['title', 'reasoning', 'startTime', 'endTime', 'confidence'],
        },
      },
    },
    required: ['candidates'],
  },
};

function formatWindowTranscript(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`)
    .join('\n');
}

function buildWindows(segments: TranscriptSegment[]): TranscriptSegment[][] {
  if (segments.length === 0) return [];
  const lastEnd = segments[segments.length - 1].end;
  const windows: TranscriptSegment[][] = [];

  for (let windowStart = 0; windowStart < lastEnd; windowStart += WINDOW_SECONDS) {
    const windowEnd = windowStart + WINDOW_SECONDS + WINDOW_OVERLAP_SECONDS;
    const inWindow = segments.filter((s) => s.start >= windowStart && s.start < windowEnd);
    if (inWindow.length > 0) windows.push(inWindow);
  }
  return windows;
}

async function analyzeWindow(segments: TranscriptSegment[]): Promise<HighlightCandidate[]> {
  const windowStart = segments[0].start;
  const windowEnd = segments[segments.length - 1].end;
  const transcript = formatWindowTranscript(segments);

  const model = process.env.AI_VOD_CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      tools: [HIGHLIGHT_TOOL],
      tool_choice: { type: 'tool', name: 'report_highlights' },
      messages: [
        {
          role: 'user',
          content: `Here is a timestamped transcript segment (${windowStart.toFixed(0)}s-${windowEnd.toFixed(0)}s) from a gaming livestream VOD. Identify up to ${MAX_CANDIDATES_PER_WINDOW} moments that would make engaging short clips — big plays, funny reactions, surprising turns, hype moments, interesting commentary, or memorable banter. This window won't always contain a big standout moment — that's fine, streams have quiet stretches. In that case, still pick the ${MIN_CANDIDATES_PER_WINDOW}-2 most interesting or shareable moments available (even just a good line or an amusing exchange) and score them with lower confidence rather than reporting nothing. Only report zero if the entire window is truly empty of speech content. Use ONLY timestamps that appear in the transcript below.\n\n${transcript}`,
        },
      ],
    });
  } catch (error) {
    console.error('Claude highlight analysis failed for window:', error);
    return [];
  }

  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use');
  const rawCandidates: any[] = (toolUse?.input as any)?.candidates || [];

  const kept = rawCandidates.filter((c) => {
    if (typeof c.startTime !== 'number' || typeof c.endTime !== 'number') {
      console.log(`ai-highlight-detector: dropped candidate — non-numeric timestamps`, c);
      return false;
    }
    if (c.endTime <= c.startTime) {
      console.log(`ai-highlight-detector: dropped candidate "${c.title}" — endTime <= startTime (${c.startTime}-${c.endTime})`);
      return false;
    }
    if (c.startTime < windowStart - WINDOW_OVERLAP_SECONDS || c.endTime > windowEnd + WINDOW_OVERLAP_SECONDS) {
      console.log(`ai-highlight-detector: dropped candidate "${c.title}" — outside window bounds (${c.startTime}-${c.endTime}, window ${windowStart}-${windowEnd})`);
      return false;
    }
    const duration = c.endTime - c.startTime;
    if (duration < MIN_CLIP_SECONDS || duration > MAX_CLIP_SECONDS) {
      console.log(`ai-highlight-detector: dropped candidate "${c.title}" — duration ${duration.toFixed(1)}s outside [${MIN_CLIP_SECONDS},${MAX_CLIP_SECONDS}]`);
      return false;
    }
    return true;
  });

  console.log(`ai-highlight-detector: window ${windowStart.toFixed(0)}-${windowEnd.toFixed(0)}s — Claude proposed ${rawCandidates.length}, ${kept.length} passed filters`);

  return kept.map((c): HighlightCandidate => ({
    title: String(c.title).slice(0, 100),
    reasoning: String(c.reasoning || '').slice(0, 500),
    startTime: c.startTime,
    endTime: c.endTime,
    confidence: Math.max(0, Math.min(1, Number(c.confidence) || 0)),
  }));
}

function overlapFraction(a: HighlightCandidate, b: HighlightCandidate): number {
  const overlapStart = Math.max(a.startTime, b.startTime);
  const overlapEnd = Math.min(a.endTime, b.endTime);
  const overlap = Math.max(0, overlapEnd - overlapStart);
  const shorterDuration = Math.min(a.endTime - a.startTime, b.endTime - b.startTime);
  return shorterDuration > 0 ? overlap / shorterDuration : 0;
}

function dedupeAndRank(candidates: HighlightCandidate[]): HighlightCandidate[] {
  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);
  const kept: HighlightCandidate[] = [];

  for (const candidate of sorted) {
    const overlapsKept = kept.some((k) => overlapFraction(candidate, k) > DEDUPE_OVERLAP_THRESHOLD);
    if (!overlapsKept) kept.push(candidate);
    if (kept.length >= MAX_TOTAL_CANDIDATES) break;
  }
  return kept;
}

/**
 * Given a full transcript, window it, ask Claude to identify highlight-worthy
 * moments per window, then pool/dedupe/rank across all windows down to the
 * top candidates.
 */
export async function detectHighlights(segments: TranscriptSegment[]): Promise<HighlightCandidate[]> {
  const windows = buildWindows(segments);
  console.log(`ai-highlight-detector: ${segments.length} transcript segments → ${windows.length} window(s)`);

  const perWindowResults = await Promise.all(windows.map(analyzeWindow));
  const pooled = perWindowResults.flat();
  const kept = dedupeAndRank(pooled);
  console.log(`ai-highlight-detector: ${pooled.length} candidates pooled across windows → ${kept.length} kept after dedupe/rank`);
  return kept;
}
