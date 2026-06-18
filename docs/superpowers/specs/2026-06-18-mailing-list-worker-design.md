# Mailing List Worker Design

## Goal

Add a mailing-list signup box to the Profundo Bono website that accepts an email address, validates a Cloudflare Turnstile CAPTCHA token, and emails the signup address to `ProfundoBono@adamhillerlaw.com`.

## Architecture

The Jekyll site remains static. It renders a compact signup form and posts JSON to `/subscribe`, which is intended to be handled by a Cloudflare Worker route on the same domain. The Worker validates input, verifies Turnstile with Cloudflare's Siteverify API, then sends a plain-text notification through Cloudflare Email Service.

## Components

- `_includes/mailing-list.html`: homepage signup form, Turnstile widget, and submission script.
- `_scss/components/_mailing-list.scss`: form layout and status styles.
- `worker/src/index.mjs`: Worker endpoint, Turnstile validation, email notification.
- `wrangler.toml`: Cloudflare Worker entrypoint, route, vars, and restricted `send_email` binding.
- `tests/subscribe-worker.test.mjs`: Node tests for validation, CAPTCHA failure, and successful email notification.

## Security

- The Worker does not trust client-side validation.
- The Turnstile secret is stored as a Worker secret named `TURNSTILE_SECRET_KEY`.
- The Worker rejects invalid emails, missing CAPTCHA tokens, failed CAPTCHA validations, unsupported methods, and malformed JSON.
- The Cloudflare Email Service binding is restricted to `ProfundoBono@adamhillerlaw.com`.
- The notification email is plain text to avoid rendering submitted input as HTML.

## Configuration

Cloudflare setup requires:

- A Turnstile widget for `profundobono.com`.
- `_config.yml` value `mailing_list.turnstile_site_key`.
- Worker secret: `wrangler secret put TURNSTILE_SECRET_KEY`.
- Email Service onboarding for the `profundobono.com` sender domain.
- A verified sender address such as `mailing-list@profundobono.com`.

