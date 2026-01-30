import { defineConfig } from 'tsup';

// Common configuration
const commonConfig = {
  entry: {
    index: 'src/index.ts',
    'llm/index': 'src/llm/index.ts',
    'skills/index': 'src/skills/index.ts',
    'tools/index': 'src/tools/index.ts',
    'mcp/index': 'src/mcp/index.ts',
    'storage/index': 'src/storage/index.ts',
  },
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  outDir: 'dist',
} as const;

// Browser build configuration
export const browserConfig = defineConfig({
  ...commonConfig,
  format: ['esm'],
  platform: 'browser',
  outDir: 'dist/browser',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  external: [
    // Mark Node.js built-ins as external for browser
    'fs/promises',
    'path',
    'child_process',
    'util',
    'node:vm',
  ],
});

// Node.js build configuration
export const nodeConfig = defineConfig({
  ...commonConfig,
  format: ['cjs', 'esm'],
  platform: 'node',
  outDir: 'dist/node',
  external: [
    // External dependencies that shouldn't be bundled
    'zod',
  ],
});

// Default export - builds both
export default defineConfig([
  browserConfig,
  nodeConfig,
]);
