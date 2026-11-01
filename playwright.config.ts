import { defineConfig, devices } from "@playwright/test";

// Tests run against a production build (so the reviews rule behaves as it does live).
// The booking API is mocked inside the tests, so no real bookings are created.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
