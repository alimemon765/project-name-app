import { describe, expect, test } from "vitest";
import { fetchWithRetry, readJson, readText } from "@/lib/ingest/shared";

const streamOf = (chunks: string[]) => new Response(new ReadableStream({
  start(c) { for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch)); c.close(); },
}));

describe("bounded body reads", () => {
  test("reads a body under the limit", async () => {
    expect(await readText(new Response("hello"), 100)).toBe("hello");
    expect(await readJson(Response.json({ a: 1 }), 100)).toEqual({ a: 1 });
  });
  test("rejects a declared content-length over the limit without reading it", async () => {
    const res = new Response("x", { headers: { "content-length": "999999" } });
    await expect(readText(res, 100)).rejects.toThrow(/too large/);
  });
  test("rejects a streamed body that grows past the limit", async () => {
    await expect(readText(streamOf(["a".repeat(60), "b".repeat(60)]), 100)).rejects.toThrow(/too large/);
  });
  test("decodes multi-byte characters split across chunks", async () => {
    const bytes = new TextEncoder().encode("Ganges–Brahmaputra");
    const res = new Response(new ReadableStream({ start(c) { c.enqueue(bytes.slice(0, 8)); c.enqueue(bytes.slice(8)); c.close(); } }));
    expect(await readText(res, 100)).toBe("Ganges–Brahmaputra");
  });
});

describe("fetchWithRetry timeout", () => {
  test("passes a per-source timeout to the request", async () => {
    let signal: AbortSignal | undefined;
    await fetchWithRetry("https://example.org", (async (_u: unknown, init?: RequestInit) => { signal = init?.signal ?? undefined; return new Response("ok"); }) as typeof fetch,
      async () => {}, "Test", { timeoutMs: 90_000 });
    expect(signal).toBeDefined();
  });
  test("never puts the URL (which may hold an API key) in the error", async () => {
    const url = "https://api.openalex.org/works?api_key=SECRET123";
    await expect(fetchWithRetry(url, (async () => new Response("no", { status: 403 })) as typeof fetch, async () => {}, "OpenAlex"))
      .rejects.toThrow(/^OpenAlex 403/);
    await fetchWithRetry(url, (async () => new Response("no", { status: 403 })) as typeof fetch, async () => {}, "OpenAlex")
      .catch((e: Error) => expect(e.message).not.toContain("SECRET123"));
  });
});
