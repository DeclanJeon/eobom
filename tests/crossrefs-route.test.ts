import { describe, expect, test } from "bun:test";
import { GET } from "../src/app/api/bible/crossrefs/route";

describe("crossrefs API range validation", () => {
  test("rejects unbounded Infinity range", async () => {
    const response = await GET(new Request("http://localhost/api/bible/crossrefs?code=GEN&chapter=1&verse=1&endVerse=Infinity", { headers: { "x-real-ip": "qa-range" } }));
    expect(response.status).toBe(400);
  });

  test("rejects range beyond chapter verse count", async () => {
    const response = await GET(new Request("http://localhost/api/bible/crossrefs?code=GEN&chapter=1&verse=1&endVerse=999999", { headers: { "x-real-ip": "qa-range" } }));
    expect(response.status).toBe(400);
  });

  test("accepts a valid bounded range", async () => {
    const response = await GET(new Request("http://localhost/api/bible/crossrefs?code=GEN&chapter=1&verse=1&endVerse=3", { headers: { "x-real-ip": "qa-range-valid" } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.refs).toBeArray();
  });
});
