import assert from 'node:assert/strict';
import test from 'node:test';
import 'dotenv/config';
import { publicMediaStorage } from '../server/public-media-storage';
import { r2Storage } from '../server/r2-storage';
import { supabaseStorage } from '../server/supabase-storage';

test('public video uploads prefer R2 and R2 cleanup stays in R2', async () => {
  const originalEnv = { ...process.env };
  const originalR2Upload = r2Storage.uploadBuffer;
  const originalR2Delete = r2Storage.deleteFile;
  const originalSupabaseUpload = supabaseStorage.uploadBuffer;
  const originalSupabaseDelete = supabaseStorage.deleteFile;
  const calls: string[] = [];

  process.env.R2_ACCOUNT_ID = 'account';
  process.env.R2_ACCESS_KEY_ID = 'key';
  process.env.R2_SECRET_ACCESS_KEY = 'secret';
  process.env.R2_BUCKET = 'bucket';
  process.env.R2_PUBLIC_BASE_URL = 'https://media.gamefolio.com';

  r2Storage.uploadBuffer = async () => {
    calls.push('r2-upload');
    return { url: 'https://media.gamefolio.com/published/video.mp4', path: 'published/video.mp4' };
  };
  r2Storage.deleteFile = async () => { calls.push('r2-delete'); };
  supabaseStorage.uploadBuffer = async () => {
    calls.push('supabase-upload');
    return { url: 'https://example.supabase.co/video.mp4', path: 'video.mp4' };
  };
  supabaseStorage.deleteFile = async () => { calls.push('supabase-delete'); };

  try {
    const uploaded = await publicMediaStorage.uploadBuffer(
      Buffer.from('video'), 'video.mp4', 'video/mp4', 'video', 42,
    );
    await publicMediaStorage.deleteFile(uploaded.url, uploaded.path);
    assert.equal(uploaded.url, 'https://media.gamefolio.com/published/video.mp4');
    assert.deepEqual(calls, ['r2-upload', 'r2-delete']);
  } finally {
    process.env = originalEnv;
    r2Storage.uploadBuffer = originalR2Upload;
    r2Storage.deleteFile = originalR2Delete;
    supabaseStorage.uploadBuffer = originalSupabaseUpload;
    supabaseStorage.deleteFile = originalSupabaseDelete;
  }
});

test('cleanup routes legacy Supabase media back to Supabase', async () => {
  const originalDelete = supabaseStorage.deleteFile;
  let deletedPath = '';
  supabaseStorage.deleteFile = async (path: string) => { deletedPath = path; };
  try {
    await publicMediaStorage.deleteFile(
      'https://example.supabase.co/storage/v1/object/public/gamefolio-media/users/1/video.mp4',
      'users/1/video.mp4',
    );
    assert.equal(deletedPath, 'users/1/video.mp4');
  } finally {
    supabaseStorage.deleteFile = originalDelete;
  }
});

test('video uploads never fall back to Supabase when R2 fails', async () => {
  const originalEnv = { ...process.env };
  const originalR2Upload = r2Storage.uploadBuffer;
  const originalSupabaseUpload = supabaseStorage.uploadBuffer;
  let supabaseCalled = false;

  process.env.R2_ACCOUNT_ID = 'account';
  process.env.R2_ACCESS_KEY_ID = 'key';
  process.env.R2_SECRET_ACCESS_KEY = 'secret';
  process.env.R2_BUCKET = 'bucket';
  process.env.R2_PUBLIC_BASE_URL = 'https://media.gamefolio.com';
  r2Storage.uploadBuffer = async () => { throw new Error('R2 unavailable'); };
  supabaseStorage.uploadBuffer = async () => {
    supabaseCalled = true;
    return { url: 'https://example.supabase.co/video.mp4', path: 'video.mp4' };
  };

  try {
    await assert.rejects(
      publicMediaStorage.uploadBuffer(Buffer.from('video'), 'video.mp4', 'video/mp4', 'video', 42),
      /R2 unavailable/,
    );
    assert.equal(supabaseCalled, false);
  } finally {
    process.env = originalEnv;
    r2Storage.uploadBuffer = originalR2Upload;
    supabaseStorage.uploadBuffer = originalSupabaseUpload;
  }
});
