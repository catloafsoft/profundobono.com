# Mailing List Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Cloudflare Worker-protected mailing-list signup form for Profundo Bono.

**Architecture:** Keep the Jekyll site static and post signup submissions to a Cloudflare Worker route at `/subscribe`. The Worker validates email input, verifies Cloudflare Turnstile server-side, then sends a plain-text notification using Cloudflare Email Service.

**Tech Stack:** Jekyll/Liquid, SCSS, vanilla browser JavaScript, Cloudflare Workers ES modules, Cloudflare Turnstile, Cloudflare Email Service, Node `node:test`.

---

## File Structure

- Create `worker/src/index.mjs`: Worker handler and exported helpers for tests.
- Create `tests/subscribe-worker.test.mjs`: endpoint behavior tests.
- Create `_includes/mailing-list.html`: signup box, Turnstile widget, and submit script.
- Create `_scss/components/_mailing-list.scss`: section and form styling.
- Modify `index.html`: render mailing-list section after the intro.
- Modify `_includes/header.html`: add a navigation link.
- Modify `css/main.scss`: import the new SCSS component.
- Modify `_config.yml`: add public mailing-list config.
- Create `wrangler.toml`: Worker deploy config and restricted email binding.
- Modify `package.json`: add a real test command.

## Tasks

### Task 1: Worker Behavior

- [ ] Write failing tests for invalid email, missing token, failed Turnstile validation, successful notification, and unsupported methods.
- [ ] Run `node --test tests/subscribe-worker.test.mjs` and confirm it fails because the Worker module is missing.
- [ ] Implement the Worker endpoint in `worker/src/index.mjs`.
- [ ] Run `node --test tests/subscribe-worker.test.mjs` and confirm tests pass.

### Task 2: Site Form

- [ ] Add mailing-list config to `_config.yml`.
- [ ] Add `_includes/mailing-list.html`.
- [ ] Include the section in `index.html`.
- [ ] Add the nav link in `_includes/header.html`.
- [ ] Add styles in `_scss/components/_mailing-list.scss`.
- [ ] Import styles from `css/main.scss`.

### Task 3: Cloudflare Config

- [ ] Add `wrangler.toml` with route, vars, and restricted `send_email` binding.
- [ ] Ensure no secrets are committed.
- [ ] Document the required `TURNSTILE_SECRET_KEY` secret in comments or final notes.

### Task 4: Verification

- [ ] Run `node --test tests/subscribe-worker.test.mjs`.
- [ ] Run `bundle exec jekyll build`.
- [ ] Inspect git diff for unrelated changes and secret leakage.

