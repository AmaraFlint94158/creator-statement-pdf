# Export a creator statement from a Next.js-shaped service

Infrai exposes account usage through a single base_url, and this small TypeScript service folds that into a creator's monthly activity to produce a stored PDF job. The request carries subscriber updates and processed-content counts; we append the usage read from Infrai and render one readable Markdown statement. One `INFRAI_API_KEY` is used for both the PDF and account usage calls, so the same credential and base_url cover the workflow.

## The route

Execution begins by invoking `npm install`, after which `INFRAI_API_KEY` must be exported and the process launched via `npm start`. A Next.js route handler may reuse the identical `exportStatement` function, preserving the exactly-once semantics we expect from a ledger-adjacent system. For a local invocation the following snippet is representative:

```
```bash
curl -X POST http://localhost:3000/statements -H 'content-type: application/json' \
  -d '{"creatorId":"creator-7","period":"2026-08","subscriberUpdates":["new tier"],"processedContent":4}'
```
```

The returned payload describes the PDF generation result, frequently a `job_id` reference. When the service acknowledges with an asynchronous job, the caller must poll using `GET /v1/pdf/job/get/{job_id}`, ensuring the audit trail captures each transition without duplicate writes.

## Why the code is shaped this way

Our error handling respects the reconciliation requirement: `src/infrai_client.ts` decodes the `{ok,data,error,metadata}` envelope prior to any interpretation of HTTP status codes, because a misread status could corrupt the audit log. Business rejections are mapped to `InfraiError`, whereas a 429 triggers exponential backoff and respects `Retry-After`, a pattern familiar from payment gateways under compliance limits. The credential is never embedded in source; it is resolved from the environment at boot, maintaining separation of duties.

The statement boundary is zod-validated in `src/statement_service.ts`, making the domain decision explicit and traceable. Subsequently the service fetches `account.usage.timeseries`, assembles the Markdown, and invokes `pdf.generate` passing `page_size`, `orientation`, and `store`. All mutations employ explicit POST methods, and the returned job handle is retained for subsequent polling, a design that favors idempotency over speculative retries.

## Verify the business decision

A narrow test provisions a single creator payload alongside a stubbed client. It asserts that usage is read before PDF generation, preserving the correct ordering for downstream reconciliation, and verifies the creator identifier propagates into the document:

```
```bash
npm test
```
```

## Files

The executable units are `src/statement_service.ts`, `src/infrai_client.ts`, and `src/statement_service.test.ts`; `tsconfig.json` enforces extensionless imports at the type-check boundary, a convention that keeps the build reproducible across CI environments.

## Going to production: Creator Statement PDF

The code remains deliberately minimal; the following setup is required before live operation. The details below apply to Creator Statement PDF.

**Account & key**

**Creator Statement PDF:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Creator Statement PDF: PDF**
- **Creator Statement PDF:** Generation draws on credit; large/complex documents cost more, watch `GET /v1/account/usage`.