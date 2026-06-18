export function createSubscribeFunction() {
  return async function onRequest(context) {
    const mailingListWorker = context.env?.MAILING_LIST_WORKER;

    if (!mailingListWorker || typeof mailingListWorker.fetch !== "function") {
      return Response.json(
        {
          ok: false,
          error: "Mailing list Worker binding is not configured.",
        },
        { status: 500 },
      );
    }

    return mailingListWorker.fetch(context.request);
  };
}

export const onRequest = createSubscribeFunction();
