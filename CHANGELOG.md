# CHANGELOG

## [0.3.0] — 2025-05-07
### Aggiunto
- Integrazione dataset HOME (4037 righe, 2014–2025)
- Parser HOME.csv: alias colonne, normalizzazione CATEGORIA, parsing date D/M/YYYY via dayjs
- CHI: SharedN/SharedL rinominati in Shared (righe invariate)
- DATASETS dict { BIKE, HOME } in server.js
- HOME_SYSTEM_PROMPT dedicato
- Selettore dataset in UI (🚴 Ciclismo / 🏠 Casa)
- Selettore modello in UI (Haiku / Sonnet / Opus)
- PM2 configurato con ecosystem.config.cjs, startup systemd abilitato
### Modificato
- MAX_ITER 10 → 5
- max_tokens 4096 → 1024
- Modello selezionabile dal body /api/ask, default claude-haiku-4-5
- Tool get_schema rimosso, schema iniettato nel system prompt
- Prompt caching attivo sul system prompt (cache_control: ephemeral)
- executeTool e runAgent refactored per supporto multi-dataset

## [0.2.0] — 2025-05-06
### Aggiunto
- Icona SVG per Homepage (viewBox 680×680, tema dark)
- Analisi struttura HOME.csv (4037 righe, 2014–2025)
- Decisioni architetturali dataset HOME: alias colonne, date parsing, normalizzazione categorie, gestione SharedN/SharedL
- Strategia ottimizzazione costi API definita (modello, token, iter, prompt caching, schema injection)
- Workflow definito: claude.ai per design/architettura, Claude Code su Sibilla per esecuzione
- CLAUDE.md per contesto Claude Code
- CHANGELOG.md

### Modificato
- Fix `.env` → aggiunto `import 'dotenv/config'` in server.js
- Fix `index.html` spostato in `public/index.html`
- Istruzioni progetto claude.ai aggiornate (Opzione A/B, stack, dataset, stile)

## [0.1.0] — 2025-05-06
### Aggiunto
- Struttura progetto base (`server.js`, `public/index.html`, `package.json`)
- Parser BIKE.csv (403 righe, 2016–2025)
- Agent loop con tool calling (`query_data`, `get_schema`)
- Tool operations: `list`, `sum`, `avg`, `count`, `group_by`, `top_n`, `trend`, `anomalies`
- Output strutturato `{ summary, insights[], warnings[], raw_data }`
- WebUI dark terminal-style con domande rapide preimpostate
- Server Express su porta 3333
