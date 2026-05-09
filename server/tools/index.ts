import type { ToolSpec, Principal, ToolError } from "./types";
import { toolError } from "./types";
import { zodToJsonSchema } from "./zodToJsonSchema";
import { getCached, putCache, getToolTtl } from "../agent/cache";

const registry = new Map<string, ToolSpec>();

export function register(spec: ToolSpec): void {
  if (registry.has(spec.name)) {
    throw new Error(`Tool ${spec.name} already registered`);
  }
  registry.set(spec.name, spec);
}

export function get(name: string): ToolSpec | undefined {
  return registry.get(name);
}

export function all(): ToolSpec[] {
  return Array.from(registry.values());
}

export interface BedrockToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export function bedrockToolDefs(): BedrockToolDef[] {
  return all().map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: zodToJsonSchema(t.inputSchema) as Record<string, unknown>,
  }));
}

export interface ToolExecutionSuccess<T = unknown> {
  ok: true;
  output: T;
}
export interface ToolExecutionFailure {
  ok: false;
  error: ToolError;
}
export type ToolExecutionResult<T = unknown> = ToolExecutionSuccess<T> | ToolExecutionFailure;

export async function executeTool(
  name: string,
  rawInput: unknown,
  principal: Principal,
): Promise<ToolExecutionResult> {
  const spec = registry.get(name);
  if (!spec) {
    return { ok: false, error: toolError("unknown_tool", `Tool '${name}' is not registered`, false) };
  }

  const parsedInput = spec.inputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    return {
      ok: false,
      error: toolError("validation", `Input validation failed: ${parsedInput.error.message}`, true),
    };
  }

  let output: unknown;
  try {
    // P2.3: Check cache before executing
    if (getToolTtl(name)) {
      const cached = await getCached(name, parsedInput.data, principal.sub);
      if (cached != null) {
        return { ok: true, output: cached };
      }
    }
    output = await spec.execute(principal, parsedInput.data);
  } catch (err: any) {
    return {
      ok: false,
      error: toolError("execution", err?.message || "Tool execution threw", false),
    };
  }

  const parsedOutput = spec.outputSchema.safeParse(output);
  if (!parsedOutput.success) {
    return {
      ok: false,
      error: toolError("execution", `Tool '${name}' produced invalid output: ${parsedOutput.error.message}`, false),
    };
  }

  // P2.3: Store in cache
  if (getToolTtl(name)) {
    putCache(name, parsedInput.data, parsedOutput.data, principal.sub).catch(() => {});
  }

  return { ok: true, output: parsedOutput.data };
}
