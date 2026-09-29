"use client";
import { useRef, useState } from "react";
import { packs, type TriviaQuestion } from "../lib/trivia/packs";
import { QuestionQueue, validDelay } from "../lib/trivia/queue";

type State = "idle" | "loading-question" | "speaking-question" | "waiting-for-answer" | "speaking-answer" | "transitioning" | "paused";

export default function Home() {
  const [packId, setPackId] = useState(packs[0].id), [delay, setDelay] = useState(5), [shuffle, setShuffle] = useState(true);
  const [state, setState] = useState<State>("idle"), [question, setQuestion] = useState<TriviaQuestion | null>(null), [answer, setAnswer] = useState(""), [remaining, setRemaining] = useState(0), [error, setError] = useState("");
  const run = useRef(0), audio = useRef<HTMLAudioElement | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null), queue = useRef<QuestionQueue | null>(null), answerAudio = useRef<Promise<string> | null>(null), paused = useRef<{ state: State; remaining: number } | null>(null);
  function clear() { run.current++; if (timer.current) clearTimeout(timer.current); timer.current = null; if (audio.current) { audio.current.onended = null; audio.current.pause(); audio.current = null; } answerAudio.current = null; }
  async function load(text: string, id: number) { const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }); if (!r.ok) throw new Error("Could not load audio."); const url = URL.createObjectURL(await r.blob()); if (id !== run.current) { URL.revokeObjectURL(url); throw new Error("cancelled"); } return url; }
  function play(url: string, id: number, ended: () => void) { if (id !== run.current) return; const clip = audio.current || new Audio(); audio.current = clip; clip.pause(); clip.src = url; clip.onended = () => { URL.revokeObjectURL(url); if (id === run.current) ended(); }; clip.onerror = () => { if (id === run.current) fail("Audio playback failed."); }; clip.play().catch(() => fail("Audio playback was blocked.")); }
  function fail(message: string) { clear(); setState("idle"); setError(message); }
  function startCountdown(id: number, seconds = delay) { if (id !== run.current) return; setState("waiting-for-answer"); setRemaining(seconds); const tick = (left: number) => { if (id !== run.current) return; setRemaining(left); if (!left) { speakAnswer(id); return; } timer.current = setTimeout(() => tick(left - 1), 1000); }; timer.current = setTimeout(() => tick(seconds - 1), 1000); }
  async function speakAnswer(id: number) { if (id !== run.current) return; setState("speaking-answer"); setAnswer(questionRef.current?.answer || ""); try { const url = await answerAudio.current!; if (id === run.current) play(url, id, () => { setState("transitioning"); timer.current = setTimeout(() => next(), 900); }); } catch (e) { if ((e as Error).message !== "cancelled") fail("Could not load audio."); } }
  const questionRef = useRef<TriviaQuestion | null>(null);
  async function next() { clear(); const id = run.current; try { const q = queue.current!.next(); questionRef.current = q; setQuestion(q); setAnswer(""); setError(""); setState("loading-question"); const questionUrl = await load(q.question, id); answerAudio.current = load(`${q.answer}.`, id); if (id !== run.current) return; setState("speaking-question"); play(questionUrl, id, () => startCountdown(id)); } catch (e) { if ((e as Error).message !== "cancelled") fail("Could not load audio."); } }
  function start() { if (!validDelay(delay)) return fail("Answer delay must be 3 to 30 seconds."); queue.current = new QuestionQueue(packs.find(p => p.id === packId)!.questions, shuffle); run.current++; next(); }
  function stop() { clear(); questionRef.current = null; setQuestion(null); setAnswer(""); setRemaining(0); setState("idle"); }
  function skip() { clear(); next(); }
  function pause() { if (state === "waiting-for-answer") { paused.current = { state, remaining }; if (timer.current) clearTimeout(timer.current); } else if (audio.current) { paused.current = { state, remaining: 0 }; audio.current.pause(); } else return; setState("paused"); }
  function resume() { const p = paused.current; if (!p) return; paused.current = null; if (p.state === "waiting-for-answer") startCountdown(run.current, p.remaining); else { setState(p.state); audio.current?.play().catch(() => fail("Audio playback was blocked.")); } }
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
