import { z } from "zod";

type JsonSchema = Record<string, unknown>;

export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  return convert(schema);
}

function convert(schema: z.ZodTypeAny): JsonSchema {
  const def = (schema as any)._def;
  const desc = (schema as any).description;
  const out = render(schema, def);
  if (typeof desc === "string" && desc.length > 0) out.description = desc;
  return out;
}

function render(schema: z.ZodTypeAny, def: any): JsonSchema {
  if (schema instanceof z.ZodString) return { type: "string" };
  if (schema instanceof z.ZodNumber) {
    return def.checks?.some((c: any) => c.kind === "int") ? { type: "integer" } : { type: "number" };
  }
  if (schema instanceof z.ZodBoolean) return { type: "boolean" };

  if (schema instanceof z.ZodLiteral) {
    const v = def.value;
    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean") return { type: t, const: v };
    throw new Error(`zodToJsonSchema: literal of type ${t} not supported`);
  }

  if (schema instanceof z.ZodEnum) {
    return { type: "string", enum: [...def.values] };
  }

  if (schema instanceof z.ZodNativeEnum) {
    const values = Object.values(def.values).filter((v) => typeof v === "string" || typeof v === "number");
    const allStrings = values.every((v) => typeof v === "string");
    return { type: allStrings ? "string" : "number", enum: values };
  }

  if (schema instanceof z.ZodArray) {
    const item = convert(def.type);
    const out: JsonSchema = { type: "array", items: item };
    if (typeof def.minLength?.value === "number") out.minItems = def.minLength.value;
    if (typeof def.maxLength?.value === "number") out.maxItems = def.maxLength.value;
    return out;
  }

  if (schema instanceof z.ZodObject) {
    const shape = def.shape();
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const key of Object.keys(shape)) {
      const child: z.ZodTypeAny = shape[key];
      properties[key] = convert(child);
      if (!isOptional(child)) required.push(key);
    }
    const out: JsonSchema = { type: "object", properties, additionalProperties: false };
    if (required.length > 0) out.required = required;
    return out;
  }

  if (schema instanceof z.ZodOptional) {
    return convert(def.innerType);
  }
  if (schema instanceof z.ZodDefault) {
    return convert(def.innerType);
  }
  if (schema instanceof z.ZodNullable) {
    const inner = convert(def.innerType);
    if (typeof inner.type === "string") return { ...inner, type: [inner.type, "null"] };
    return { anyOf: [inner, { type: "null" }] };
  }

  if (schema instanceof z.ZodUnion) {
    return { anyOf: def.options.map((o: z.ZodTypeAny) => convert(o)) };
  }

  if (schema instanceof z.ZodRecord) {
    return { type: "object", additionalProperties: convert(def.valueType) };
  }

  throw new Error(`zodToJsonSchema: unsupported Zod type ${schema.constructor.name}`);
}

function isOptional(schema: z.ZodTypeAny): boolean {
  return schema instanceof z.ZodOptional || schema instanceof z.ZodDefault;
}
