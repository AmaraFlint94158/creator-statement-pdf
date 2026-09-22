import { createServer } from "node:http";
import { z } from "zod";
import { InfraiClient, InfraiError } from "./infrai_client.js";

export const statementRequest = z.object({ creatorId: z.string().min(1), period: z.string().regex(/^\d{4}-\d{2}$/), subscriberUpdates: z.array(z.string()).default([]), processedContent: z.number().int().nonnegative().default(0) });
export type StatementRequest = z.infer<typeof statementRequest>;
export function renderMarkdown(input: StatementRequest, usage: unknown) { return `# Creator statement\n\nCreator: ${input.creatorId}\nPeriod: ${input.period}\nProcessed content: ${input.processedContent}\nSubscriber updates: ${input.subscriberUpdates.length}\n\nUsage data: ${JSON.stringify(usage)}`; }

export async function exportStatement(input: unknown, client: InfraiClient) {
  const parsed = statementRequest.parse(input);
  const usage = await client.usageTimeseries({ from: `${parsed.period}-01` });
  return client.generatePdf({ markdown: renderMarkdown(parsed, usage), page_size: "A4", orientation: "portrait", store: true });
}

const key = process.env.INFRAI_API_KEY;
if (process.argv[1]?.endsWith("statement_service.ts") && key) {
  const server = createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/statements") { res.writeHead(404); res.end(); return; }
    try { const chunks: Buffer[] = []; for await (const c of req) chunks.push(c as Buffer); const result = await exportStatement(JSON.parse(Buffer.concat(chunks).toString()), new InfraiClient(key)); res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: true, data: result })); }
    catch (error) { const status = error instanceof InfraiError ? Math.max(400, Math.min(error.status, 499)) : 400; res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "invalid request" })); }
  });
  server.listen(Number(process.env.PORT ?? 3000));
}
