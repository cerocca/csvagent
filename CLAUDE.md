# csvagent — context for Claude Code

## What it is
Node.js agent that analyzes personal expense CSVs via a browser interface.
Express + Claude API (tool calling) + agentic loop.

## Stack
- Node.js ESM (`"type": "module"`)
- Express 5
- @anthropic-ai/sdk ^0.95.0
- csv-parse ^5.5.6
- dotenv ^17.4.2
- dayjs (date parsing for HOME dataset, with customParseFormat plugin)
- PM2 for persistence

## Structure
```
csvagent/
├── server.js          # entry point — Express + agent loop + tools
├── public/index.html  # WebUI — question form + response display
├── ecosystem.config.cjs  # PM2 configuration
├── data/
│   ├── BIKE.csv       # cycling expenses, 403 rows, 2016–2025
│   └── HOME.csv       # household/family expenses, 4037 rows, 2014–2025
├── .env               # ANTHROPIC_API_KEY
├── CLAUDE.md          # this file
├── TODO.md            # open tasks
└── CHANGELOG.md       # change history
```

## BIKE Dataset
Columns: ANNO, MESE, COSA, QUANTO, DOVE, MOTIVO, CATEGORIA, NOTE
First CSV row is empty — the parser skips it (slice(1))
QUANTO can be negative (refunds)

## HOME Dataset
Original CSV columns: CHI, DOVE, QUANTO, CAT, QUANDO, MESE, ANNO
In-memory columns: CHI, COSA (←DOVE), QUANTO, CATEGORIA (←CAT), QUANDO
MESE and ANNO derived from QUANDO (format d/m/yyyy or dd/mm/yyyy) via dayjs
CATEGORIA normalized: .trim().toLowerCase()
SharedN and SharedL → renamed to Shared (without deduplicating rows)
CHI values: Nicola, Leti, Shared

## Agent loop
- Max iterations: 5
- max_tokens: 1024
- Model: selectable from /api/ask body, default claude-haiku-4-5
- Available tools: query_data (operation: list/sum/avg/count/group_by/top_n/trend/anomalies), run_js (arbitrary JS code on rows, 3s timeout)
- Schema injected into system prompt (no get_schema tool)
- System prompt: shared BASE_PROMPT + BIKE_SYSTEM_PROMPT / HOME_SYSTEM_PROMPT per dataset
- Prompt caching active on system prompt (cache_control: ephemeral)
- Structured output: { summary, insights[], warnings[], raw_data }
- Conversational history: `history[]` passed by client in /api/ask body; `messages` = `[...history, { role: 'user', content }]`

## API Routes
- `POST /api/ask` — conversational agent loop, dataset-aware, model selectable
- `GET /api/schema?dataset=BIKE|HOME` — returns dataset schema
- `GET /api/version` — version from package.json
- `POST /api/report` — generates standalone HTML report with aggregated data, model: claude-sonnet-4-5
- `POST /api/suggest` — generates savings suggestions standalone HTML, model: claude-sonnet-4-5

## WebUI — toolbar
- Dataset select: 🚴 Ciclismo / 🏠 Casa (history reset on change)
- Model select: Haiku / Sonnet / Opus — visible only in Domanda mode
- Window size select: 4 / 6 / 10 / 20 messages (default 6) — sliding window on history before each send; visible only in Domanda mode
- NEW button: clears conversationHistory[], removes active dataset's localStorage key, restores empty state; clears residual cards on next question
- "↩ Riprendi" button: appears only if a saved session exists for the active dataset; restores cards and conversationHistory[] from localStorage; hidden in Report/Suggerimenti mode
- UI language: Italian only. Internationalization (i18n) planned for a future release.

### Adaptive UI per mode (`setMode(mode)`)
- **Domanda mode**: full UI — textarea, model select, window select, "Chiedi" button, "↺ Nuova", "↩ Riprendi" (if session exists)
- **Report / Suggerimenti mode**: only year-range selectors and action button (Genera report / Genera suggerimenti) visible; textarea, model select, window select, "Chiedi", "↺ Nuova", and "↩ Riprendi" are all hidden; action panel meta row already shows model (Sonnet) and output type

### Year range selectors (Anno da / Anno a)
- Visible only in Report and Suggerimenti modes
- Options populated dynamically from `schema.years` of the active dataset via `populateYearSelects(years)`, called inside `loadSchema()`; reset on dataset change
- Default: both set to "Tutto" (no filter)
- Client-side validation: if both are set and yearFrom > yearTo, an inline error message blocks the API call
- yearFrom === yearTo is valid (filters a single year)
- Values sent to `/api/report` and `/api/suggest` as `yearFrom` (number|null) and `yearTo` (number|null)

## WebUI — CRONOLOGIA sidebar
- Section in sidebar between DATI and SCHEMA
- `renderHistoryList()`: reads localStorage (same key as active session), shows questions from most recent to oldest
- Each entry: text truncated to 40 chars, `title` with full text; click → `showSavedResult()` mounts card via `buildCard()` without API call and without modifying `conversationHistory[]`
- Empty list: muted text "Nessuna cronologia"
- Auto-updated after `saveSession`, `clearSession`, `resumeSession`, dataset change, init

## WebUI — localStorage session
- Key: `csvagent_conv_BIKE` or `csvagent_conv_HOME` (depends on active dataset)
- Structure: `[{ question, result }]` where `result` is the full JSON (summary, insights, warnings, raw_data, chart)
- Save: automatic on each response received
- Restore: manual via "↩ Riprendi" button (never automatic on reload or dataset change)
- Dataset change: updates Riprendi button visibility without restoring
- Errors (quota, etc.): handled silently with try/catch

## Commit conventions
- Every commit always includes the co-author:
  `Co-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>`

## Editing rules
- Do not touch parts unrelated to the task
- Minimal and safe changes
- Maintain backward compatibility
- Show diff and wait for confirmation for: logic changes, system prompt, architecture, routes, tools
- Apply directly without asking for: log removal, documentation updates, CSS changes, cleanup
- Test with `node server.js` after each change
- If the server doesn't start, check `ANTHROPIC_API_KEY` in .env first

## Documentation
When asked to update documentation (or "all .md files in the project"):
- **TODO.md** — remove checked items `[x]`, do not move them
- **CHANGELOG.md** — add an entry with date and description of changes
- **CLAUDE.md** — update sections affected by changes (stack, structure, dataset, agent loop)

## Useful commands
```bash
pm2 start server.js --name csvagent
pm2 restart csvagent
pm2 logs csvagent
curl http://localhost:3333/api/schema
```
