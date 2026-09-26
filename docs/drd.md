# AgentDoctor — Design Requirements Document (DRD)

Version 1 · Companion to PRD.md, ARCHITECTURE.md, FRONTEND.md

## 1. Concept

AgentDoctor's tagline is "diagnose the cause, not just the symptom." The UI is built as a **diagnostic chart**, not a SaaS dashboard: finding → evidence → confidence → next step, in that order, everywhere it applies. This is the single idea every screen should be checked against.

Do not default to: gradient hero sections, identical rounded cards with soft drop shadows, icon-only buttons, tracked-out ALL-CAPS eyebrow labels, percentage-bar confidence meters, glowing accent text. These are the generic tells of an AI-agent pitch tool and actively work against the "not another dashboard" positioning in PROJECT_CONTEXT.md.

---

## 2. Design tokens

### 2.1 Color

Six colors total. The three accents are functional, not decorative — each maps to exactly one diagnostic state and must never appear for anything else.

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#15181D` | Base app background — everywhere that is chrome, not report |
| `--ink-raised` | `#1B1F26` | One step up from base — panel/frame backgrounds on dark surfaces |
| `--parchment` | `#DAD5C7` | The report surface only — Diagnosis Report card, generated regression test |
| `--parchment-dim` | `#C7C1AF` | Hover/pressed state on parchment surfaces |
| `--ink-on-parchment` | `#20211D` | Text color when placed on parchment |
| `--text` | `#C9C6BC` | Primary text on dark surfaces |
| `--text-dim` | `#8C8A82` | Secondary text, timestamps, rule lines, dividers |
| `--confirmed` | `#4C7A5C` | Verified hypothesis, passing regression test |
| `--divergent` | `#B0503C` | The mismatch itself — implicated event, failing/divergent node |
| `--pending` | `#C39A45` | Suspected but not yet verified |

Rule: never use `--divergent`/`--pending`/`--confirmed` as brand or navigation accents. If it's colored one of these three, it is asserting a diagnostic state.

### 2.2 Typography

IBM Plex family (Serif / Sans / Mono) — chosen because it's the actual IBM typeface, tying the visual identity to the hackathon sponsor rather than being an arbitrary pick.

| Face | Weights | Used for |
|---|---|---|
| IBM Plex Serif | 400, 500, 600 | Diagnosis headlines, root-cause statements, report prose |
| IBM Plex Mono | 400, 500 | Timestamps, evidence lines, log/diff content, generated test code, node labels |
| IBM Plex Sans | 400, 500, 600 | Navigation, buttons, form labels, all interface chrome |

Type scale (base 16px):

```
Display   36–44px   Plex Serif 500   — root cause statement only
H2        22–24px   Plex Serif 500   — section headers
H3        16–18px   Plex Sans 600    — panel titles
Body      14–15px   Plex Sans 400    — interface copy
Small     12–13px   Plex Mono 400    — timestamps, labels, evidence
```

No accenting a single word in a headline with italic/bold/color. No all-caps labels. No unnecessary eyebrow text above headings — if a label doesn't carry information (a real category, a real state), cut it.

### 2.3 Spacing & grid

- Base unit: 4px. Spacing values used: 4, 8, 12, 16, 24, 32, 48, 64.
- Content max-width: 760px for report/reading contexts, 1120px for graph/timeline contexts.
- No border-radius on report/data surfaces (sharp edges — this is a printed-chart aesthetic, not a soft app). Buttons may use a minimal 2px radius, nothing larger.
- Panels are separated by 1px rule lines (`--text-dim` at 14% opacity), never by shadow.

### 2.4 Motion

- Motion is reserved for state changes that answer a user action, never for entrance/scroll effects.
- The one deliberate animated moment in the product: the confidence delta after Failure Verification completes (old state crosses out or fades, new state settles in, ~300ms ease-out).
- Hover states: color/opacity shift only, no scale/translate, no glow.
- Respect `prefers-reduced-motion`: disable the confidence-delta animation and swap instantly instead.

---

## 3. Component specifications

### 3.1 Confidence indicator
Rendered as one of three words, never a bar or percentage: **Suspected** (pending color) → **Likely** (pending color, filled) → **Confirmed** (confirmed color). Percentage implies precision the rule-based ranker in BACKEND.md doesn't actually produce.

### 3.2 Evidence list
Plex Mono, each line prefixed with an em dash, not a bullet icon. Each line must be clickable/traceable back to its source Timeline event (per PRD 4.3 acceptance criteria — "linked to the diagnosis when relevant").

### 3.3 Buttons
Text-labeled, naming the exact action ("Run verification," "Generate regression test" — never "Submit" or "Go"). Primary action: filled with `--ink-on-parchment` or `--ink` depending on surface. Secondary: outline only. No icon-only buttons anywhere in the product.

