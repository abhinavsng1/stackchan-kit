import { defineConfig } from '@playwright/test'

/**
 * Software WebGL is expensive. Running it in every worker starved the CPU and
 * made unrelated specs time out, so only the 3D specs get SwiftShader; the rest
 * run without it and exercise the SVG fallback, which is a real code path too.
 */
const SWIFTSHADER = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 4,
  expect: { timeout: 10_000 },
  // Compiles every route before the first assertion runs. See the file.
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: 'http://localhost:3000' },
  projects: [
    {
      name: 'app',
      testIgnore: /hero3d\.spec\.ts/,
    },
    {
      name: 'webgl',
      testMatch: /hero3d\.spec\.ts/,
      workers: 1,
      use: { launchOptions: { args: SWIFTSHADER } },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
