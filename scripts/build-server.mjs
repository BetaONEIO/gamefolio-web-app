import { build } from 'esbuild';
import { serverBuildOptions } from './server-build-options.mjs';
await build({ ...serverBuildOptions(), logLevel: 'info' });

// The export renderer shares the profile stylesheet in source and built deployments.
const { mkdir, copyFile } = await import('node:fs/promises');
await mkdir('dist/creative-studio', { recursive: true });
await copyFile('client/src/styles/profile-themes.css', 'dist/creative-studio/profile-themes.css');
