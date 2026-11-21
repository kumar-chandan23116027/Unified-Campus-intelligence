import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("frontend exposes primary pages and API loading hooks", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /id="page-home"/);
  assert.match(html, /id="page-sources"/);
  assert.match(html, /id="page-assistant"/);
  assert.match(html, /id="page-admin"/);

  const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(app, /\/api\/dashboard/);
  assert.match(app, /\/api\/assistant/);
  assert.match(app, /createAdminRecord/);
});
