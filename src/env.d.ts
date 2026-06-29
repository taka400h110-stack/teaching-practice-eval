/// <reference types="@cloudflare/workers-types" />

declare global {
  type CloudflareBindings = {
    OPENAI_API_KEY: string;
    OPENAI_BASE_URL?: string;
    OPENAI_MODEL?: string;
    GOOGLE_CLOUD_VISION_API_KEY: string;
    STAT_API_URL?: string;
    DB: D1Database;
    KV: KVNamespace;
    AI: Ai;
  };
}
export {};
