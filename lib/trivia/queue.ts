import type { TriviaQuestion } from "./packs";

export class QuestionQueue {
  private remaining: TriviaQuestion[] = [];
  constructor(private questions: TriviaQuestion[], private shuffle = true, private random = Math.random) {}
  next() {
    if (!this.questions.length) throw new Error("This trivia pack is empty.");
    if (!this.remaining.length) {
      this.remaining = [...this.questions];
      if (this.shuffle) for (let i = this.remaining.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [this.remaining[i], this.remaining[j]] = [this.remaining[j], this.remaining[i]]; }
    }
    return this.remaining.shift()!;
  }
}

export const validDelay = (seconds: number) => Number.isInteger(seconds) && seconds >= 3 && seconds <= 30;
