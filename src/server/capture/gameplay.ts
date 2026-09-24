/**
 * Drives the unchanged Pitch Duel (`card_game`) web build to live gameplay and
 * captures each game at the catalog's 393 × 852 viewport.
 *
 * The checkout is READ ONLY: this module serves `build/web` as it is and never builds,
 * writes, or edits anything there. CanvasKit requests to the Flutter CDN are answered
 * from the build's own `canvaskit` folder, so a capture runs offline.
 */
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Browser, Page } from "playwright";
import type { Recipe } from "./gameplay-recipes";

export const VIEWPORT = { width: 393, height: 852 };

const mime: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
  ".wasm": "application/wasm", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ttf": "font/ttf", ".otf": "font/otf", ".woff": "font/woff", ".woff2": "font/woff2",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".bin": "application/octet-stream", ".frag": "application/octet-stream",
};

export const webRoot = (cardGame: string) => path.join(cardGame, "build", "web");

/** Fails early with a readable message when there is no web build to drive. */
export async function checkGameplaySource(cardGame: string) {
  const index = path.join(webRoot(cardGame), "index.html");
  if (!await fs.stat(index).then(s => s.isFile()).catch(() => false))
    throw new Error(`No web build at ${index}. Build card_game for the web in that checkout first; this script never builds it.`);
}

/** A short build fingerprint for provenance: the build id and its date. */
export async function buildFingerprint(cardGame: string) {
  const root = webRoot(cardGame);
  const id = (await fs.readFile(path.join(root, ".last_build_id"), "utf8").catch(() => "unknown")).trim().slice(0, 12);
  const built = await fs.stat(path.join(root, "main.dart.js")).then(s => s.mtime.toISOString().slice(0, 10)).catch(() => "unknown date");
  return `build ${id}, ${built}`;
}

