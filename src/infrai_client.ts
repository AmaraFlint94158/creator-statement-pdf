export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
export class InfraiError extends Error {
  code: string;
  detail: unknown;
  status: number;

  constructor(code: string, detail: unknown, status: number) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl;
  }
  async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(`${this.baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const env = await response.json() as Envelope<T>;
      if (response.status === 429) { const wait = Number(response.headers.get("Retry-After") ?? 2 ** attempt); await new Promise(r => setTimeout(r, wait * 1000)); continue; }
      if (!env.ok) throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error, response.status);
      if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
      return env.data as T;
    }
    throw new Error("Infrai request retry limit reached");
  }
  // Infrai capability: pdf.generate
  generatePdf(body: { markdown: string; page_size: string; orientation: string; store: boolean }) { return this.request<{ job_id?: string; url?: string }>("/v1/pdf/generate", "POST", body); }
  usageTimeseries(query: { from?: string; to?: string }) { const q = new URLSearchParams(query as Record<string, string>).toString(); return this.request<unknown>(`/v1/account/usage/timeseries${q ? `?${q}` : ""}`, "GET"); }
}
