import { attach, find, first, typeInto, type Adapter } from "../composer";

// Instagram web create flow. Selectors live here so an Instagram redesign is a one-file fix.
export const instagram: Adapter = {
  cookieUrl: "https://www.instagram.com", sessionCookies: ["sessionid"],
  readyMessage: "Check the account is StatOz, review the Instagram post, then click Share in the posting window.",
  startUrl: () => "https://www.instagram.com/",
  async prepare(page, record, { note }) {
    await (await first(page, "Instagram's Create button", [page.getByRole("link", { name: /new post|create/i }), page.getByRole("button", { name: /new post|create/i })], 60_000)).click();
    // Newer layouts open a small Post / AI menu after Create.
    const postItem = await find(page, [page.getByRole("link", { name: /^post$/i }), page.getByRole("menuitem", { name: /^post$/i })], 4_000);
    if (postItem) await postItem.click();
    await attach(page, "Instagram's file picker", record.files, [page.locator("div[role=dialog] input[type=file]")], [page.getByRole("button", { name: /select from computer/i })]);
    await note("Adjust the crop in the posting window and click Next until the caption step. The caption fills in automatically.");
    const caption = await first(page, "Instagram's caption field", [page.getByRole("textbox", { name: /write a caption/i }), page.locator("div[aria-label^='Write a caption'][contenteditable=true]")], 15 * 60_000);
    await typeInto(page, caption, record.caption);
  },
};
