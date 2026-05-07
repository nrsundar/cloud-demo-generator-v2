export type GenNode =
  | { type: "Markdown"; text: string }
  | { type: "QuestionSingleSelect"; id: string; label: string; helper?: string; options: { label: string; value: string }[] }
  | { type: "QuestionMultiSelect"; id: string; label: string; helper?: string; max?: number; options: { label: string; value: string }[] }
  | { type: "QuestionSlider"; id: string; label: string; helper?: string; min: number; max: number; step: number; marks?: { value: number; label: string }[] }
  | { type: "QuestionText"; id: string; label: string; placeholder?: string; helper?: string }
  | { type: "DatabasePicker"; id: string; label: string; recommended?: string[]; options: { label: string; value: string; description?: string }[] }
  | { type: "ExtensionPicker"; id: string; database: string; suggested: string[]; allowCustom: boolean }
  | { type: "AudienceProfile"; id: string; presets: { label: string; value: string; description?: string }[]; customDepth?: boolean }
  | { type: "DemoSpecCard"; database: string; extensions: string[]; useCase: string; industry?: string; audience?: string; durationMin?: number; estCostHourly?: string; editable: boolean }
  | { type: "InfraPreview"; diagram?: string; resources: { name: string; type: string; detail?: string }[]; estimatedCost?: string }
  | { type: "SchemaPreview"; tables: { name: string; columns: string[]; rowCount?: number }[]; seedRowCount?: number }
  | { type: "CodePreview"; language: string; filename: string; code: string; highlights?: number[] }
  | { type: "ModuleList"; modules: { name: string; description: string; difficulty?: string }[] }
  | { type: "CostEstimate"; hourly: string; monthly: string; breakdown: { service: string; cost: string }[] }
  | { type: "ProgressTimeline"; id: string; steps: { label: string; status: "complete" | "active" | "pending" }[] }
  | { type: "ConfirmationCard"; packageName: string; sizeKb?: number; fileCount?: number; actions: { label: string; variant: "primary" | "secondary" | "link"; href?: string; onClick?: string }[] }
  | { type: "ErrorCard"; title: string; message: string; suggestions?: string[] };

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  components?: GenNode[];
}

export interface SpecSnapshot {
  database: string;
  extensions: string[];
  useCase: string;
  industry?: string;
  audience?: string;
  durationMin?: number;
  estCostHourly?: string;
}
