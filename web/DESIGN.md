# SneakyToS — Frontend Design System & Architecture Reference

> **Project Design Name:** Obsidian Sentinel  
> **Source:** Stitch MCP Integration (`projects/7634272069574511833`)  
> **Aesthetic Archetype:** Technical Minimalist Developer Tooling × High-Density Cyber-Forensics  

---

## 1. System Vision & Atmosphere

**SneakyToS** is an AI-powered temporal policy diff engine designed to uncover permission-expanding changes across evolving Terms of Service and Privacy Policies.

The interface projects **authoritative vigilance**, **algorithmic precision**, and **uncompromising analytical clarity** for security researchers, privacy counsels, and discerning users. Information architecture is dense, structural, and deterministic, avoiding casual SaaS ornamentation in favor of a focused, distraction-free forensic audit workbench.

---

## 2. Color Palette & Token Taxonomy

The dark-mode palette uses deep slate/obsidian foundations to prioritize high-contrast semantic delta alerts without optical fatigue.

### 2.1 Surfaces & Canvas (Tonal Layering)

| Token Name | Hex Code | Semantic Role & Purpose |
| :--- | :--- | :--- |
| `surface-container-lowest` | `#060e20` / `#060e1c` | Bottom gutter tracks, deep recessed code wells |
| `surface` / `background` | `#0b1326` / `#0a1421` | Application base background, canvas viewport |
| `surface-container-low` | `#131b2e` / `#131c2a` | Inactive sidebars, subtle list backgrounds |
| `surface-container` | `#171f33` / `#17202e` | Default card containers, toolbar bases |
| `surface-container-high` | `#222a3d` / `#212a39` | Hover states, active list selections |
| `surface-container-highest`| `#2d3449` / `#2c3544` | Elevated dialogs, active pill backgrounds, tabs |
| `surface-bright` | `#31394d` / `#313a48` | Focused highlights, illuminated borders |

### 2.2 Text & Typography Hierarchy

| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| `on-surface` | `#dae2fd` / `#f8fafc` | Primary titles, prominent legal clauses, active labels |
| `on-surface-variant` | `#bdc8d1` / `#94a3b8` | Supporting descriptions, metadata, secondary body text |
| `outline` | `#87929a` / `#64748b` | Structural borders, inactive icons, timestamps |
| `outline-variant` | `#3e484f` / `#334155` | Subtle container borders, column dividers |

### 2.3 Semantic Delta Taxonomy (Risk & Permission Shift)

| Classification | Base Color | Tint / Background Fill | Border Style | Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **Regression / Danger** | `#ef4444` / `#ffb4ab` | `rgba(239, 68, 68, 0.12)` | `1px solid rgba(239, 68, 68, 0.35)` | **Permission-Expanding**: Broadens data collection, secondary use, or third-party sharing. |
| **Safeguard / Protected** | `#10b981` / `#4edea3` | `rgba(16, 185, 129, 0.12)` | `1px solid rgba(16, 185, 129, 0.35)` | **Permission-Restricting**: Restricts vendor use, introduces opt-outs, or enforces data retention limits. |
| **Ambiguity / Unclear** | `#f59e0b` / `#ffd65b` | `rgba(245, 158, 11, 0.12)` | `1px solid rgba(245, 158, 11, 0.35)` | **Subjective/Vague**: Replaces concrete durations with "reasonable period", introduces liability waivers. |
| **System / Neutral** | `#38bdf8` / `#8ed5ff` | `rgba(56, 189, 248, 0.10)` | `1px solid rgba(56, 189, 248, 0.30)` | **Cosmetic / Non-Semantic**: Re-numbering, formatting, typographic cleanups. |

---

## 3. Typography Hierarchy

| Role | Font Family | Size | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | `Geist`, sans-serif | 48px | 600 | 56px | `-0.03em` | Landing page title, primary banners |
| **Headline Lg** | `Geist`, sans-serif | 32px | 600 | 40px | `-0.025em` | Major view headers, policy titles |
| **Headline Md** | `Geist`, sans-serif | 24px | 500 | 32px | `-0.02em` | Section headers, card group titles |
| **Headline Sm** | `Geist`, sans-serif | 18px | 500 | 26px | `-0.015em` | Modal titles, ledger subheaders |
| **Clause Diff Body** | `Inter`, sans-serif | 13.5px | 400 | 24px | `-0.005em` | Side-by-side legal clause diff lines |
| **Body Lg** | `Inter`, sans-serif | 16px | 400 | 26px | `-0.01em` | Executive summaries, AI briefs |
| **Body Md** | `Inter`, sans-serif | 14px | 400 | 22px | `-0.005em` | General analytical descriptions |
| **Body Sm** | `Inter`, sans-serif | 13px | 400 | 20px | `0em` | Dense ledger card explanations |
| **Mono Gutter** | `JetBrains Mono`, monospace | 11px | 500 | 24px | `0em` | Line numbers, synchronized gutters |
| **Mono Code** | `JetBrains Mono`, monospace | 12px | 400 | 18px | `-0.01em` | JSON inspect, SHA tokens, anchors |
| **Mono Badge** | `JetBrains Mono`, monospace | 10.5px | 600 | 14px | `0.04em` | `#change-001`, `REGRESSION`, `MODIFIED` |

