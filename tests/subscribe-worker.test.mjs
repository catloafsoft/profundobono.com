import assert from "node:assert/strict";
import test from "node:test";

import worker, { handleSubscribeRequest, isValidEmail } from "../worker/src/index.mjs";

const validPayload = {
  email: "subscriber@example.com",
  turnstileToken: "valid-turnstile-token",
};

function makeEnv(overrides = {}) {
  const sent = [];

  return {
    TURNSTILE_SECRET_KEY: "turnstile-secret",
    MAILING_LIST_FROM: "mailing-list@profundobono.com",
    MAILING_LIST_TO: "ProfundoBono@adamhillerlaw.com",
    EMAIL: {
      sent,
      async send(message) {
        sent.push(message);
        return { messageId: "message-123" };
      },
    },
    ...overrides,
  };
}

function makeRequest(body, options = {}) {
  return new Request("https://profundobono.com/subscribe", {
    method: options.method || "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://profundobono.com",
      "cf-connecting-ip": "203.0.113.42",
      ...options.headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function passingTurnstileFetch(assertions = {}) {
  return async (url, init) => {
    assert.equal(
      url,
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    assert.equal(init.method, "POST");
    assert.equal(init.headers["content-type"], "application/json");

    const body = JSON.parse(init.body);
    assert.equal(body.secret, "turnstile-secret");
    assert.equal(body.response, validPayload.turnstileToken);
    assert.equal(body.remoteip, "203.0.113.42");

    if (assertions.onBody) {
      assertions.onBody(body);
    }

    return Response.json({ success: true });
  };
}

async function readJson(response) {
  return response.json();
}

test("validates common email forms and rejects malformed addresses", () => {
  assert.equal(isValidEmail("person@example.com"), true);
  assert.equal(isValidEmail("person.name+tag@example.co"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail("person@example"), false);
  assert.equal(isValidEmail("person @example.com"), false);
});

test("rejects unsupported methods", async () => {
  const env = makeEnv();
  const response = await worker.fetch(
    new Request("https://profundobono.com/subscribe", { method: "GET" }),
    env,
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST, OPTIONS");
  assert.deepEqual(await readJson(response), {
    ok: false,
    error: "Method not allowed.",
  });
  assert.equal(env.EMAIL.sent.length, 0);
});

test("allows local Jekyll origins when the Worker runs locally", async () => {
  const env = makeEnv({ ALLOWED_ORIGIN: "https://profundobono.com" });
  const response = await worker.fetch(
    new Request("http://127.0.0.1:8787/subscribe", {
      method: "OPTIONS",
      headers: {
        origin: "http://127.0.0.1:4000",
      },
    }),
    env,
  );

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "http://127.0.0.1:4000",
  );
});

test("rejects malformed email addresses before calling Turnstile", async () => {
  const env = makeEnv();
  let turnstileCalled = false;

  const response = await handleSubscribeRequest(
    makeRequest({ ...validPayload, email: "bad" }),
    env,
    {
      fetch: async () => {
        turnstileCalled = true;
        return Response.json({ success: true });
      },
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await readJson(response), {
    ok: false,
    error: "Enter a valid email address.",
  });
  assert.equal(turnstileCalled, false);
  assert.equal(env.EMAIL.sent.length, 0);
});

test("rejects requests without a Turnstile token", async () => {
  const env = makeEnv();

  const response = await handleSubscribeRequest(
    makeRequest({ email: validPayload.email }),
    env,
    { fetch: passingTurnstileFetch() },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await readJson(response), {
    ok: false,
    error: "Complete the CAPTCHA check and try again.",
  });
  assert.equal(env.EMAIL.sent.length, 0);
});

test("rejects failed Turnstile validation without sending email", async () => {
  const env = makeEnv();

  const response = await handleSubscribeRequest(
    makeRequest(validPayload),
    env,
    {
      fetch: async () =>
        Response.json({
          success: false,
          "error-codes": ["invalid-input-response"],
        }),
    },
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await readJson(response), {
    ok: false,
    error: "CAPTCHA verification failed. Please try again.",
  });
  assert.equal(env.EMAIL.sent.length, 0);
});

test("sends a plain-text notification when Turnstile passes", async () => {
  const env = makeEnv();
  const response = await handleSubscribeRequest(makeRequest(validPayload), env, {
    fetch: passingTurnstileFetch(),
    now: () => new Date("2026-06-18T12:00:00.000Z"),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await readJson(response), {
    ok: true,
    message: "Thanks. You are on the list.",
  });

  assert.equal(env.EMAIL.sent.length, 1);
  assert.deepEqual(env.EMAIL.sent[0], {
    to: "ProfundoBono@adamhillerlaw.com",
    from: "mailing-list@profundobono.com",
    subject: "New Profundo Bono mailing list signup",
    text:
      "New Profundo Bono mailing list signup:\n\n" +
      "Email: subscriber@example.com\n" +
      "Submitted: 2026-06-18T12:00:00.000Z\n",
  });
});
