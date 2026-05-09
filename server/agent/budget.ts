import type { AgentSession } from "@shared/schema";

export const MAX_ITERATIONS = 2;
export const MAX_TURN_LATENCY_MS = 55_000;
export const MAX_TOKENS_PER_TURN = 64_000;

export class BudgetExceededError extends Error {
  constructor(public readonly kind: "iterations" | "latency" | "tokens", message: string) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export interface TurnBudgetState {
  iterations: number;
  startedAt: number;
  tokensIn: number;
  tokensOut: number;
}

export function newBudgetState(): TurnBudgetState {
  return { iterations: 0, startedAt: Date.now(), tokensIn: 0, tokensOut: 0 };
}

export function checkBeforeIteration(state: TurnBudgetState, _session: AgentSession): void {
  if (state.iterations >= MAX_ITERATIONS) {
    throw new BudgetExceededError("iterations", `Exceeded MAX_ITERATIONS=${MAX_ITERATIONS}`);
  }
  if (Date.now() - state.startedAt > MAX_TURN_LATENCY_MS) {
    throw new BudgetExceededError("latency", `Exceeded MAX_TURN_LATENCY_MS=${MAX_TURN_LATENCY_MS}`);
  }
  if (state.tokensIn + state.tokensOut > MAX_TOKENS_PER_TURN) {
    throw new BudgetExceededError("tokens", `Exceeded MAX_TOKENS_PER_TURN=${MAX_TOKENS_PER_TURN}`);
  }
}

export function recordIteration(state: TurnBudgetState, tokensIn: number, tokensOut: number): void {
  state.iterations++;
  state.tokensIn += tokensIn;
  state.tokensOut += tokensOut;
}
