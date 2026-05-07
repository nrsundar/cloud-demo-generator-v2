# DemoForge — Design Handoff

A complete static-HTML design system for DemoForge, ready to retrofit onto the existing app at `https://main.d1s77hhl4y34ji.amplifyapp.com/`. Everything is single-file, vanilla HTML + CSS, inline SVG icons. No build step.

---

## Pages in this bundle

| File | Route | Purpose |
|---|---|---|
| `index.html` | `/` | Landing / Welcome — hero, features, "how it works", catalog preview, supported DBs, CTA. |
| `home.html` | `/home` | Dashboard — greeting, 4-stat row, AI Demo Catalog table with Download / Deploy / Cleanup actions, custom-demo CTA. |
| `generator.html` | `/generator` | **Hero page.** Conversational canvas with empty state, 4 turns showing the gathering → generating → complete flow, sticky composer, sticky DemoSpecCard rail, legend. |
| `my-requests.html` | `/my-requests` | User's request history with summary tiles, filterable table, and an open **Answer Questions** modal (3 questions, progress meter). |
| `admin.html` | `/admin` | Admin dashboard with 5 tabs (Demo Requests, Agent Actions, Repositories, Feedback, Bug Tracker), bulk-select bar, ops summary tiles. Tabs are JS-switchable. |
| `presentation.html` | `/presentation` | Fullscreen deck mode — title slide, slide thumbnails, prev/next nav controls, progress bar, keyboard hint. |

`_shell.css` contains the shared design tokens and shell styles as a reference. The HTML files are self-contained — every page inlines the CSS it needs.

---

## Design tokens

```css
/* Colors */
--bg:           #f4f6fb;          /* app background */
--panel:        #ffffff;          /* surface */
--panel-2:      #f7f9fc;          /* secondary surface */
--border:       #e5e9f0;          /* default border */
--border-strong:#d3d9e3;          /* emphasized border */
--text:         #0f172a;          /* primary text */
--text-muted:   #5b6678;          /* muted text */
--text-soft:    #8a94a6;          /* soft text */

--primary:      #2563eb;          /* primary blue */
--primary-700:  #1d4ed8;          /* primary hover */
--primary-50:   #eff6ff;          /* primary tint */
--accent-from:  #3b82f6;          /* gradient start */
--accent-to:    #7c3aed;          /* gradient end */

--success: #10b981;
--warning: #f59e0b;
--danger:  #ef4444;

/* Dark panels (sidebar, hero, confirmation cards) */
linear-gradient(180deg, #0b1020, #0f1735)

/* Radii */
--radius-sm: 8px;
--radius:    12px;     /* default */
--radius-lg: 16px;

/* Shadows */
--shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04);
--shadow-md: 0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
--shadow-lg: 0 16px 40px rgba(15, 23, 42, 0.08);

/* Layout */
--sidebar-w: 260px;
--topbar-h:  64px;

/* Type */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;  /* UI */
font-family: 'JetBrains Mono', monospace;                              /* code, badges, keys */
```

**Type scale**: H1 38px / 800, H2 20px / 700, H3 15px / 700, body 14px, small 12–13px. Letter-spacing `-0.01em` to `-0.02em` on headings.

---

## App shell (consistent across every page)

### Sidebar — 260px, dark gradient

- Brand block: 34px gradient square ("DF") + product name + uppercase subtitle "AI Demo Builder".
- Nav groups with uppercase labels: **Workspace** (Welcome / Dashboard / Generator / My Requests + count badge), **Resources** (User Guide / Presentation), **Management** (Admin Dashboard).
- Active item: gradient tint background + 2px left accent bar.
- Footer card: small "Pro Tier" upsell with gradient mini-button.

### Topbar — 64px, white, sticky

- Left: breadcrumbs `Workspace / [Page]`. Generator adds a `✦ Generative UI` gradient pill. Admin adds a `⚡ Admin` amber pill.
- Right: search pill (`⌘K` kbd hint), help icon, notification bell with red dot, avatar pill (gradient initials + name + chevron).

### Responsive

- ≤1100px: 3-col grids collapse to 2; right rails stack below content.
- ≤720px: sidebar hides entirely; search pill hides; tables become card stacks with `data-label` keys.

---

## Generative UI component library (Generator page)

Each component is rendered as a card with a mono-badge in its header naming the component type. The AI emits any combination of these at runtime.

