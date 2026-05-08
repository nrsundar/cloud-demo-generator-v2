import type { z } from "zod";

export interface Principal {
  sub: string;
  email: string;
  isAdmin?: boolean;
}

export interface ToolSpec<I extends z.ZodTypeAny = z.ZodTypeAny, O extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: I;
  outputSchema: O;
  execute(principal: Principal, input: z.infer<I>): Promise<z.infer<O>>;
}

export type ToolErrorKind = "validation" | "execution" | "permission" | "timeout" | "unknown_tool";

export interface ToolError {
  kind: ToolErrorKind;
  message: string;
  retryable: boolean;
}

export function toolError(kind: ToolErrorKind, message: string, retryable = false): ToolError {
  return { kind, message, retryable };
}
