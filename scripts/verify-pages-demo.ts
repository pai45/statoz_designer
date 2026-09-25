import assert from "node:assert/strict";
import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const outputRoot = path.resolve("pages-site/out");
const screenshotRoot = path.resolve("test-results/pages-demo");
await fs.mkdir(screenshotRoot, { recursive: true });
const mime: Record<string, string> = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
    const relative = pathname.replace(/^\/statoz_designer\/?/, "") || "index.html";
    const target = path.resolve(outputRoot, relative.endsWith("/") ? `${relative}index.html` : relative);
    if (!target.startsWith(outputRoot + path.sep)) throw new Error("Invalid path");
    const body = await fs.readFile(target);
    response.writeHead(200, { "content-type": mime[path.extname(target)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404); response.end("Not found");
  }
});
await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const address = server.address();
if (!address || typeof address === "string") throw new Error("Static demo server did not bind.");
const base = `http://127.0.0.1:${address.port}/statoz_designer/`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors: string[] = [], forbiddenRequests: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname.includes("/api/") || url.port === "3000") forbiddenRequests.push(request.url());
  });
  await page.goto(base);
  await page.getByRole("heading", { name: "Explore every Studio template." }).waitFor();
  assert.ok(await page.locator(".demo-template-card").count() >= 15);
  assert.deepEqual(forbiddenRequests, [], "ordinary demo browsing must not contact the companion API");
  await page.locator(".demo-template-card").first().click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "Close preview" }).click();
  await page.screenshot({ path: path.join(screenshotRoot, "templates-desktop.png"), fullPage: true });

  await page.getByRole("button", { name: "Video demos", exact: true }).click();
  await page.getByRole("heading", { name: "Play the compositions, frame by frame." }).waitFor();
  const scrubber = page.getByRole("slider", { name: "Video time" });
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(350);
  assert.ok(Number(await scrubber.inputValue()) > 0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await scrubber.fill("4");
  assert.ok(Math.abs(Number(await scrubber.inputValue()) - 4) < .1);
  await page.locator(".demo-scene-list button").nth(1).click();
  await page.screenshot({ path: path.join(screenshotRoot, "video-desktop.png"), fullPage: true });

  await page.getByRole("button", { name: "Assets & brand", exact: true }).click();
  assert.equal(await page.locator(".demo-asset-card").count(), 3);
  await page.getByRole("tab", { name: "Brand guide", exact: true }).click();
  assert.equal(await page.getByRole("tablist", { name: "Brand reference" }).getByRole("tab").count(), 10);
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await page.locator(".guide-swatch").first().waitFor();

  await page.getByRole("button", { name: "Pitch deck", exact: true }).click();
  await page.getByRole("heading", { name: "The complete 12-slide StatOz deck." }).waitFor();
  assert.equal(await page.locator(".demo-pitch-strip>button").count(), 12);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("SLIDE 02 / 12", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(screenshotRoot, "pitch-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 412, height: 900 });
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "demo scrolls horizontally on mobile");
  await page.screenshot({ path: path.join(screenshotRoot, "templates-mobile.png"), fullPage: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(forbiddenRequests, []);
  console.log("PASS read-only Pages demo, shared previews, video controls, assets, brand guide, 12-slide deck, and mobile width");
} finally {
  await browser.close();
  await new Promise<void>(resolve => server.close(() => resolve()));
}
