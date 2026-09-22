import type { FileChooser, Locator, Page } from "playwright";
import type { PublishRecord, PublishSettings } from "@/domain/publish";

/** A composer step that could not complete, usually because a site changed its page. */
export class ComposerError extends Error {}
export type Adapter = {
  cookieUrl: string; sessionCookies: string[]; readyMessage: string;
  startUrl(settings: PublishSettings): string;
  /** Attach files and fill text. Must never click the site's final Post/Share/Publish button. */
  prepare(page: Page, record: PublishRecord, hooks: { note(message: string): Promise<void> }): Promise<void>;
};
export async function find(page: Page, candidates: Locator[], timeout: number): Promise<Locator | null> {
  const deadline = Date.now() + timeout;
  do {
    for (const candidate of candidates) { const locator = candidate.first(); if (await locator.isVisible().catch(() => false)) return locator; }
    await page.waitForTimeout(400);
  } while (Date.now() < deadline);
  return null;
}
export async function first(page: Page, what: string, candidates: Locator[], timeout = 45_000) {
  const locator = await find(page, candidates, timeout);
  if (!locator) throw new ComposerError(`Could not find ${what}; the site layout may have changed.`);
  return locator;
}
/** Uses a file input when the page has one, otherwise clicks the trigger and fills the file chooser. */
export async function attach(page: Page, what: string, files: string[], inputs: Locator[], triggers: Locator[] = [], timeout = 60_000) {
  let chooser: FileChooser | undefined, clicked = false;
  const onChooser = (value: FileChooser) => { chooser = value; };
  page.on("filechooser", onChooser);
  try {
    const deadline = Date.now() + timeout;
    do {
      if (chooser) return await chooser.setFiles(files);
      for (const input of inputs) if (await input.first().count().catch(() => 0)) return await input.first().setInputFiles(files);
      if (!clicked) for (const trigger of triggers) if (await trigger.first().isVisible().catch(() => false)) { clicked = true; await trigger.first().click(); break; }
      await page.waitForTimeout(400);
    } while (Date.now() < deadline);
  } finally { page.off("filechooser", onChooser); }
  throw new ComposerError(`Could not attach files through ${what}; the site layout may have changed.`);
}
/** Types text into rich editors. Line breaks use Shift+Enter; never send Ctrl/Cmd+Enter, which publishes on X and LinkedIn. */
export async function typeInto(page: Page, field: Locator, text: string, replace = false) {
  await field.click();
  if (replace) { await page.keyboard.press("ControlOrMeta+A"); await page.keyboard.press("Backspace"); }
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    if (index) await page.keyboard.press("Shift+Enter");
    if (lines[index]) await page.keyboard.insertText(lines[index]);
  }
}
