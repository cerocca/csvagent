# csvagent — TODO

## 🟡 UX / WebUI
- [ ] UI language support (IT/EN+) — oggetto LANG inline, selector in toolbar, localStorage

## 🔧 Code Quality
- [ ] Unificare SYSTEM_PROMPT e HOME_SYSTEM_PROMPT (60% duplicato) — estrarre base comune, specializzare per dataset
- [x] Allineare schema keys: SCHEMA.totalRows → count (come HOME_SCHEMA) per eliminare il workaround `totalRows ?? count` nel frontend

## 💡 Feature Backlog
- [ ] Savings suggestions
- [ ] HTML report generation (scaricabile)

## 🔵 Future / Explorations
- [ ] OpenRouter migration — requires agent loop rewrite, not drop-in compatible with @anthropic-ai/sdk

## 🔵 Option B — Google Sheets + MCP (deferred)
- [ ] Define when Option A is considered "stable"
- [ ] Research MCP server for Google Sheets (existing or custom)
- [ ] Update "Approach" section in system prompt
- [ ] Test Google Sheets authentication via MCP
- [ ] Evaluate impact on multi-dataset architecture
