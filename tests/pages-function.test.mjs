import assert from "node:assert/strict";
import test from "node:test";

import { createSubscribeFunction } from "../functions/subscribe.js";

test("Pages /subscribe forwards the request to the mailing-list Worker binding", async () => {
  const forwardedRequests = [];
  const handler = createSubscribeFunction();
  const request = new Request(
    "https://b7db2f9a.profundobono-com.pages.dev/subscribe",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://b7db2f9a.profundobono-com.pages.dev",
      },
      body: JSON.stringify({
        email: "subscriber@example.com",
        turnstileToken: "turnstile-token",
      }),
    },
  );

  const response = await handler({
    request,
    env: {
      MAILING_LIST_WORKER: {
        async fetch(forwardedRequest) {
          forwardedRequests.push(forwardedRequest);
          return Response.json({
            ok: true,
            message: "Thanks. You are on the list.",
          });
        },
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    message: "Thanks. You are on the list.",
  });

  assert.equal(forwardedRequests.length, 1);
  assert.equal(
    forwardedRequests[0].url,
    "https://b7db2f9a.profundobono-com.pages.dev/subscribe",
  );
  assert.equal(forwardedRequests[0].method, "POST");
  assert.deepEqual(await forwardedRequests[0].json(), {
    email: "subscriber@example.com",
    turnstileToken: "turnstile-token",
  });
});

test("Pages /subscribe returns a configuration error without the Worker binding", async () => {
  const handler = createSubscribeFunction();
  const response = await handler({
    request: new Request(
      "https://b7db2f9a.profundobono-com.pages.dev/subscribe",
      { method: "POST" },
    ),
    env: {},
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Mailing list Worker binding is not configured.",
  });
});
