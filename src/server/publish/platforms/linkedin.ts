import type { Page } from "playwright";
import { attach, ComposerError, find, first, typeInto, type Adapter } from "../composer";

// LinkedIn company-page composer. Selectors live here so a LinkedIn redesign is a one-file fix.
const editor = (page: Page) => [page.getByRole("textbox", { name: /text editor|talk about/i }), page.locator("div.ql-editor[contenteditable=true]")];

export const linkedin: Adapter = {
  cookieUrl: "https://www.linkedin.com", sessionCookies: ["li_at"],
  readyMessage: "Check that LinkedIn shows the StatOz page as the author, then click Post in the posting window.",
  startUrl(settings) {
    if (!settings.linkedinCompanyId) throw new ComposerError("Add the StatOz LinkedIn company ID in Assets & brand → Social accounts.");
    return `https://www.linkedin.com/company/${encodeURIComponent(settings.linkedinCompanyId)}/admin/page-posts/published/?share=true`;
  },
  async prepare(page, record, { note }) {
    if (!(await find(page, editor(page), 20_000))) await (await first(page, "LinkedIn's Start a post button", [page.getByRole("button", { name: /start a post/i })])).click();
    await first(page, "LinkedIn's post editor", editor(page));
    await attach(page, "LinkedIn's media button", record.files, [page.locator("input[type=file][id*='media']")], [page.getByRole("button", { name: /add (a )?(media|photo|video)/i })]);
    await note("Uploading media to LinkedIn…");
    const next = await find(page, [page.getByRole("button", { name: /^next$/i })], 30_000);
    if (next) await next.click({ timeout: 180_000 });
    await typeInto(page, await first(page, "LinkedIn's post editor", editor(page), 180_000), record.caption);
  },
};
