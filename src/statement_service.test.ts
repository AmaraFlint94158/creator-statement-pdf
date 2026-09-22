import assert from "node:assert/strict";
import { exportStatement } from "./statement_service.js";
const calls: string[] = [];
const client = { usageTimeseries: async () => { calls.push("usage"); return { points: [3] }; }, generatePdf: async (body: { markdown: string }) => { calls.push(body.markdown.includes("creator-7") ? "pdf" : "bad"); return { job_id: "job-1" }; } } as never;
const result = await exportStatement({ creatorId: "creator-7", period: "2026-08", subscriberUpdates: ["new tier"], processedContent: 4 }, client);
assert.deepEqual(result, { job_id: "job-1" }); assert.deepEqual(calls, ["usage", "pdf"]);
console.log("statement decision test passed");
