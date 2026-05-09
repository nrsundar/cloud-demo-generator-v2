import { z } from "zod";

// SpecSnapshot must mirror @shared/schema's SpecSnapshot interface.
export const specSnapshotSchema = z
  .object({
    database: z.string(),
    extensions: z.array(z.string()),
    useCase: z.string(),
    industry: z.string().optional(),
    audience: z.string().optional(),
    durationMin: z.number().optional(),
    estCostHourly: z.string().optional(),
  })
  .strict();

// Each known GenNode type → its zod schema. Mirrors client/src/components/genui/types.ts.
const labelValue = z.object({ label: z.string(), value: z.string() });

export const genNodeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Markdown"), text: z.string() }),
  z.object({
    type: z.literal("QuestionSingleSelect"),
    id: z.string(),
    label: z.string(),
    helper: z.string().optional(),
    options: z.array(labelValue),
  }),
  z.object({
    type: z.literal("QuestionMultiSelect"),
    id: z.string(),
    label: z.string(),
    helper: z.string().optional(),
    max: z.number().optional(),
    options: z.array(labelValue),
  }),
  z.object({
    type: z.literal("QuestionSlider"),
    id: z.string(),
    label: z.string(),
    helper: z.string().optional(),
    min: z.number(),
    max: z.number(),
    step: z.number(),
    marks: z.array(z.object({ value: z.number(), label: z.string() })).optional(),
  }),
  z.object({
    type: z.literal("QuestionText"),
    id: z.string(),
    label: z.string(),
    placeholder: z.string().optional(),
    helper: z.string().optional(),
  }),
  z.object({
    type: z.literal("DatabasePicker"),
    id: z.string(),
    label: z.string(),
    recommended: z.array(z.string()).optional(),
    options: z.array(
      z.object({ label: z.string(), value: z.string(), description: z.string().optional() }),
    ),
  }),
  z.object({
    type: z.literal("ExtensionPicker"),
    id: z.string(),
    database: z.string(),
    suggested: z.array(z.string()),
    allowCustom: z.boolean(),
  }),
  z.object({
    type: z.literal("AudienceProfile"),
    id: z.string(),
    presets: z.array(
      z.object({ label: z.string(), value: z.string(), description: z.string().optional() }),
    ),
    customDepth: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("DemoSpecCard"),
    database: z.string(),
    extensions: z.array(z.string()),
    useCase: z.string(),
    industry: z.string().optional(),
    audience: z.string().optional(),
    durationMin: z.number().optional(),
    estCostHourly: z.string().optional(),
    editable: z.boolean(),
  }),
  z.object({
    type: z.literal("InfraPreview"),
    diagram: z.string().optional(),
    resources: z.array(
      z.object({ name: z.string(), type: z.string(), detail: z.string().optional() }),
    ),
    estimatedCost: z.string().optional(),
  }),
  z.object({
    type: z.literal("SchemaPreview"),
    tables: z.array(
      z.object({
        name: z.string(),
        columns: z.array(z.string()),
        rowCount: z.number().optional(),
      }),
    ),
    seedRowCount: z.number().optional(),
  }),
  z.object({
    type: z.literal("CodePreview"),
    language: z.string(),
    filename: z.string(),
    code: z.string(),
    highlights: z.array(z.number()).optional(),
  }),
  z.object({
    type: z.literal("ModuleList"),
    modules: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        difficulty: z.string().optional(),
      }),
    ),
  }),
  z.object({
    type: z.literal("CostEstimate"),
    hourly: z.string(),
    monthly: z.string(),
    breakdown: z.array(z.object({ service: z.string(), cost: z.string() })),
  }),
  z.object({
    type: z.literal("ProgressTimeline"),
    id: z.string(),
    steps: z.array(
      z.object({
        label: z.string(),
        status: z.enum(["complete", "active", "pending"]),
      }),
    ),
  }),
  z.object({
    type: z.literal("ConfirmationCard"),
    packageName: z.string(),
    sizeKb: z.number().optional(),
    fileCount: z.number().optional(),
    actions: z.array(
      z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary", "link"]),
        href: z.string().optional(),
        onClick: z.string().optional(),
      }),
    ),
  }),
  z.object({
    type: z.literal("ErrorCard"),
    title: z.string(),
    message: z.string(),
    suggestions: z.array(z.string()).optional(),
  }),
]);

export const PHASES = ["gathering", "generating", "complete", "error"] as const;
export type Phase = (typeof PHASES)[number];

// Strict envelope. components are validated component-by-component below so the loop
// can drop bad components (and ask the model to fix them) without rejecting the whole turn.
export const envelopeShapeSchema = z.object({
  message: z.string(),
  components: z.array(z.unknown()),
  specSnapshot: specSnapshotSchema.nullable().optional(),
  phase: z.enum(PHASES),
});

export interface ValidatedEnvelope {
  message: string;
  components: z.infer<typeof genNodeSchema>[];
  componentErrors: Array<{ index: number; reason: string }>;
  specSnapshot: z.infer<typeof specSnapshotSchema> | null;
  phase: Phase;
}

export type EnvelopeValidationResult =
  | { ok: true; envelope: ValidatedEnvelope }
  | { ok: false; error: string };

export function validateEnvelopeJson(text: string): EnvelopeValidationResult {
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    return { ok: false, error: `JSON parse failed: ${err.message}` };
  }

  const shape = envelopeShapeSchema.safeParse(parsed);
  if (!shape.success) {
    return { ok: false, error: shape.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }

  const components: z.infer<typeof genNodeSchema>[] = [];
  const componentErrors: Array<{ index: number; reason: string }> = [];
  shape.data.components.forEach((c, i) => {
    const r = genNodeSchema.safeParse(c);
    if (r.success) components.push(r.data);
    else componentErrors.push({ index: i, reason: r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") });
  });

  return {
    ok: true,
    envelope: {
      message: shape.data.message,
      components,
      componentErrors,
      specSnapshot: shape.data.specSnapshot ?? null,
      phase: shape.data.phase,
    },
  };
}
