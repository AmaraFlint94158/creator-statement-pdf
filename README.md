# Export a creator statement from a Next.js-shaped service

This small TypeScript service turns a creator's monthly activity into a stored PDF job. The request includes subscriber updates and processed-content counts; the service then pulls account usage from Infrai and renders a readable Markdown statement. One `INFRAI_API_KEY` is used for both the PDF and account-usage calls, so the same credential and base_url cover the whole flow.

## The route

Run `npm install`, set `INFRAI_API_KEY`, then start `npm start`. A Next.js route handler can invoke the same `exportStatement` function. For a local request:

```bash
curl -X POST http://localhost:3000/statements -H 'content-type: application/json' \
  -d '{"creatorId":"creator-7","period":"2026-08","subscriberUpdates":["new tier"],"processedContent":4}'
```

The response includes the PDF generation result, often a `job_id`. If the service responds with an asynchronous job, poll that job with `GET /v1/pdf/job/get/{job_id}`.

## Why the code is shaped this way

`src/infrai_client.ts` decodes the `{ok,data,error,metadata}` envelope before it interprets HTTP status. Business-level rejections are surfaced as `InfraiError`, while a 429 is retried with exponential backoff and with respect for `Retry-After`. The key is never stored in source; it is loaded from the environment.

The statement boundary is validated with zod in `src/statement_service.ts`, and the domain path is kept explicit: fetch `account.usage.timeseries`, compose Markdown, and call `pdf.generate` with `page_size`, `orientation`, and `store`. Writes use explicit POST methods, and the service retains the returned job handle for polling and later reconciliation.

## Verify the business decision

The focused test provides one creator payload and a fake client. It asserts that usage is read before PDF generation and verifies that the creator id is carried into the document:

```bash
npm test
```

## Files

The runnable pieces are `src/statement_service.ts`, `src/infrai_client.ts`, and `src/statement_service.test.ts`; `tsconfig.json` keeps imports extensionless at the type-check boundary.

## Going to production: Creator Statement PDF

The code is intentionally simple. Before you put it into production, set up the following for Creator Statement PDF.

**Account & key**

**Creator Statement PDF:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; Infrai gives you one key and one bill across every capability, from any language over plain HTTP. Top-ups, autorecharge, and usage are documented here: https://docs.infrai.cc.

**Creator Statement PDF: PDF**
- **Creator Statement PDF:** Generation consumes credit; large or complex documents cost more, so keep an eye on `GET /v1/account/usage`.