import { describe, expect, test } from "bun:test";
import {
  contactSchema,
  entryBodySchema,
  parseWithSchema,
  reactionSchema,
  reviewCreateSchema,
  togetherCreateSchema,
  claimIntentSchema,
  VALIDATION,
} from "../src/lib/api-schemas";

describe("parseWithSchema", () => {
  test("accepts valid entry body", () => {
    const r = parseWithSchema(entryBodySchema, {
      reflectionBody: "묵상",
      title: "제목",
    });
    expect(r.ok).toBe(true);
  });

  test("rejects non-string reflectionBody", async () => {
    const r = parseWithSchema(entryBodySchema, { reflectionBody: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(400);
      const body = await r.response.json();
      expect(body.code).toBe(VALIDATION);
    }
  });

  test("reviewCreate optional fields", () => {
    expect(parseWithSchema(reviewCreateSchema, {}).ok).toBe(true);
    expect(parseWithSchema(reviewCreateSchema, { reportType: "nope" }).ok).toBe(
      false,
    );
  });

  test("together and reaction enums", () => {
    expect(
      parseWithSchema(togetherCreateSchema, {
        publicBody: "x".repeat(20),
      }).ok,
    ).toBe(true);
    expect(parseWithSchema(reactionSchema, { reactionType: "pray" }).ok).toBe(
      true,
    );
    expect(parseWithSchema(reactionSchema, { reactionType: "x" }).ok).toBe(
      false,
    );
  });

  test("claimIntent requires slug string", () => {
    expect(parseWithSchema(claimIntentSchema, { slug: "e01" }).ok).toBe(true);
    expect(parseWithSchema(claimIntentSchema, {}).ok).toBe(false);
  });

  test("contact requires strings", () => {
    const r = parseWithSchema(contactSchema, {
      name: "a",
      email: "b@c.d",
      subject: "s",
      message: "m",
    });
    expect(r.ok).toBe(true);
  });
});
