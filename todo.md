# csvagent — TODO

## 🟡 UX / WebUI
- [ ] UI language support (IT/EN+) — oggetto LANG inline, selector in toolbar, localStorage

## 💡 Feature Backlog
- [ ] Save conversation to localStorage
- [ ] Query history
- [ ] Savings suggestions
- [ ] Budget alert: soglia per categoria/anno
- [ ] Cross-dataset queries (BIKE + HOME insieme)
- [ ] HTML report generation (scaricabile)
- [ ] run_js output as formatted table in UI
- [ ] Domande rapide dedicate al dataset HOME

## 🔵 Future / Explorations
- [ ] Evaluate migration to OpenRouter — requires agent loop rewrite, not drop-in compatible with @anthropic-ai/sdk

## 🔵 Option B — Google Sheets + MCP (deferred)
- [ ] Define when Option A is considered "stable"
- [ ] Research MCP server for Google Sheets (existing or custom)
- [ ] Update "Approach" section in system prompt
- [ ] Test Google Sheets authentication via MCP
- [ ] Evaluate impact on multi-dataset architecture (BIKE + HOME)
