import { attach, first, typeInto, type Adapter } from "../composer";

// YouTube Studio upload dialog. Selectors live here so a Studio redesign is a one-file fix.
export const youtube: Adapter = {
  cookieUrl: "https://www.youtube.com", sessionCookies: ["SAPISID", "__Secure-3PAPISID"],
  readyMessage: "Finish in YouTube Studio: confirm the StatOz channel, choose the audience and visibility, then Publish.",
  startUrl: () => "https://www.youtube.com/upload",
  async prepare(page, record, { note }) {
    await attach(page, "YouTube's upload picker", record.files, [page.locator("ytcp-uploads-file-picker input[type=file]"), page.locator("input[type=file][name=Filedata]")], [page.getByRole("button", { name: /select files/i })], 90_000);
    await note("Uploading to YouTube Studio…");
    const title = await first(page, "YouTube's title field", [page.locator("#title-textarea #textbox"), page.getByRole("textbox", { name: /add a title/i })], 120_000);
    await typeInto(page, title, (record.title || record.projectName).replace(/\s+/g, " ").trim(), true);
    const description = await first(page, "YouTube's description field", [page.locator("#description-textarea #textbox"), page.getByRole("textbox", { name: /tell viewers/i })]);
    await typeInto(page, description, record.caption, true);
  },
};
