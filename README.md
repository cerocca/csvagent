# csvagent

Agent Node.js per analisi di spese personali via browser.
Express + Claude API (tool calling) + agentic loop.

## Stack
- Node.js ESM
- Express 5
- @anthropic-ai/sdk
- csv-parse
- dayjs
- PM2

## Dataset supportati
- **BIKE** — spese ciclismo (2016–2025)
- **HOME** — spese domestiche/familiari (2014–2025)

## Avvio
```bash
cp .env.example .env   # aggiungi ANTHROPIC_API_KEY
npm install
node server.js         # oppure: pm2 start ecosystem.config.cjs
```

## Utilizzo
Apri http://localhost:3333, seleziona dataset e modello, fai una domanda in linguaggio naturale.

Esempi:
- "Totale spese 2024 per categoria"
- "Top 5 acquisti più costosi"
- "Trend mensile 2023 vs 2024"

## Architettura
Il server espone `/api/ask`. L'agent loop chiama Claude con tool calling,
esegue query analitiche sul CSV in memoria, restituisce JSON strutturato:
```json
{
  "summary": "...",
  "insights": ["..."],
  "warnings": ["..."],
  "raw_data": {}
}
```

## Variabili d'ambiente
| Variabile | Descrizione |
|---|---|
| ANTHROPIC_API_KEY | Chiave API Anthropic |

## Note
- I CSV con i dati personali non sono inclusi nel repo
- Default modello: claude-haiku-4-5 (modificabile da UI)
