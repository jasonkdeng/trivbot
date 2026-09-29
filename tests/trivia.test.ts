import assert from "node:assert/strict";
import test from "node:test";
import { packs } from "../lib/trivia/packs";
import { QuestionQueue, validDelay } from "../lib/trivia/queue";
import { cachedSpeech } from "../lib/tts/cache";

test("packs load normalized questions", () => assert.ok(packs.length && packs.every(p => p.questions.every(q => q.id && q.question && q.answer))));
test("delay is whole seconds from 3 through 30", () => { assert.ok(validDelay(3)); assert.ok(validDelay(30)); assert.ok(!validDelay(2)); assert.ok(!validDelay(3.5)); });
test("queue does not repeat before exhaustion", () => { const qs = packs[0].questions; const q = new QuestionQueue(qs, false); assert.equal(new Set(qs.map(() => q.next().id)).size, qs.length); assert.equal(q.next().id, qs[0].id); });
test("shuffled queue retains every question", () => { const qs = packs[0].questions; const q = new QuestionQueue(qs, true, () => 0); assert.deepEqual(new Set(qs.map(() => q.next().id)), new Set(qs.map(x => x.id))); });
test("speech cache generates once then returns the cached audio", async () => { let calls = 0; const text = `test-${Date.now()}-${Math.random()}`; const generate = async () => Buffer.from(`audio-${++calls}`); assert.equal((await cachedSpeech("test-voice", text, generate)).toString(), "audio-1"); assert.equal((await cachedSpeech("test-voice", text, generate)).toString(), "audio-1"); assert.equal(calls, 1); });
