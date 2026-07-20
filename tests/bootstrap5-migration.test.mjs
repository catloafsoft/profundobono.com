import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("the site loads the vendored Bootstrap 5 bundle", async () => {
  const head = await read("_includes/doctype-head.html");
  const layout = await read("_layouts/default.html");
  const css = await read("css/bootstrap.min.css");
  const javascript = await read("js/bootstrap.bundle.min.js");

  assert.match(head, /css\/bootstrap\.min\.css/);
  assert.match(layout, /js\/bootstrap\.bundle\.min\.js/);
  assert.match(css, /Bootstrap\s+v5\.3\.8/);
  assert.match(javascript, /Bootstrap\s+v5\.3\.8/);
});

test("navigation and ScrollSpy use Bootstrap 5 markup", async () => {
  const header = await read("_includes/header.html");
  const layout = await read("_layouts/default.html");

  assert.match(header, /navbar-expand-lg/);
  assert.match(header, /data-bs-toggle="collapse"/);
  assert.match(header, /data-bs-target="#main-navigation"/);
  assert.match(layout, /data-bs-spy="scroll"/);
  assert.match(layout, /tabindex="-1"/);
  assert.doesNotMatch(layout, /tabindex="0"/);
  assert.doesNotMatch(`${header}\n${layout}`, /data-(?:toggle|target|spy)=/);
  assert.doesNotMatch(header, /navbar-(?:default|toggle\b|header|right)/);
});

test("custom scripts use the Bootstrap 5 JavaScript API", async () => {
  const script = await read("js/custom.js");

  assert.match(script, /bootstrap\.Collapse\.getOrCreateInstance/);
  assert.match(script, /querySelectorAll\('\.navbar-nav \.nav-link'\)/);
  assert.match(script, /addEventListener\('click'/);
  assert.match(script, /window\.scrollTo/);
  assert.match(script, /\[data-bs-toggle="tooltip"\]/);
  assert.doesNotMatch(script, /\bjQuery\b|\$\(/);
  assert.doesNotMatch(script, /\.collapse\(['"]hide['"]\)/);
  assert.doesNotMatch(script, /\.tooltip\(\)/);
});

test("malformed URL hashes do not break smooth-scroll initialization", async () => {
  const script = await read("js/custom.js");
  const listeners = {};
  const malformedLink = {
    hash: "#bad%E0%A4%A",
    hostname: "example.test",
    pathname: "/",
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
  };
  let requestedTarget;
  const document = {
    querySelectorAll(selector) {
      return selector.startsWith("a.scroll") ? [malformedLink] : [];
    },
    getElementById(name) {
      requestedTarget = name;
      return null;
    },
    getElementsByName() {
      return [];
    },
  };

  runInNewContext(script, {
    bootstrap: { Tooltip: class {} },
    document,
    location: { hostname: "example.test", pathname: "/" },
    window: {
      matchMedia: () => ({ matches: false }),
      scrollTo() {},
      scrollY: 0,
    },
  });

  assert.doesNotThrow(() => listeners.click({ preventDefault() {} }));
  assert.equal(requestedTarget, "bad%E0%A4%A");
});

test("build tooling uses a pinned Grunt CLI", async () => {
  const packageJson = JSON.parse(await read("package.json"));

  assert.equal(packageJson.devDependencies["grunt-cli"], "1.5.0");
});

test("the site bundle has no jQuery plugin dependencies", async () => {
  const layout = await read("_layouts/default.html");
  const gruntfile = await read("Gruntfile.js");
  const stylesheet = await read("css/main.scss");

  assert.doesNotMatch(layout, /jquery/i);
  assert.doesNotMatch(gruntfile, /jquery|owl|magnific|gmap3/i);
  assert.doesNotMatch(stylesheet, /owl-carousel|magnific-popup/);
});

test("project Sass uses modules instead of deprecated imports", async () => {
  const stylesheet = await read("css/main.scss");
  const config = await read("_config.yml");

  assert.match(stylesheet, /@use "base\/global"/);
  assert.doesNotMatch(stylesheet, /@import/);
  assert.doesNotMatch(config, /silence_deprecations/);
});