---

## 4. Spacing, Geometry & Radii

- **Core Radius (`rounded` / 4px):** Standard buttons, inputs, diff highlight chunks, tag chips.
- **Container Radius (`rounded-lg` / 8px):** Policy cards, ledger cards, inspector drawers, dropdowns.
- **Pill Radius (`rounded-full` / 9999px):** Semantic status badges, filter chips, active state markers.
- **Spacing Units:**
  - `space-xs`: `0.25rem` (4px)
  - `space-sm`: `0.5rem` (8px)
  - `space-md`: `1rem` (16px)
  - `space-lg`: `1.5rem` (24px)
  - `space-xl`: `2rem` (32px)

---

## 5. Screen Inventory & Architecture (Stitch MCP)

### Screen 1: Document Comparison Workspace (`47865f28f8c94ee49603b4deaebea2e1`)
- **Primary Workspace Layout:**
  - **Top Navigation Bar:** Breadcrumb, Snapshot selector (`OpenAI Privacy Policy: Nov 14, 2023 vs Jan 10, 2024`), View Mode toggles (`Split View` vs `Unified`), Scroll Sync lock (`LOCKED`), Change stepper (`Change 2 of 5`), Export button (`Export Audit PDF`).
  - **Left Sidebar (280px):** Policy Clause Navigator / TOC. Lists sections with colored risk dots (e.g. `● Sec 4: Information Use [High Risk]`).
  - **Center Viewport (Flexible 1fr):** Side-by-side synchronized diff view with line gutters, deleted lines in red/strikethrough, added lines with emerald/crimson/amber highlights according to permission classification.
  - **Right Sidebar (360px):** Discrepancy Ledger detailing each detected change (`#change-001` through `#change-005`), semantic shift tags (`EXPANSION`, `RESTRICTION`, `UNCLEAR`, `FORMAT`), plain-language explanation, and AI Forensic Summary card.

### Screen 2: AI Policy Diff & Forensic Audit Engine (`83cb2cd60f754bf182d9a417557b1899`)
- Advanced dual-zone ingestion workbench with real-time alignment metrics, token counters, clause segmentation status, and direct AST clause comparison visualization.

### Screen 3: Policy Intelligence Dashboard (`9405666869264aaeb7428fd770735fc1`)
- **Main Home View:**
  - Hero headline: *"Your privacy, without the fine print."*
  - Monitored metrics: Active Policies, Permission Expansions Detected, Unilateral Modification Rate.
  - Recent Comparisons table with risk rating chips, vendor icons, dates, and "View Comparison" CTA.
  - Quick action to launch New Comparison or upload a policy document.

### Screen 4: New Document Comparison (`273f5a6aabd948da87458aab0e1dcea7`)
- **Ingestion Modal/View:**
  - Tabbed input modes: *File Upload* (.pdf, .txt, .html), *Plain Text / Markdown*, *URL / Archive Snapshot*.
  - Dual comparison zones: Baseline Version (Version A) vs Candidate Version (Version B).
  - Scope configuration toggles (Data Collection, Data Use, Data Sharing, Data Retention).
  - "Run Temporal Semantic Diff" CTA.

---

## 6. Component Guidelines for Implementation

1. **Icons:** Reusable Lucide React icons (`ShieldAlert`, `CheckCircle2`, `HelpCircle`, `GitCompare`, `FileText`, `Lock`, `Unlock`, `ArrowRight`, `Download`, `Search`, etc.) aligned with Material Symbols fallbacks.
2. **Synchronized Diff Viewer:** Independent or synchronized scroll lock state between left (old) and right (new) viewports with synchronized line heights.
3. **Responsive Breakpoints:**
   - Desktop (`>=1280px`): Full 3-column layout (Navigator + Diff Viewport + Discrepancy Ledger).
   - Tablet (`768px - 1279px`): Right ledger collapses into a sliding slide-over drawer; diff toggle defaults to unified or compact mode.
   - Mobile (`<768px`): Sidebar and ledger collapse into bottom navigation sheets; single-column unified diff with version switchers.

