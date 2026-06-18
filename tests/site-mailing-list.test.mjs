import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("homepage renders the mailing-list include", async () => {
  const index = await read("index.html");

  assert.match(index, /include mailing-list\.html/);
});

test("mailing-list include posts email and Turnstile token to the Worker", async () => {
  const include = await read("_includes/mailing-list.html");

  assert.match(include, /data-mailing-list-form/);
  assert.match(include, /type="email"/);
  assert.match(include, /cf-turnstile/);
  assert.match(include, /turnstileToken/);
  assert.match(include, /fetch\(form\.action/);
});

test("mailing-list styles are imported", async () => {
  const stylesheet = await read("css/main.scss");

  assert.match(stylesheet, /components\/mailing-list/);
});

test("mailing-list public config exists", async () => {
  const config = await read("_config.yml");

  assert.match(config, /mailing_list:/);
  assert.match(config, /endpoint: "\/subscribe"/);
  assert.match(config, /turnstile_site_key:/);
});

test("mailing-list public config is declared once", async () => {
  const config = await read("_config.yml");
  const mailingListDeclarations = config.match(/^mailing_list:/gm) || [];

  assert.equal(mailingListDeclarations.length, 1);
});

test("deployed builds use the real Turnstile sitekey by default", async () => {
  const config = await read("_config.yml");
  const include = await read("_includes/mailing-list.html");

  assert.match(config, /turnstile_site_key: "0x/);
  assert.match(config, /turnstile_test_site_key: "1x00000000000000000000AA"/);
  assert.match(config, /use_test_turnstile: false/);
  assert.match(include, /use_test_turnstile/);
  assert.doesNotMatch(include, /jekyll\.environment == "production"/);
});

test("local Jekyll config points the form at the local Worker", async () => {
  const config = await read("_config_local.yml");

  assert.match(config, /endpoint: "http:\/\/127\.0\.0\.1:8787\/subscribe"/);
  assert.match(config, /turnstile_test_site_key: "1x00000000000000000000AA"/);
  assert.match(config, /use_test_turnstile: true/);
});
