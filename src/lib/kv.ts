import { kv as vercelKv } from "@vercel/kv";

type KvClient = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

// In-memory fallback for local dev and tests when KV env vars are absent.
class MemoryKv implements KvClient {
  private store = new Map<string, { v: unknown; exp?: number }>();
  async get<T>(key: string): Promise<T | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.exp && Date.now() > e.exp) {
      this.store.delete(key);
      return null;
    }
    return e.v as T;
  }
  async set(key: string, value: unknown, opts?: { ex?: number }) {
    this.store.set(key, { v: value, exp: opts?.ex ? Date.now() + opts.ex * 1000 : undefined });
    return "OK";
  }
  async del(key: string) {
    this.store.delete(key);
    return 1;
  }
}

const hasKv = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

export const kv: KvClient = hasKv ? (vercelKv as unknown as KvClient) : new MemoryKv();
