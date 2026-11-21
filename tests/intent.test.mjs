import test from "node:test";
import assert from "node:assert/strict";
import { detectIntents, isUnsupportedProvider } from "../src/assistant/intent.js";

const sources = [
  { id: "library" },
  { id: "cafeteria" },
  { id: "events" },
  { id: "academics" },
  { id: "hostel" }
];

test("detects hostel and library intents", () => {
  assert.deepEqual(detectIntents("Which hostel has laundry?", sources).map((source) => source.id), ["hostel"]);
  assert.deepEqual(detectIntents("Is there an AI book available?", sources).map((source) => source.id), ["library"]);
});

test("returns no sources for unknown intent", () => {
  assert.deepEqual(detectIntents("tell me about quantum bananas", sources), []);
});

test("provider configuration is explicitly supported or unsupported", () => {
  assert.equal(isUnsupportedProvider(""), true);
  assert.equal(isUnsupportedProvider("openai"), false);
});
