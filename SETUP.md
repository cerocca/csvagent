# csvagent — Setup

## Prerequisites

- Node.js 18+
- PM2 (`npm install -g pm2`)
- Anthropic API key

## Installation

```bash
git clone https://github.com/cerocca/csvagent
cd csvagent
cp .env.example .env       # add ANTHROPIC_API_KEY
npm install
node server.js             # or: pm2 start ecosystem.config.cjs
```

Open `http://localhost:3333`.

## Adding a dataset

### 1. Add the CSV file

Place your CSV in `data/`. Example: `data/MYDATA.csv`.

### 2. Write the parser

In `server.js`, add a parse function modeled after the existing ones:

```js
const MY_RECORDS = parseCSV('data/MYDATA.csv', (rows) =>
  rows.map(r => ({
    FIELD1: r['Column1']?.trim(),
    FIELD2: parseFloat(r['Column2']) || 0,
    YEAR:   parseInt(r['Year']) || 0,
    // ...
  })).filter(r => r.YEAR > 0)
);
```

Date parsing with dayjs (if needed):

```js
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(customParseFormat);

const date = dayjs(r['Date'], 'D/M/YYYY');
const MONTH = date.month() + 1;
const YEAR  = date.year();
```

### 3. Define schema

```js
const MY_SCHEMA = {
  columns: ['FIELD1', 'FIELD2', 'YEAR'],
  rowCount: MY_RECORDS.length,
  period: '2020–2025'
};
```

### 4. Add to DATASETS

```js
const DATASETS = {
  BIKE:   { records: BIKE_RECORDS,   schema: BIKE_SCHEMA },
  HOME:   { records: HOME_RECORDS,   schema: HOME_SCHEMA },
  MYDATA: { records: MY_RECORDS,     schema: MY_SCHEMA   }  // ← add
};
```

### 5. Write a system prompt

```js
const MYDATA_SYSTEM_PROMPT = `
Sei un agente che analizza dati di [...].
Colonne disponibili: FIELD1, FIELD2, YEAR.
...
- OBBLIGATORIO: chiama sempre almeno un tool prima di rispondere.
`;
```

### 6. Route the system prompt

In the `/api/ask` handler:

```js
const systemPrompt =
  dataset === 'HOME'   ? HOME_SYSTEM_PROMPT   :
  dataset === 'MYDATA' ? MYDATA_SYSTEM_PROMPT :
  SYSTEM_PROMPT;
```

### 7. Add the selector in UI

In `public/index.html`, add an option to the dataset `<select>`:

```html
<option value="MYDATA">📊 My Data</option>
```
