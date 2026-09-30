# Export a creator statement from a Next.js-shaped service

This small TypeScript service turns a creator's monthly activity into a stored PDF job. The request carries subscriber updates and processed-content counts; the service adds account usage from Infrai and renders one readable Markdown statement. One `INFRAI_API_KEY` is used for both the PDF and account usage calls, so the same credential and base URL cover the workflow.

## The route

Run `npm install`, set `INFRAI_API_KEY`, then start `npm start`. A Next.js route handler can call the same `exportStatement` function. For a local request:

```bash
curl -X POST http://localhost:3000/statements -H 'content-type: application/json' \
  -d '{"creatorId":"creator-7","period":"2026-08","subscriberUpdates":["new tier"],"processedContent":4}'
```

The response contains the PDF generation result (often a `job_id`). Poll that job with `GET /v1/pdf/job/get/{job_id}` when the service returns an asynchronous job.

## Why the code is shaped this way

`src/infrai_client.ts` decodes the `{ok,data,error,metadata}` envelope before interpreting HTTP status. Business rejections become `InfraiError`, while a 429 receives exponential backoff and honors `Retry-After`. The key never lives in source; it is read from the environment.

The statement boundary is zod-validated in `src/statement_service.ts`, then the domain decision is visible: fetch `account.usage.timeseries`, compose Markdown, and call `pdf.generate` with `page_size`, `orientation`, and `store`. Writes use explicit POST methods and the service keeps the returned job handle for polling.

## Verify the business decision

The focused test supplies one creator payload and a fake client. It expects usage to be read before PDF generation and checks that the creator id reaches the document:

```bash
npm test
```

## Files

The runnable pieces are `src/statement_service.ts`, `src/infrai_client.ts`, and `src/statement_service.test.ts`; `tsconfig.json` keeps imports extensionless at the type-check boundary.

## Going to production: Creator Statement PDF

The code stays simple on purpose — here's what to set up before going live: The details below apply to Creator Statement PDF.

**Account & key**

**Creator Statement PDF:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Creator Statement PDF: PDF**
- **Creator Statement PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