| Component | Visual | Use |
|---|---|---|
| `Markdown` | AI prose, no card | Conversational text |
| `QuestionSingleSelect` | Radio-card grid (3 cols) | Pick one of N |
| `QuestionMultiSelect` | Checkbox card grid | Pick many |
| `QuestionSlider` | Gradient track/thumb, mono value | Numeric range |
| `QuestionText` | Styled input | Free text |
| `DatabasePicker` | DB-logo cards (matches home page DB tiles) | Pick AWS database |
| `ExtensionPicker` | Gradient mono badges + chips | Pick extensions |
| `AudienceProfile` | 3 persona cards w/ emoji | Architect / Developer / Executive |
| `DemoSpecCard` | Right-rail spec snapshot, edit affordances | Live spec |
| `InfraPreview` | 4-node arch diagram with arrows | Architecture |
| `SchemaPreview` | 2-col table preview, PK/FK badges | Schema |
| `CodePreview` | Dark code block, syntax highlighting | Code file |
| `ModuleList` | Numbered rows w/ titles, descriptions, durations | Learning modules |
| `CostEstimate` | Hourly/monthly + breakdown | Cost summary |
| `ProgressTimeline` | Animated dots (done ✓ / running pulse / pending) | Generation progress |
| `ConfirmationCard` | Dark gradient panel + Download/Push/Deploy CTAs | Final delivery |
| `ErrorCard` | Red-bordered card + suggestions | Failures |

### Worked examples

The Generator page demonstrates the pgvector RAG + healthcare flow. To validate variation, the same library should compose a visibly different page for a DynamoDB exec pitch:

| Element | pgvector RAG / healthcare | DynamoDB / gaming exec |
|---|---|---|
| Inferred fields | Aurora PG, pgvector, healthcare, technical | DynamoDB, single-table, gaming, executive |
| Asked questions | AudienceProfile (pre-selected Architect) + duration slider | AudienceProfile (pre-selected Executive) + scale slider |
| Result composition | InfraPreview + SchemaPreview + CodePreview + ModuleList + ConfirmationCard | InfraPreview + **CostEstimate (no SchemaPreview)** + exec-pitched ModuleList + ConfirmationCard |

---

## Reusable patterns (every page)

- **Button**: `.btn .btn-primary` (gradient), `.btn-outline`, `.btn-ghost`, `.btn-success`, `.btn-danger`, `.btn-ghost-light` (on dark surfaces).
- **Status badge**: `.badge-status.{ready|pending|failed|draft|review|approved}` with mono label and colored LED dot.
- **Extension chip**: `.ext-chip.{b|g|p|o|c|r}` — gradient mono badge for extension/feature names.
- **Filter pill**: `.filter-pill.active` — pill-shaped tab/filter with optional mono count.
- **Section header**: H2 + muted subhead + optional right-aligned link, used on every content section.
- **Card surface**: `#fff` bg / `#e5e9f0` border / 12px radius / `--shadow-sm`. Hover lifts 1–2px and intensifies shadow + border.
- **Mono number badge**: `font-family: 'JetBrains Mono'` 11px / 600, used for STEP / MODULE / QUESTION numbers and code references.
- **Dark hero / confirmation panel**: `linear-gradient(180deg, #0b1020, #0f1735)` + radial purple/cyan glows + faint 40px grid overlay masked to a center ellipse.

---

## Implementation notes for Kiro / AgentSpace

### Retrofit (do not rebuild)

The DemoForge app is already deployed. Reuse existing backend endpoints, auth, persistence, and component implementations wherever possible. The bundle is a **frontend redesign**, not a from-scratch build.

### Generator-specific contract

The agent must emit JSON of this shape on every turn:

```json
{
  "message": "string (markdown)",
  "components": [ /* GenNode[] from the library above */ ],
  "specSnapshot": { /* DemoSpecCard payload */ },
  "phase": "gathering" | "generating" | "complete" | "error"
}
```

Render `message` as Markdown using the body type scale, then components in order. Pin the latest `specSnapshot` into the right rail. `ProgressTimeline` updates in place during generation — bind it to whichever progress channel the existing backend already provides (SSE / polling / WebSocket).

### Constraints

- Zero new colors, fonts, radii, or shadows. Mirror existing patterns.
- Every interactive element needs visible hover + active states (already specified in the CSS).
- Mobile-first responsive: sidebar collapses below 720px, two-column layouts stack below 1100px.
- Component count stays small — prefer composition over variants.

### File preview

Open `index.html` first to anchor the visual system, then walk through `home.html → generator.html → my-requests.html → admin.html → presentation.html`. The Generator page is the centerpiece; everything else inherits its tokens.
