# csvagent — contesto per Claude Code

## Cos'è
Agent Node.js che analizza CSV di spese personali via browser.
Express + Claude API (tool calling) + agentic loop.

## Stack
- Node.js ESM (`"type": "module"`)
- Express 5
- @anthropic-ai/sdk ^0.95.0
- csv-parse ^5.5.6
- dotenv ^17.4.2
- dayjs (date parsing HOME dataset, con customParseFormat plugin)
- PM2 per persistenza

## Struttura
```
csvagent/
├── server.js          # entry point — Express + agent loop + tools
├── public/index.html  # WebUI — form domanda + visualizzazione risposta
├── ecosystem.config.cjs  # configurazione PM2
├── data/
│   ├── BIKE.csv       # spese ciclismo, 403 righe, 2016–2025
│   └── HOME.csv       # spese casa/famiglia, 4037 righe, 2014–2025
├── .env               # ANTHROPIC_API_KEY
├── CLAUDE.md          # questo file
├── todo.md            # task aperti
└── CHANGELOG.md       # storia delle modifiche
```

## Dataset BIKE
Colonne: ANNO, MESE, COSA, QUANTO, DOVE, MOTIVO, CATEGORIA, NOTE
Prima riga del CSV è vuota — il parser la skippa (slice(1))
QUANTO può essere negativo (rimborsi)

## Dataset HOME
Colonne originali CSV: CHI, DOVE, QUANTO, CAT, QUANDO, MESE, ANNO
Colonne in memoria: CHI, COSA (←DOVE), QUANTO, CATEGORIA (←CAT), QUANDO
MESE e ANNO derivati da QUANDO (formato d/m/yyyy o dd/mm/yyyy) via dayjs
CATEGORIA normalizzata: .trim().toLowerCase()
SharedN e SharedL → rinominati Shared (senza deduplicare le righe)
CHI values: Nicola, Leti, Shared

## Agent loop
- Max iterazioni: 5
- max_tokens: 1024
- Modello: selezionabile dal body /api/ask, default claude-haiku-4-5
- Tool disponibili: query_data (operation: list/sum/avg/count/group_by/top_n/trend/anomalies), run_js (codice JS arbitrario su rows, timeout 3s)
- Schema iniettato nel system prompt (no tool get_schema)
- Prompt caching attivo sul system prompt (cache_control: ephemeral)
- Output strutturato: { summary, insights[], warnings[], raw_data }
- Conversational history: `history[]` passato dal client nel body di /api/ask; `messages` = `[...history, { role: 'user', content }]`

## WebUI — toolbar
- Select dataset: 🚴 Ciclismo / 🏠 Casa (reset history al cambio)
- Select modello: Haiku / Sonnet / Opus
- Select window size: 4 / 6 / 10 / 20 messaggi (default 6) — sliding window sulla history prima di ogni invio
- Bottone NEW: azzera conversationHistory[] e ripristina empty state; pulisce le card residue alla prima domanda successiva

## Convenzioni commit
- Ogni commit include sempre il co-autore:
  `Co-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>`

## Regole di modifica
- Non toccare parti non correlate al task
- Modifiche minime e sicure
- Mantieni backward compatibility
- Mostra diff e aspetta conferma per: modifiche a logica, system prompt, architettura, route, tool
- Applica direttamente senza chiedere per: rimozione log, aggiornamento documentazione, modifiche CSS, cleanup
- Testa con `node server.js` dopo ogni modifica
- Se il server non parte, controlla prima `ANTHROPIC_API_KEY` nel .env

## Documentazione
Quando viene richiesto di aggiornare la documentazione (o "tutti i file .md del progetto"):
- **todo.md** — rimuovere le voci spuntate `[x]`, non spostarle
- **CHANGELOG.md** — aggiungere una entry con data e descrizione delle modifiche
- **CLAUDE.md** — aggiornare sezioni impattate dalle modifiche (stack, struttura, dataset, agent loop)

## Comandi utili
```bash
pm2 start server.js --name csvagent
pm2 restart csvagent
pm2 logs csvagent
curl http://localhost:3333/api/schema
```
