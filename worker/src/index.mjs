const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const DEFAULT_RECIPIENT = "ProfundoBono@adamhillerlaw.com";
const DEFAULT_SENDER = "mailing-list@profundobono.com";

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim() : "";
}

function isLocalHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isLocalOrigin(origin) {
  try {
    return isLocalHostname(new URL(origin).hostname);
  } catch (error) {
    return false;
  }
}

export function isValidEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail.length === 0 || normalizedEmail.length > 254) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
}

function getCorsHeaders(request, env = {}) {
  const origin = request.headers.get("origin");
  const allowedOrigin = env.ALLOWED_ORIGIN || "https://profundobono.com";
  const requestHostname = new URL(request.url).hostname;

  if (!origin) {
    return {};
  }

  if (
    allowedOrigin !== "*" &&
    origin !== allowedOrigin &&
    !(isLocalHostname(requestHostname) && isLocalOrigin(origin))
  ) {
    return {};
  }

  const responseOrigin =
    allowedOrigin === "*" ? origin : origin === allowedOrigin ? allowedOrigin : origin;

  return {
    "access-control-allow-origin": responseOrigin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  };
}

function jsonResponse(request, env, status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...getCorsHeaders(request, env),
      ...extraHeaders,
    },
  });
}

async function readPayload(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  const formData = await request.formData();
  return {
    email: formData.get("email"),
    turnstileToken: formData.get("cf-turnstile-response"),
  };
}

async function verifyTurnstile(token, request, env, fetchImpl) {
  const response = await fetchImpl(TURNSTILE_SITEVERIFY_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: request.headers.get("cf-connecting-ip") || undefined,
    }),
  });

  return response.json();
}

function buildNotificationEmail(email, env, now) {
  const submittedAt = now().toISOString();

  return {
    to: env.MAILING_LIST_TO || DEFAULT_RECIPIENT,
    from: env.MAILING_LIST_FROM || DEFAULT_SENDER,
    subject: "New Profundo Bono mailing list signup",
    text:
      "New Profundo Bono mailing list signup:\n\n" +
      `Email: ${email}\n` +
      `Submitted: ${submittedAt}\n`,
  };
}

export async function handleSubscribeRequest(request, env = {}, options = {}) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request, env),
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      request,
      env,
      405,
      { ok: false, error: "Method not allowed." },
      { allow: "POST, OPTIONS" },
    );
  }

  if (!env.TURNSTILE_SECRET_KEY || !env.EMAIL) {
    return jsonResponse(request, env, 500, {
      ok: false,
      error: "Signup is not configured yet.",
    });
  }

  let payload;

  try {
    payload = await readPayload(request);
  } catch (error) {
    return jsonResponse(request, env, 400, {
      ok: false,
      error: "Send a valid signup request.",
    });
  }

  const email = normalizeEmail(payload.email);
  const turnstileToken = normalizeEmail(
    payload.turnstileToken || payload["cf-turnstile-response"],
  );

  if (!isValidEmail(email)) {
    return jsonResponse(request, env, 400, {
      ok: false,
      error: "Enter a valid email address.",
    });
  }

  if (!turnstileToken) {
    return jsonResponse(request, env, 400, {
      ok: false,
      error: "Complete the CAPTCHA check and try again.",
    });
  }

  const fetchImpl = options.fetch || fetch;

  let turnstileResult;

  try {
    turnstileResult = await verifyTurnstile(
      turnstileToken,
      request,
      env,
      fetchImpl,
    );
  } catch (error) {
    return jsonResponse(request, env, 502, {
      ok: false,
      error: "CAPTCHA verification is unavailable. Please try again.",
    });
  }

  if (!turnstileResult.success) {
    return jsonResponse(request, env, 403, {
      ok: false,
      error: "CAPTCHA verification failed. Please try again.",
    });
  }

  try {
    await env.EMAIL.send(
      buildNotificationEmail(email, env, options.now || (() => new Date())),
    );
  } catch (error) {
    return jsonResponse(request, env, 502, {
      ok: false,
      error: "Signup email could not be sent. Please try again.",
    });
  }

  return jsonResponse(request, env, 200, {
    ok: true,
    message: "Thanks. You are on the list.",
  });
}

export default {
  fetch: handleSubscribeRequest,
};
