# CHANGELOG

## [0.5.1] — 2026-05-10
### Fixed
- Response card collassate dopo fix scroll — aggiunto `flex-shrink: 0` a `.response-card`, `.loading-card`, `.error-card`
- Scroll area risposte non attiva — aggiunto `grid-template-rows: 1fr` su `.layout` e `min-height: 0` su `.results`

## [0.5.0] — 2026-05-09
### Added
- `GET /api/version` → reads version from package.json, returns `{ version }`
- `GET /api/schema?dataset=BIKE|HOME` → returns schema for the selected dataset
- Dark/light theme toggle in sidebar with localStorage persistence
- Dynamic API status indicator in header (online/offline dot, 30-second polling)
- Dynamic schema card per dataset: row count, period, category count
- Dynamic version display in sidebar footer (fetched from `/api/version`)
- Markdown rendering in response cards: `**bold**` → `<strong>`, `*italic*` → `<em>`, `- ` lines → `<ul>` list items; applied to summary, insights, and warnings
### Changed
- Full UI restyling (Claude Design handoff)
- Header: removed static dataset/schema pills; replaced "connesso" with dynamic API status
- Sidebar: dataset selector moved from ask bar; GitHub link corrected; schema and version now dynamic
- Ask bar: dataset selector removed (moved to sidebar); generic placeholder; "memoria" → "contesto" label
- Fonts: DM Sans throughout response cards (summary, insights, warnings, loading card); serif removed from cards
- package.json version corrected from 1.0.0 and aligned to changelog, bumped to 0.5.0

## [0.4.0] — 2026-05-08
### Added
- Client-side conversational history: `conversationHistory[]` array with `{ role, content }` pairs (content = summary)
- Configurable sliding window from UI: select 4/6/10/20 messages, default 6
- NEW button in toolbar: clears history and restores empty state
- Automatic history reset on dataset change
- Cleanup of stale `.response-card` and `.error-card` on first question after reset
- Chart generation via `buildChart`: separate Haiku call (max_tokens 256, no tool, no system prompt), triggered by keywords ("grafico", "chart", "visualizza", "mostrami")
- Chart.js in UI: bar, line, pie rendering with "Save PNG" button (canvas.toDataURL)
- `chart` as top-level field in JSON response, separate from `raw_data`
### Changed
- `runAgent` accepts new `history = []` parameter; `messages` built as `[...history, { role: 'user', content }]`
- `/api/ask` reads `history` from body, calls `buildChart` after `runAgent`, adds `result.chart`
- System prompt updated: `chart` declared as top-level output JSON field

## [0.3.0] — 2025-05-07
### Added
- HOME dataset integration (4037 rows, 2014–2025)
- HOME.csv parser: column aliases, CATEGORIA normalization, D/M/YYYY date parsing via dayjs
- CHI: SharedN/SharedL renamed to Shared (rows unchanged)
- DATASETS dict `{ BIKE, HOME }` in server.js
- Dedicated HOME_SYSTEM_PROMPT
- Dataset selector in UI (🚴 Cycling / 🏠 Home)
- Model selector in UI (Haiku / Sonnet / Opus)
- PM2 configured with ecosystem.config.cjs, systemd startup enabled
### Changed
- MAX_ITER 10 → 5
- max_tokens 4096 → 1024
- Model selectable from `/api/ask` body, default claude-haiku-4-5
- `get_schema` tool removed, schema injected into system prompt
- Prompt caching active on system prompt (`cache_control: ephemeral`)
- `executeTool` and `runAgent` refactored for multi-dataset support

## [0.2.0] — 2025-05-06
### Added
- SVG icon for homepage (viewBox 680×680, dark theme)
- HOME.csv structure analysis (4037 rows, 2014–2025)
- Architecture decisions for HOME dataset: column aliases, date parsing, category normalization, SharedN/SharedL handling
- API cost optimization strategy defined (model, tokens, iterations, prompt caching, schema injection)
- Workflow defined: claude.ai for design/architecture, Claude Code for execution
- CLAUDE.md for Claude Code context
- CHANGELOG.md
### Changed
- Fix `.env` → added `import 'dotenv/config'` in server.js
- Fix `index.html` moved to `public/index.html`
- Updated claude.ai project instructions (Option A/B, stack, dataset, style)

## [0.1.0] — 2025-05-06
### Added
- Base project structure (`server.js`, `public/index.html`, `package.json`)
- BIKE.csv parser (403 rows, 2016–2025)
- Agent loop with tool calling (`query_data`, `get_schema`)
- Tool operations: `list`, `sum`, `avg`, `count`, `group_by`, `top_n`, `trend`, `anomalies`
- Structured output `{ summary, insights[], warnings[], raw_data }`
- Dark terminal-style WebUI with preset quick questions
- Express server on port 3333
