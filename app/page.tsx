"use client";
import { useRef, useState } from "react";
import { packs, type TriviaQuestion } from "../lib/trivia/packs";
import { QuestionQueue, validDelay } from "../lib/trivia/queue";

type State = "idle" | "loading-question" | "speaking-question" | "waiting-for-answer" | "speaking-answer" | "transitioning" | "paused";

export default function Home() {
  const [packId, setPackId] = useState(packs[0].id), [delay, setDelay] = useState(5), [shuffle, setShuffle] = useState(true);
  const [state, setState] = useState<State>("idle"), [question, setQuestion] = useState<TriviaQuestion | null>(null), [answer, setAnswer] = useState(""), [remaining, setRemaining] = useState(0), [error, setError] = useState("");
  const run = useRef(0), context = useRef<AudioContext | null>(null), source = useRef<AudioBufferSourceNode | null>(null), buffer = useRef<AudioBuffer | null>(null), offset = useRef(0), startedAt = useRef(0), audioEnded = useRef<(() => void) | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null), queue = useRef<QuestionQueue | null>(null), answerAudio = useRef<Promise<AudioBuffer> | null>(null), paused = useRef<{ state: State; remaining: number } | null>(null);
  function audioContext() { return context.current || (context.current = new AudioContext()); }
  function stopAudio() { if (source.current) { source.current.onended = null; source.current.stop(); source.current = null; } buffer.current = null; audioEnded.current = null; offset.current = 0; }
  function clear() { run.current++; if (timer.current) clearTimeout(timer.current); timer.current = null; stopAudio(); answerAudio.current = null; }
  async function load(text: string, id: number) { const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }); if (!r.ok) throw new Error("Could not load audio."); const decoded = await audioContext().decodeAudioData(await r.arrayBuffer()); if (id !== run.current) throw new Error("cancelled"); return decoded; }
  async function play(clip: AudioBuffer, id: number, ended: () => void, from = 0) { try { const ctx = audioContext(); await ctx.resume(); if (id !== run.current) return; if (source.current) { source.current.onended = null; source.current.stop(); } const node = ctx.createBufferSource(); node.buffer = clip; node.connect(ctx.destination); source.current = node; buffer.current = clip; offset.current = from; startedAt.current = ctx.currentTime; audioEnded.current = ended; node.onended = () => { if (source.current === node) source.current = null; if (id === run.current) ended(); }; node.start(0, from); } catch { if (id === run.current) fail("Audio playback was blocked. Tap Retry to continue."); } }
  function fail(message: string) { clear(); setState("idle"); setError(message); }
  function startCountdown(id: number, seconds = delay) { if (id !== run.current) return; setState("waiting-for-answer"); setRemaining(seconds); const tick = (left: number) => { if (id !== run.current) return; setRemaining(left); if (!left) { speakAnswer(id); return; } timer.current = setTimeout(() => tick(left - 1), 1000); }; timer.current = setTimeout(() => tick(seconds - 1), 1000); }
  async function speakAnswer(id: number) { if (id !== run.current) return; setState("speaking-answer"); setAnswer(questionRef.current?.answer || ""); try { const clip = await answerAudio.current!; if (id === run.current) play(clip, id, () => { setState("transitioning"); timer.current = setTimeout(() => next(), 900); }); } catch (e) { if ((e as Error).message !== "cancelled") fail("Could not load audio."); } }
  const questionRef = useRef<TriviaQuestion | null>(null);
  async function next() { clear(); const id = run.current; try { const q = queue.current!.next(); questionRef.current = q; setQuestion(q); setAnswer(""); setError(""); setState("loading-question"); const questionClip = await load(q.question, id); answerAudio.current = load(`The answer is ${q.answer}.`, id); if (id !== run.current) return; setState("speaking-question"); play(questionClip, id, () => startCountdown(id)); } catch (e) { if ((e as Error).message !== "cancelled") fail("Could not load audio."); } }
  function start() { if (!validDelay(delay)) return fail("Answer delay must be 3 to 30 seconds."); void audioContext().resume(); queue.current = new QuestionQueue(packs.find(p => p.id === packId)!.questions, shuffle); run.current++; next(); }
  function stop() { clear(); questionRef.current = null; setQuestion(null); setAnswer(""); setRemaining(0); setState("idle"); }
  function skip() { clear(); next(); }
  function pause() { if (state === "waiting-for-answer") { paused.current = { state, remaining }; if (timer.current) clearTimeout(timer.current); } else if (source.current && context.current) { paused.current = { state, remaining: 0 }; offset.current += context.current.currentTime - startedAt.current; source.current.onended = null; source.current.stop(); source.current = null; } else return; setState("paused"); }
  function resume() { const p = paused.current; if (!p) return; paused.current = null; if (p.state === "waiting-for-answer") startCountdown(run.current, p.remaining); else if (buffer.current && audioEnded.current) { setState(p.state); play(buffer.current, run.current, audioEnded.current, offset.current); } }
  const status = state === "waiting-for-answer" ? `Answer in ${remaining}...` : ({ idle: "Ready when you are.", "loading-question": "Loading question...", "speaking-question": "Reading question...", "speaking-answer": "Reading answer...", transitioning: "Loading next question...", paused: "Paused" }[state]);
  const active = state !== "idle";
  return <main><h1>TriviaBot</h1><p className="sub">Listen, think, and let the answer arrive.</p><div className="card">
    <label>Trivia Pack<select disabled={active} value={packId} onChange={e => setPackId(e.target.value)}>{packs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>Answer delay<div className="row"><input disabled={active} type="range" min="3" max="30" step="1" value={delay} onChange={e => setDelay(Number(e.target.value))} /><span>{delay} seconds</span></div></label>
    <label className="row"><input disabled={active} type="checkbox" checked={shuffle} onChange={e => setShuffle(e.target.checked)} style={{ width: 18 }} />Shuffle questions</label>
    <div className="question">{question?.question || "Choose a pack and start listening."}</div><div className="answer">{answer}</div><div className="status">{status}</div>
    {error && <div className="error">{error}<button onClick={start}>Retry</button><button onClick={skip}>Skip</button></div>}
    <div className="controls">{!active ? <button onClick={start}>Start</button> : state === "paused" ? <button onClick={resume}>Resume</button> : <button onClick={pause}>Pause</button>}{active && <><button className="secondary" onClick={skip}>Skip</button><button className="secondary" onClick={stop}>Stop</button></>}</div>
  </div></main>;
}