/** Serves the build folder read only on a random loopback port. */
export async function serveBuild(cardGame: string) {
  const root = path.resolve(webRoot(cardGame));
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const file = path.resolve(root, `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`);
    if (!file.startsWith(root + path.sep) && file !== root) { response.writeHead(403).end(); return; }
    try {
      const body = await fs.readFile(file);
      response.writeHead(200, { "content-type": mime[path.extname(file).toLowerCase()] ?? "application/octet-stream", "cache-control": "no-store" }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/`, close: () => new Promise<void>(resolve => server.close(() => resolve())) };
}

/** A fresh page with clean storage, the catalog viewport, and CanvasKit served locally. */
export async function openApp(browser: Browser, cardGame: string, url: string): Promise<Page> {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, serviceWorkers: "block", hasTouch: false });
  const canvaskit = path.join(webRoot(cardGame), "canvaskit");
  await context.route("https://www.gstatic.com/flutter-canvaskit/**", async route => {
    // …/flutter-canvaskit/<engine revision>/<file> → build/web/canvaskit/<file>
    const rest = new URL(route.request().url()).pathname.split("/").slice(3).join("/");
    const file = path.join(canvaskit, rest);
    try { await route.fulfill({ body: await fs.readFile(file), contentType: mime[path.extname(file)] ?? "application/octet-stream" }); }
    catch { await route.abort(); }
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector("flt-glass-pane, flutter-view", { timeout: 60_000 });
  return page;
}

/** Turns on Flutter's semantics tree so controls can be found by their labels. */
export async function enableSemantics(page: Page) {
  const placeholder = page.locator("flt-semantics-placeholder");
  if (await placeholder.count()) await placeholder.evaluate(element => (element as HTMLElement).click());
  await page.waitForTimeout(400);
}

/** Every labelled semantics node currently on screen, for building and debugging recipes. */
export async function visibleLabels(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll("flt-semantics")].map(node => {
    const box = node.getBoundingClientRect();
    const label = (node.getAttribute("aria-label") ?? node.textContent ?? "").trim().replace(/\s+/g, " ");
    return { label, role: node.getAttribute("role") ?? "", x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2), w: Math.round(box.width), h: Math.round(box.height) };
  }).filter(node => node.label && node.w > 0 && node.h > 0 && node.x >= 0 && node.y >= 0 && node.x <= 393 && node.y <= 852));
}

/**
 * Clicks the best labelled semantics node for `text` (case-insensitive): an exact label,
 * then a label starting with it, then one containing it; buttons and smaller nodes first.
 * Flutter web routes taps on its accessibility tree through DOM clicks, not raw pointers.
 */
export async function tapLabel(page: Page, text: string) {
  return page.evaluate(wanted => {
    const needle = wanted.toLowerCase().replace(/s+/g, " ").trim();
    const matches = [...document.querySelectorAll("flt-semantics")].filter(node => {
      const label = (node.getAttribute("aria-label") ?? node.textContent ?? "").toLowerCase().replace(/s+/g, " ");
      const box = node.getBoundingClientRect();
      return label.includes(needle) && box.width > 0 && box.height > 0 && box.height < 700;
    }).map(node => {
      // Runs in the page: no named inner functions, which the bundler would wrap in a helper.
      const box = node.getBoundingClientRect();
      const label = (node.getAttribute("aria-label") ?? node.textContent ?? "").toLowerCase().replace(/s+/g, " ").trim();
      const exact = label === needle ? 0 : label.startsWith(needle) ? 1 : 2;
      const clickable = node.getAttribute("role") === "button" || node.hasAttribute("flt-tappable") ? 0 : 1;
      return { node, rank: exact * 2 + clickable, area: box.width * box.height };
    }).sort((a, b) => a.rank - b.rank || a.area - b.area).map(entry => entry.node);
    const target = matches[0] as HTMLElement | undefined;
    target?.click();
    return Boolean(target);
  }, text);
}

/** Waits for the app to settle after navigation, then refreshes the semantics tree. */
export async function settle(page: Page, ms = 1500) {
  await page.waitForTimeout(ms);
  await enableSemantics(page);
}

/**
 * Finishes the app's own local preview onboarding: the Google button only continues
 * locally and never signs in or stores an email. Skips avatar and banner, keeps
 * football as home sport, finishes, and dismisses the welcome bonus overlay.
 */
export async function onboard(page: Page) {
  await settle(page, 6000);
  const steps = ["SIGN IN WITH GOOGLE", "SKIP", "SKIP", "SKIP", "FINISH SETUP"];
  for (const step of steps) {
    if (!await tapLabel(page, step)) throw new Error(`Onboarding stopped before "${step}".`);
    await settle(page, step === "FINISH SETUP" ? 5000 : 1500);
  }
  await page.mouse.click(197, 815); // Welcome bonus: TAP TO CONTINUE (drawn without semantics).
  await settle(page, 2500);
}

/**
 * Opens every game the way card_game treats profiles that finished onboarding before
 * unlocks shipped: with no stored unlock progress, the app grandfathers the profile.
 * Only this browser context's storage changes; the checkout is never touched.
 */
export async function unlockAll(page: Page) {
  await page.evaluate(() => localStorage.removeItem("FlutterSecureStorage.pd_unlock_progress_v1"));
  await page.reload({ waitUntil: "load" });
  await settle(page, 7000);
}

/** Polls until a control with `text` appears, then taps it. Returns false on timeout. */
export async function tapWhen(page: Page, text: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  await enableSemantics(page);
  while (Date.now() < deadline) {
    if (await tapLabel(page, text)) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

/**
 * Plays one recipe from the home screen. Each `capture` step hands the viewport PNG
 * to `save`. Throws with the step that failed, so the caller can keep the last frame.
 */
export async function runRecipe(page: Page, recipe: Recipe, save: (assetId: string, png: Buffer) => Promise<void>) {
  for (const [index, step] of recipe.steps.entries()) {
    const where = `${recipe.name} step ${index + 1}`;
    if ("tap" in step) {
      if (!await tapLabel(page, step.tap)) throw new Error(`${where}: no control labelled "${step.tap}".`);
      await settle(page, 1500);
    } else if ("when" in step) {
      if (!await tapWhen(page, step.when, step.timeoutMs)) throw new Error(`${where}: "${step.when}" never appeared.`);
      await settle(page, 1500);
    } else if ("maybe" in step) {
      if (await tapWhen(page, step.maybe, step.timeoutMs)) await settle(page, 1500);
    } else if ("xy" in step) {
      await page.mouse.click(...step.xy);
      await settle(page, 1500);
    } else if ("press" in step) {
      await page.mouse.move(...step.press);
      await page.mouse.down();
    } else if ("release" in step) {
      await page.mouse.up();
    } else if ("settle" in step) {
      await settle(page, step.settle);
    } else if ("sleep" in step) {
      await page.waitForTimeout(step.sleep);
    } else if ("scroll" in step) {
      await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
      await page.mouse.wheel(0, step.scroll);
      await settle(page, 1200);
    } else {
      await save(step.capture, await page.screenshot({ type: "png" }));
    }
  }
}
