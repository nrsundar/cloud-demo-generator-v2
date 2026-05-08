import { z } from "zod";
import type { ToolSpec } from "./types";

// Static rate card — us-east-2 (Ohio), on-demand RDS / Aurora list prices.
// Sourced from AWS pricing pages. Demo-grade approximations; not for billing.

interface RateCardEntry {
  hourly: number;
  vcpu: number;
  memGb: number;
}

const COMPUTE: Record<string, RateCardEntry> = {
  // RDS / Aurora burstable (Graviton)
  "db.t4g.micro": { hourly: 0.016, vcpu: 2, memGb: 1 },
  "db.t4g.small": { hourly: 0.032, vcpu: 2, memGb: 2 },
  "db.t4g.medium": { hourly: 0.065, vcpu: 2, memGb: 4 },
  "db.t4g.large": { hourly: 0.129, vcpu: 2, memGb: 8 },
  // RDS / Aurora general purpose (Graviton)
  "db.r7g.large": { hourly: 0.252, vcpu: 2, memGb: 16 },
  "db.r7g.xlarge": { hourly: 0.504, vcpu: 4, memGb: 32 },
  "db.r7g.2xlarge": { hourly: 1.008, vcpu: 8, memGb: 64 },
  "db.r6g.large": { hourly: 0.24, vcpu: 2, memGb: 16 },
  "db.r6g.xlarge": { hourly: 0.48, vcpu: 4, memGb: 32 },
  "db.m6g.large": { hourly: 0.171, vcpu: 2, memGb: 8 },
  "db.m6g.xlarge": { hourly: 0.342, vcpu: 4, memGb: 16 },
  // ElastiCache (Redis)
  "cache.t4g.micro": { hourly: 0.016, vcpu: 2, memGb: 0.5 },
  "cache.r7g.large": { hourly: 0.226, vcpu: 2, memGb: 13.07 },
};

interface StorageRate {
  perGbMonth: number;
  iopsPerMonth?: number;
}
const STORAGE: Record<string, StorageRate> = {
  gp3: { perGbMonth: 0.115 },
  gp2: { perGbMonth: 0.115 },
  io1: { perGbMonth: 0.125, iopsPerMonth: 0.10 },
  "aurora-storage": { perGbMonth: 0.10 }, // Aurora I/O-optimized billed differently; close enough for a demo estimate.
};

const inputSchema = z.object({
  instanceType: z.string().describe("DB instance class, e.g. 'db.t4g.medium', 'db.r7g.large', 'cache.t4g.micro'."),
  region: z.string().default("us-east-2").describe("AWS region. Only us-east-2 is in the rate card; other regions return an estimate flag."),
  hoursPerMonth: z.number().min(0).max(744).default(744).describe("Expected runtime hours/month. 744 = always-on."),
  storageGb: z.number().min(0).default(20).describe("Allocated storage in GB."),
  storageType: z.enum(["gp3", "gp2", "io1", "aurora-storage"]).default("gp3"),
});

const outputSchema = z.object({
  instanceType: z.string(),
  region: z.string(),
  hourly: z.number(),
  monthly: z.number(),
  breakdown: z.object({
    computeMonthly: z.number(),
    storageMonthly: z.number(),
  }),
  isEstimate: z.boolean(),
  notes: z.string().optional(),
});

export const estimateInfraCost: ToolSpec<typeof inputSchema, typeof outputSchema> = {
  name: "estimateInfraCost",
  description:
    "Estimates monthly AWS cost for a database demo (compute + storage). Uses on-demand list prices for us-east-2. " +
    "Returns hourly and monthly figures suitable for a CostEstimate component. Other regions return isEstimate=true.",
  inputSchema,
  outputSchema,
  async execute(_principal, input) {
    const compute = COMPUTE[input.instanceType];
    const storage = STORAGE[input.storageType];
    const isEstimate = input.region !== "us-east-2" || !compute;

    const hourly = compute?.hourly ?? 0.10; // fallback: rough small-instance price
    const computeMonthly = round2(hourly * input.hoursPerMonth);
    const storageMonthly = round2((storage?.perGbMonth ?? 0.115) * input.storageGb);
    const monthly = round2(computeMonthly + storageMonthly);

    const notes = !compute
      ? `Instance type '${input.instanceType}' not in the local rate card; using a $${hourly.toFixed(3)}/hr fallback. Verify with AWS Pricing Calculator before quoting.`
      : input.region !== "us-east-2"
      ? `Rate card is us-east-2; region '${input.region}' may differ ±20%.`
      : undefined;

    return {
      instanceType: input.instanceType,
      region: input.region,
      hourly: round4(hourly),
      monthly,
      breakdown: { computeMonthly, storageMonthly },
      isEstimate,
      notes,
    };
  },
};

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