### 3.4 Timeline row
`[timestamp — mono][event description — sans]`. The implicated event is marked three ways simultaneously (never color alone, for accessibility): a left border in `--divergent`, a subtle background tint, and the word "implicated" in mono at the row's end.

### 3.5 Dependency/environment node
Boxy, straight connector lines — a schematic/circuit-diagram treatment, not a glossy force-directed blob. Divergent node gets a `--divergent` border plus an inline label stating the actual mismatch ("expected 20.x, found 18.x"), not just a colored ring.

### 3.6 Connection/health status
Rendered as a plain status line in mono ("Backend: responding, 42ms"), not a colored dot alone.

### 3.7 Reconnecting state
An explicit banner across the affected view ("Reconnecting to session…"), never a blank or frozen screen. Required per ARCHITECTURE.md reliability notes and FRONTEND.md real-time behavior section.

---

## 4. Screen-by-screen requirements

### 4.1 Dashboard
- Backend health status line (3.6)
- Demo scenario picker: 2–3 named scripted failures, described in plain language of what will happen (not just a scenario ID)
- Recent sessions list if any exist: session id, timestamp, outcome, one line — no card grid

### 4.2 Diagnosis Report (primary screen — most visual weight per FRONTEND.md)
Single-column parchment surface (3-panel: report) placed on the dark app background. Order, top to bottom:
1. Session id + confidence state (3.1)
2. Root cause — Display-scale serif, one sentence
3. Evidence — mono list (3.2)
4. Affected components + suggested next step, side by side
5. Actions: "Run verification" / "Generate regression test" (3.3)

### 4.3 Agent Timeline
Vertical rail, rows per 3.4, chronological, expandable per row to raw payload (diff/command output).

### 4.4 Dependency & Environment Map
Schematic node graph per 3.5. Must visually distinguish current vs. expected state per PRD 4.4 acceptance criteria.

### 4.5 Verification Panel
1. States the hypothesis in plain language before running ("Rerunning under Node 22")
2. Live status while container executes
3. Before → after confidence shown as a delta (3.1 + motion spec 2.4), not two numbers the user has to compare manually

### 4.6 Regression Guard Panel
Shown only after a confirmed diagnosis (per PRD 4.6 scope). One action: "Generate test for this failure." Displays the generated test itself in mono (real code, not a description), plus pass/fail result.

---

## 5. Accessibility & quality floor

- Color never carries meaning alone (see 3.4, 3.5) — pair every state color with a label or shape change.
- Visible keyboard focus states on every interactive element.
- Responsive down to mobile width; wide content (evidence, code, graphs) scrolls in its own horizontal container rather than breaking page layout.
- Respect `prefers-reduced-motion` (2.4).
- Minimum contrast: parchment-on-ink and ink-on-parchment both exceed WCAG AA for body text.

---

## 6. Build directions (implementation notes)

Stack per FRONTEND.md: Next.js, React, Tailwind CSS, WebSocket client.

**Tailwind config** — extend theme rather than using arbitrary values inline:
```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      ink: '#15181D',
      inkRaised: '#1B1F26',
      parchment: '#DAD5C7',
      parchmentDim: '#C7C1AF',
      inkOnParchment: '#20211D',
      text: '#C9C6BC',
      textDim: '#8C8A82',
      confirmed: '#4C7A5C',
      divergent: '#B0503C',
      pending: '#C39A45',
    },
    fontFamily: {
      serif: ['"IBM Plex Serif"', 'Georgia', 'serif'],
      sans: ['"IBM Plex Sans"', 'sans-serif'],
      mono: ['"IBM Plex Mono"', 'monospace'],
    },
    borderRadius: {
      DEFAULT: '2px',
    },
  },
}
```

**Fonts:** load IBM Plex Serif/Sans/Mono via `next/font/google` rather than a runtime `<link>` tag, so weights are subset and self-hosted at build time.

**Component boundaries (suggested):**
```
/components
  /diagnosis
    ConfidenceState.tsx     — implements 3.1, drives the delta animation
    EvidenceList.tsx        — implements 3.2, links to timeline event ids
    ReportCard.tsx          — implements 4.2 layout
  /timeline
    TimelineRail.tsx        — implements 3.4
    TimelineRow.tsx
  /graph
    DependencyMap.tsx       — implements 3.5
    Node.tsx
  /verification
    VerificationPanel.tsx   — implements 4.5, owns the before/after delta
  /shared
    StatusLine.tsx          — implements 3.6
    ReconnectingBanner.tsx  — implements 3.7
    Button.tsx              — implements 3.3, primary/secondary variants only
```

**State/data:** every visual state above (Suspected/Likely/Confirmed, reconnecting, implicated event) should map directly to a field already defined in BACKEND.md's response shapes (`confidence`, WebSocket event types) — no new client-only state categories should be invented that don't correspond to something the backend actually emits.

**Definition of done for any new screen:** before marking a screen complete, check it against Section 1's rule and the avoid-list in Section 1 — if it could be mistaken for a generic dashboard template, it isn't done.
