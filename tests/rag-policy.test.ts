import { describe, expect, test } from "bun:test";
import { checkRagPolicy, RagPolicyError } from "../src/lib/story-mirror/rag-policy";
import { RAG_CORPUS_VERSION } from "../src/lib/story-mirror/rag-search";

describe("checkRagPolicy", () => {
  test("throws when consent missing, rights not approved, corpus mismatch", () => {
    expect(() =>
      checkRagPolicy({ consent: false, rightsStatus: "approved", corpusVersion: RAG_CORPUS_VERSION }),
    ).toThrow(RagPolicyError);

    expect(() =>
      checkRagPolicy({ consent: true, rightsStatus: "candidate", corpusVersion: RAG_CORPUS_VERSION }),
    ).toThrow(RagPolicyError);

    expect(() =>
      checkRagPolicy({ consent: true, rightsStatus: "approved", corpusVersion: "wrong-version" }),
    ).toThrow(RagPolicyError);

    // valid
    expect(() =>
      checkRagPolicy({ consent: true, rightsStatus: "approved", corpusVersion: RAG_CORPUS_VERSION }),
    ).not.toThrow();

    // snapshot invalid JSON
    expect(() =>
      checkRagPolicy({
        consent: true,
        rightsStatus: "approved",
        corpusVersion: RAG_CORPUS_VERSION,
        consentSnapshot: "not-json",
      }),
    ).toThrow(RagPolicyError);

    // snapshot valid but consent false
    const badSnapshot = JSON.stringify({ enabled: false, externalConsent: false, version: "v4.2" });
    expect(() =>
      checkRagPolicy({
        consent: true,
        rightsStatus: "approved",
        corpusVersion: RAG_CORPUS_VERSION,
        consentSnapshot: badSnapshot,
      }),
    ).toThrow(RagPolicyError);

    // snapshot valid
    const goodSnapshot = JSON.stringify({ enabled: true, externalConsent: true, version: "v4.2" });
    expect(() =>
      checkRagPolicy({
        consent: true,
        rightsStatus: "approved",
        corpusVersion: RAG_CORPUS_VERSION,
        consentSnapshot: goodSnapshot,
      }),
    ).not.toThrow();
  });
});
