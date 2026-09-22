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
      // Software rasterising a 3D scene takes ten-odd seconds before the first
      // frame. That is the renderer being slow, not the page being broken.
      timeout: 60_000,
      use: { launchOptions: { args: SWIFTSHADER } },
    },
  ],
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev',
    url: 'http://localhost:3000',
    // Always own the server so tests cannot reuse a dev server with live credentials.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_ANALYTICS_TEST_MODE: '1',
      NEXT_PUBLIC_META_PIXEL_ID: 'test-pixel',
      NEXT_PUBLIC_MIXPANEL_TOKEN: '',
      DATABASE_URL: '',
      RESEND_API_KEY: '',
      SMTP_USER: '',
      SMTP_PASSWORD: '',
    },
  },
})
