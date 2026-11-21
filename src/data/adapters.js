import { readSourceDocument } from "./store.js";

export class CampusDataAdapter {
  constructor(source) {
    this.source = source;
  }
  async read() {
    throw new Error("CampusDataAdapter.read() must be implemented");
  }
}

export class JsonDemoAdapter extends CampusDataAdapter {
  async read() {
    return readSourceDocument(this.source);
  }
}

export class HttpCampusAdapter extends CampusDataAdapter {
  constructor(source, baseUrl, headers = {}) {
    super(source);
    this.baseUrl = baseUrl;
    this.headers = headers;
  }

  async read() {
    const timeoutMs = Number(process.env.INTEGRATION_TIMEOUT_MS || 5000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/${this.source}`, {
        headers: { accept: "application/json", ...this.headers },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);
      const payload = await response.json();
      return {
        ...payload,
        dataStatus: {
          mode: "live",
          source: this.source,
          verifiedLive: true,
          lastUpdated: new Date().toISOString()
        }
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createAdapter(source) {
  const demo = new JsonDemoAdapter(source);
  const baseUrl = process.env.CAMPUS_DATA_API_URL;
  if (!baseUrl) return demo;

  const headers = process.env.CAMPUS_DATA_API_TOKEN
    ? { authorization: `Bearer ${process.env.CAMPUS_DATA_API_TOKEN}` }
    : {};
  return new HttpCampusAdapter(source, baseUrl, headers);
}

export async function readCampusData(source) {
  const adapter = createAdapter(source);
  try {
    return await adapter.read();
  } catch (error) {
    const fallback = await new JsonDemoAdapter(source).read();
    return {
      ...fallback,
      dataStatus: {
        ...fallback.dataStatus,
        mode: "mock-fallback",
        verifiedLive: false,
        integrationError: "External campus API unavailable",
        lastAttempt: new Date().toISOString()
      }
    };
  }
}
