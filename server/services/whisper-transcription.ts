import fs from 'fs/promises';
import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
// wavefile's UMD build sets `exports.WaveFile` dynamically inside a wrapper
// function rather than as a static top-level assignment, so Node's CJS/ESM
// interop (cjs-module-lexer) can't detect it as a named export — import the
// default and destructure instead.
import wavefilePkg from 'wavefile';
const { WaveFile } = wavefilePkg;

export interface TranscriptSegment {
  start: number; // seconds
  end: number;   // seconds
  text: string;
}

// Local, open-source speech-to-text — no external API/vendor key. Runs
// Whisper as an ONNX model via onnxruntime-node. The pipeline is expensive to
// initialize (downloads/loads model weights), so it's created once per
// process and reused across jobs.
let asrPipelinePromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

function getAsrPipeline(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (!asrPipelinePromise) {
    const model = process.env.AI_VOD_WHISPER_MODEL || 'Xenova/whisper-base.en';
    console.log(`Loading local Whisper model (${model})...`);
    asrPipelinePromise = pipeline('automatic-speech-recognition', model) as Promise<AutomaticSpeechRecognitionPipeline>;
  }
  return asrPipelinePromise;
}

/**
 * Decode a WAV file into a mono Float32Array of PCM samples. The pipeline
 * can't load audio from a path/URL in Node (no AudioContext there — that's
 * a browser API), so raw sample data has to be handed to it directly. See
 * https://huggingface.co/docs/transformers.js/guides/node-audio-processing
 */
async function decodeWavToFloat32(audioPath: string): Promise<Float32Array> {
  const buffer = await fs.readFile(audioPath);
  const wav = new WaveFile(buffer);
  wav.toBitDepth('32f');
  wav.toSampleRate(16000);
  let samples = wav.getSamples() as Float32Array | Float32Array[];
  if (Array.isArray(samples)) {
    samples = samples[0]; // multi-channel: just use the first channel
  }
  return samples as Float32Array;
}

/**
 * Transcribe a 16kHz mono WAV file (produced by VideoProcessor.extractAudioTrack)
 * into timestamped segments. Uses the pipeline's built-in long-form chunking
 * so multi-minute audio doesn't need to be split by the caller.
 */
export async function transcribeAudioFile(audioPath: string): Promise<TranscriptSegment[]> {
  const asr = await getAsrPipeline();
  const audioData = await decodeWavToFloat32(audioPath);

  const result: any = await asr(audioData, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true,
  });

  const chunks: any[] = result?.chunks || [];
  return chunks
    .filter((c) => Array.isArray(c.timestamp) && c.timestamp[0] != null && c.timestamp[1] != null)
    .map((c): TranscriptSegment => ({
      start: c.timestamp[0],
      end: c.timestamp[1],
      text: (c.text || '').trim(),
    }))
    .filter((s) => s.text.length > 0);
}
