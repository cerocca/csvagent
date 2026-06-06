# csvagent — TODO

## 🟡 UX / WebUI — Sessione 2 (mobile + tablet)

### #1 — Mobile: overflow-x
- Verificare su dispositivo reale se la sidebar fuoriesce dal viewport a 375px
- Se confermato: aggiungere `overflow-x: hidden` su `html, body` nel breakpoint `@media (max-width: 900px)`
- File: `public/index.html`

### #2 — Tablet: assenza quick questions
- Su viewport 768px la sidebar è in drawer mode: l'utente vede solo il form, nessun suggerimento visibile
- Soluzione A: aggiungere 2–3 quick questions inline nel main sotto l'ask-shell, visibili solo quando sidebar è chiusa
- Soluzione B: aggiungere un hint testuale "Apri il menu per le domande rapide" sotto l'ask-shell
- File: `public/index.html` (HTML + CSS + eventuale JS)

### #3 — Tablet: spazio morto tra ask-bar e empty state
- Su 768×1024 ci sono ~300px di sfondo vuoto tra il form e il simbolo €
- Soluzione: ridurre `padding` dell'empty state da `3rem` a `2rem`, oppure aggiungere `margin-top: auto`
- File: `public/index.html`
- Note: valutare dopo #2, potrebbe cambiare il layout

## 🔵 Future / Explorations
- [ ] OpenRouter migration — requires agent loop rewrite, not drop-in compatible with @anthropic-ai/sdk
- [ ] i18n support — UI language selector (IT/EN+), LANG object, localStorage persistence
- [ ] Option B: Google Sheets as data source via MCP — replace local CSVs; requires agent loop rewrite, MCP server setup, auth, multi-dataset impact evaluation
