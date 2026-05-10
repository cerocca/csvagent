# csvagent

![version](https://img.shields.io/badge/version-0.6.0-blue)
![node](https://img.shields.io/badge/node-ESM-green)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

> A conversational AI agent for personal expense analysis, built on Anthropic SDK with tool calling.

## Features

- Natural language queries over CSV datasets
- Agentic loop with two tools: predefined operations and free-form JS execution
- Multi-dataset support with per-dataset schema and system prompt
- Conversational history with configurable sliding window
- Chart rendering (bar, line, pie) via Chart.js
- Dark/light theme, model selector (Haiku / Sonnet / Opus)

## Stack

- Node.js ESM · Express 5
- [@anthropic-ai/sdk](https://github.com/anthropic-ai/sdk-python) — tool calling, prompt caching
- csv-parse · dayjs · PM2

> ⚠️ Architecture is tightly coupled to Anthropic SDK. Not compatible drop-in with OpenRouter or OpenAI-style APIs.

## Quickstart

```bash
cp .env.example .env   # add ANTHROPIC_API_KEY
npm install
node server.js
```

Open `http://localhost:3333`.

## Bring your own CSV

Define your dataset in `server.js`:

```js
const DATASETS = {
  MYDATA: {
    records: parseMyCSV(),
    schema: { columns: [...], rowCount: N }
  }
};
```

## Documentation

See [SETUP.md](SETUP.md) for installation and dataset configuration.

## Agent tools

| Tool | Description |
|---|---|
| `query_data` | Predefined operations: list, sum, avg, count, group_by, top_n, trend, anomalies |
| `run_js` | Arbitrary JS executed on rows via `vm` sandbox (3s timeout) |

## Environment

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key |
