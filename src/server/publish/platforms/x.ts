import { attach, first, typeInto, type Adapter } from "../composer";

// X web composer. Selectors live here so an X redesign is a one-file fix.
export const x: Adapter = {
  cookieUrl: "https://x.com", sessionCookies: ["auth_token"],
  readyMessage: "Check the account is StatOz, wait for media to finish uploading, then click Post in the posting window.",
  startUrl: () => "https://x.com/compose/post",
  async prepare(page, record) {
    const editor = () => [page.locator("[data-testid='tweetTextarea_0']"), page.getByRole("textbox", { name: /post text/i })];
    await first(page, "X's post editor", editor(), 60_000);
    await attach(page, "X's media button", record.files, [page.locator("input[data-testid='fileInput']")], [page.getByRole("button", { name: /add photos or video/i })]);
    await typeInto(page, await first(page, "X's post editor", editor()), record.caption);
  },
};
