import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import vm from 'vm';
dayjs.extend(customParseFormat);

const __dirname = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const app = express();
const PORT = 3333;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ─── Load CSV once at startup ─────────────────────────────────────────────────
// The real header is in row 0 of the CSV (row index 0 after parsing has "Unnamed" keys)
// Re-parse with correct header row
const rawCsv = readFileSync(join(__dirname, 'data', 'BIKE.csv'), 'utf8');
const lines = rawCsv.split('\n');
const dataLines = lines.slice(1).join('\n'); // skip first empty/meta row
const RECORDS = parse(dataLines, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  cast: (value, context) => {
    if (context.column === 'QUANTO') return parseFloat(value) || 0;
    if (context.column === 'ANNO') return parseInt(value) || 0;
    return value;
  }
}).filter(r => r.ANNO > 0); // drop empty rows

// ─── Load HOME.csv ────────────────────────────────────────────────────────────
const HOME_RAW = readFileSync(join(__dirname, 'data', 'HOME.csv'), 'utf8');
const HOME_RECORDS = parse(HOME_RAW, {
  columns: true, skip_empty_lines: true, trim: true,
}).map(r => {
  const d = dayjs(r.QUANDO, 'D/M/YYYY');
  if (!d.isValid()) return null;
  return {
    CHI: (r.CHI === 'SharedN' || r.CHI === 'SharedL') ? 'Shared' : r.CHI,
    COSA: r.DOVE,
    QUANTO: parseFloat(r.QUANTO) || 0,
    CATEGORIA: r.CAT.trim().toLowerCase(),
    QUANDO: r.QUANDO,
    ANNO: d.year(),
    MESE: d.month() + 1,
  };
}).filter(Boolean);

const HOME_SCHEMA = {
  categories: [...new Set(HOME_RECORDS.map(r => r.CATEGORIA))].sort(),
  years: [...new Set(HOME_RECORDS.map(r => r.ANNO))].sort((a, b) => a - b),
  chi: [...new Set(HOME_RECORDS.map(r => r.CHI))].sort(),
  count: HOME_RECORDS.length,
};

console.log(`✓ HOME CSV caricato: ${HOME_RECORDS.length} righe, anni ${HOME_SCHEMA.years[0]}–${HOME_SCHEMA.years.at(-1)}`);

const SCHEMA = {
  columns: ['ANNO', 'MESE', 'COSA', 'QUANTO', 'DOVE', 'MOTIVO', 'CATEGORIA', 'NOTE'],
  count: RECORDS.length,
  years: [...new Set(RECORDS.map(r => r.ANNO))].sort(),
  months: ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'],
  categories: [...new Set(RECORDS.map(r => r.CATEGORIA))].sort(),
  motivations: [...new Set(RECORDS.map(r => r.MOTIVO))].sort(),
  vendors: [...new Set(RECORDS.map(r => r.DOVE))].sort(),
};

console.log(`✓ CSV caricato: ${RECORDS.length} righe, anni ${SCHEMA.years[0]}–${SCHEMA.years.at(-1)}`);

const DATASETS = {
  BIKE: { records: RECORDS, schema: SCHEMA },
  HOME: { records: HOME_RECORDS, schema: HOME_SCHEMA },
};

// ─── run_js sandbox ───────────────────────────────────────────────────────────
function executeRunJs(code, rows) {
  try {
    const context = { rows, result: null };
    vm.createContext(context);
    vm.runInContext(`result = (function(rows){ ${code} })(rows)`, context, {
      timeout: 3000
    });
    const result = context.result;
    return { success: true, result: JSON.parse(JSON.stringify(result)) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Tools ────────────────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'query_data',
    description: `Esegui query analitiche sui dati di spesa. Puoi filtrare per anno, mese, categoria, vendor, motivo.
Parametri di filtro opzionali (tutti combinabili):
- anno: number o number[] 
- mese: string o string[] (es. "Gennaio")
- categoria: string o string[]
- dove: string o string[]
- motivo: string o string[] 
- quanto_min / quanto_max: soglie importo

Operazioni disponibili (operation):
- "list": ritorna le righe filtrate (max 50)
- "sum": somma QUANTO
- "avg": media QUANTO  
- "count": conteggio righe
- "group_by": raggruppa per campo (group_field) e calcola sum/avg/count
- "top_n": top N per QUANTO (n: number, default 10)
- "trend": totale per anno (o per mese se filtri un anno)
- "anomalies": righe con QUANTO oltre N deviazioni standard (threshold: number, default 2)`,
    input_schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list','sum','avg','count','group_by','top_n','trend','anomalies'] },
        filters: {
          type: 'object',
          properties: {
            anno: { oneOf: [{ type: 'number' }, { type: 'array', items: { type: 'number' } }] },
            mese: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], description: 'BIKE: nome mese (es. "Gennaio"). HOME: numero 1-12 come stringa (es. "1").' },
            chi: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], description: 'Solo HOME: Nicola, Leti, Shared' },
            categoria: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            dove: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            motivo: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            quanto_min: { type: 'number' },
            quanto_max: { type: 'number' },
          }
        },
        group_field: { type: 'string', description: 'Campo per group_by (es. CATEGORIA, DOVE, ANNO, MESE)' },
        n: { type: 'number', description: 'Per top_n' },
        threshold: { type: 'number', description: 'Per anomalies: soglia in deviazioni standard' }
      },
      required: ['operation']
    }
  },
  {
    name: 'run_js',
    description: 'Esegui codice JS arbitrario sui dati quando query_data non è sufficiente. rows è un array di oggetti plain. Usa solo: filter, reduce, map, sort, Math.*. Non usare: groupBy, sum, lodash o metodi non nativi. Restituisci sempre con return.',
    input_schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Corpo funzione JS. Riceve rows, deve restituire il risultato con return.'
        }
      },
      required: ['code']
    }
  }
];

// ─── Tool execution ───────────────────────────────────────────────────────────
function executeTool(name, input, records, schema) {
  console.log(`[tool] ${name}`, JSON.stringify(input).slice(0, 120));
  if (name === 'run_js') {
    const { code } = input;
    return JSON.stringify(executeRunJs(code, records));
  } else if (name === 'query_data') {
    const { operation, filters = {}, group_field, n = 10, threshold = 2 } = input;

    // Apply filters
    let rows = records.filter(r => {
      if (filters.anno !== undefined) {
        const years = Array.isArray(filters.anno) ? filters.anno : [filters.anno];
        if (!years.includes(r.ANNO)) return false;
      }
      if (filters.mese !== undefined) {
        const months = Array.isArray(filters.mese) ? filters.mese : [filters.mese];
        if (!months.some(m => String(r.MESE ?? '').toLowerCase() === String(m).toLowerCase())) return false;
      }
      if (filters.chi !== undefined) {
        const chis = Array.isArray(filters.chi) ? filters.chi : [filters.chi];
        if (!chis.some(c => r.CHI?.toLowerCase() === c.toLowerCase())) return false;
      }
      if (filters.categoria !== undefined) {
        const cats = Array.isArray(filters.categoria) ? filters.categoria : [filters.categoria];
        if (!cats.some(c => r.CATEGORIA?.toLowerCase() === c.toLowerCase())) return false;
      }
      if (filters.dove !== undefined) {
        const vendors = Array.isArray(filters.dove) ? filters.dove : [filters.dove];
        if (!vendors.some(v => r.DOVE?.toLowerCase()?.includes(v.toLowerCase()))) return false;
      }
      if (filters.motivo !== undefined) {
        const motivi = Array.isArray(filters.motivo) ? filters.motivo : [filters.motivo];
        if (!motivi.some(m => r.MOTIVO?.toLowerCase()?.includes(m.toLowerCase()))) return false;
      }
      if (filters.quanto_min !== undefined && r.QUANTO < filters.quanto_min) return false;
      if (filters.quanto_max !== undefined && r.QUANTO > filters.quanto_max) return false;
      return true;
    });

    const total = rows.reduce((s, r) => s + r.QUANTO, 0);
    const avg = rows.length ? total / rows.length : 0;

    switch (operation) {
      case 'list':
        return JSON.stringify({ count: rows.length, rows: rows.slice(0, 50) });

      case 'sum':
        return JSON.stringify({ sum: Math.round(total * 100) / 100, count: rows.length });

      case 'avg':
        return JSON.stringify({ avg: Math.round(avg * 100) / 100, count: rows.length });

      case 'count':
        return JSON.stringify({ count: rows.length });

      case 'group_by': {
        if (!group_field) return JSON.stringify({ error: 'group_field richiesto' });
        const grouped = {};
        for (const r of rows) {
          const key = r[group_field] ?? 'N/A';
          if (!grouped[key]) grouped[key] = { sum: 0, count: 0 };
          grouped[key].sum += r.QUANTO;
          grouped[key].count++;
        }
        const result = Object.entries(grouped)
          .map(([key, v]) => ({ [group_field]: key, sum: Math.round(v.sum * 100) / 100, count: v.count, avg: Math.round(v.sum / v.count * 100) / 100 }))
          .sort((a, b) => b.sum - a.sum);
        return JSON.stringify({ group_by: group_field, total_rows: rows.length, result });
      }

      case 'top_n': {
        const top = [...rows].sort((a, b) => b.QUANTO - a.QUANTO).slice(0, n);
        return JSON.stringify(top);
      }

      case 'trend': {
        const hasYearFilter = filters.anno !== undefined;
        if (hasYearFilter) {
          // trend per mese
          const grouped = {};
          for (const r of rows) {
            const key = r.MESE ?? 'N/A';
            if (!grouped[key]) grouped[key] = 0;
            grouped[key] += r.QUANTO;
          }
          let result;
          if (schema.months) {
            // BIKE: ordina per nome mese italiano
            result = schema.months
              .filter(m => grouped[m] !== undefined)
              .map(m => ({ MESE: m, sum: Math.round(grouped[m] * 100) / 100 }));
          } else {
            // HOME: ordina per numero mese 1-12
            result = Object.entries(grouped)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([mese, sum]) => ({ MESE: parseInt(mese), sum: Math.round(sum * 100) / 100 }));
          }
          return JSON.stringify({ trend: 'per_mese', result });
        } else {
          // trend per anno
          const grouped = {};
          for (const r of rows) {
            if (!grouped[r.ANNO]) grouped[r.ANNO] = 0;
            grouped[r.ANNO] += r.QUANTO;
          }
          const result = Object.entries(grouped)
            .sort(([a], [b]) => a - b)
            .map(([anno, sum]) => ({ ANNO: parseInt(anno), sum: Math.round(sum * 100) / 100 }));
          return JSON.stringify({ trend: 'per_anno', result });
        }
      }

      case 'anomalies': {
        const mean = avg;
        const std = Math.sqrt(rows.reduce((s, r) => s + Math.pow(r.QUANTO - mean, 2), 0) / rows.length);
        const anomalies = rows.filter(r => Math.abs(r.QUANTO - mean) > threshold * std);
        return JSON.stringify({ threshold_std: threshold, mean: Math.round(mean * 100) / 100, std: Math.round(std * 100) / 100, anomalies: anomalies.sort((a, b) => b.QUANTO - a.QUANTO) });
      }

      default:
        return JSON.stringify({ error: `Operazione sconosciuta: ${operation}` });
    }
  }

  return JSON.stringify({ error: `Tool sconosciuto: ${name}` });
}

// ─── Agent loop ───────────────────────────────────────────────────────────────
const client = new Anthropic();

const BASE_PROMPT = `
Regole:
- OBBLIGATORIO: chiama sempre almeno un tool prima di rispondere. Non rispondere mai basandoti su conoscenza propria. Se non riesci a rispondere con i tool disponibili, dillo esplicitamente.
- Chiama più tool in sequenza se necessario per rispondere bene.
- run_js: esegui codice JS arbitrario su rows. Usa solo metodi nativi JS (filter, reduce, map, sort, Math.*). Non esistono groupBy, sum, o metodi lodash. rows è un array di oggetti con le colonne del dataset selezionato.
- Rispondi sempre in italiano, in modo conciso e diretto.
- Output finale DEVE essere JSON con questa struttura esatta:
{
  "summary": "risposta principale in 1-2 frasi",
  "insights": ["insight 1", "insight 2", ...],
  "warnings": ["warning 1", ...],
  "raw_data": sempre un array di oggetti quando ci sono righe da mostrare (es. [{campo: valore, ...}, ...]), mai un oggetto flat o wrapper. Array vuoto [] se non ci sono dati da mostrare.,
  "chart": null
}
- chart è null se la domanda non richiede un grafico.
- Se la domanda contiene "grafico", "chart", "visualizza", "mostrami" o simili,
  popola chart con:
  { "type": "bar"|"line"|"pie", "title": "...", "labels": [...], "values": [...] }
  Scegli: line per trend temporali, bar per confronti, pie solo se <= 6 elementi.`;

const BIKE_SYSTEM_PROMPT = `Sei un agente analitico specializzato in spese personali per il ciclismo.
Hai accesso a un CSV con ${RECORDS.length} spese dal ${SCHEMA.years[0]} al ${SCHEMA.years.at(-1)}.

Colonne: ANNO, MESE, COSA (descrizione), QUANTO (€), DOVE (vendor), MOTIVO (una tantum/periodico/...), CATEGORIA, NOTE
Categorie: ${SCHEMA.categories.join(', ')}
Anni: ${SCHEMA.years.join(', ')}
${BASE_PROMPT}`;

const HOME_SYSTEM_PROMPT = `Sei un agente analitico per spese domestiche e familiari.
Hai accesso a ${HOME_SCHEMA.count} spese dal ${HOME_SCHEMA.years[0]} al ${HOME_SCHEMA.years.at(-1)}.

Colonne: CHI (chi ha speso: Nicola/Leti/Shared), COSA (descrizione), QUANTO (€), CATEGORIA, QUANDO (data), ANNO, MESE (numero 1-12)
Categorie: ${HOME_SCHEMA.categories.join(', ')}
Chi: ${HOME_SCHEMA.chi.join(', ')}
Anni: ${HOME_SCHEMA.years.join(', ')}

Note specifiche HOME:
- Per filtrare per mese usa il numero (es. mese: "1" per gennaio).
- Per filtrare per persona usa il filtro chi (es. chi: "Nicola").
- I filtri dove e motivo non esistono in questo dataset — non usarli.
${BASE_PROMPT}`;

async function runAgent(userQuestion, model = 'claude-haiku-4-5', systemPrompt = BIKE_SYSTEM_PROMPT, records = RECORDS, schema = SCHEMA, history = []) {
  const messages = [...history, { role: 'user', content: userQuestion }];

  let iterations = 0;
  const MAX_ITER = 5;

  while (iterations < MAX_ITER) {
    iterations++;

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      messages
    });

    // Add assistant response to history
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      // Extract final text
      const textBlock = response.content.find(b => b.type === 'text');
      const text = textBlock?.text ?? '';

      // Try to parse JSON from response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
      } catch {}

      // Fallback: wrap plain text
      return { summary: text, insights: [], warnings: [], raw_data: [] };
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = executeTool(block.name, block.input, records, schema);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result
          });
        }
      }
      messages.push({ role: 'user', content: toolResults });
    }
  }

  return { summary: 'Max iterazioni raggiunte.', insights: [], warnings: ['Agent loop terminato per timeout'], raw_data: [] };
}

const CHART_KEYWORDS = ['grafico', 'chart', 'visualizza', 'mostrami'];

async function buildChart(rawData, question) {
  if (!CHART_KEYWORDS.some(kw => question.toLowerCase().includes(kw))) return null;
  if (!rawData || (Array.isArray(rawData) ? rawData.length === 0 : Object.keys(rawData).length === 0)) return null;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Dati questi dati JSON:\n${JSON.stringify(rawData)}\n\nRestituisci SOLO un oggetto JSON con questa struttura, senza testo aggiuntivo, senza backtick:\n{ "type": "bar", "title": "...", "labels": [...], "values": [...] }\n\nScegli type: "line" per trend temporali, "bar" per confronti, "pie" solo se <= 6 elementi.\nSe i dati non sono visualizzabili come grafico, restituisci: null`
    }]
  });

  const text = response.content.find(b => b.type === 'text')?.text ?? '';
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.post('/api/ask', async (req, res) => {
  const { question, model = 'claude-haiku-4-5', dataset = 'BIKE', history = [] } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'question mancante' });

  const ds = DATASETS[dataset] ?? DATASETS.BIKE;
  const systemPrompt = dataset === 'HOME' ? HOME_SYSTEM_PROMPT : BIKE_SYSTEM_PROMPT;

  console.log(`\n→ [${new Date().toISOString()}] [${dataset}] "${question}"`);

  try {
    const result = await runAgent(question, model, systemPrompt, ds.records, ds.schema, history);
    result.chart = await buildChart(result.raw_data, question);
    console.log(`✓ risposta generata`);
    res.json(result);
  } catch (err) {
    console.error('Agent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/schema', (req, res) => {
  const dataset = req.query.dataset === 'HOME' ? 'HOME' : 'BIKE';
  res.json(DATASETS[dataset].schema);
});

app.get('/api/version', (_, res) => res.json({ version }));

// ─── Pre-aggregation helper ───────────────────────────────────────────────────
function aggregateForReport(rows) {
  const totalRows = rows.length;
  const years = [...new Set(rows.map(r => r.ANNO))].sort((a, b) => a - b);
  const categories = [...new Set(rows.map(r => r.CATEGORIA))].sort();

  const byYear = {};
  const byCategory = {};
  const monthlySeries = {};

  for (const r of rows) {
    byYear[r.ANNO] = (byYear[r.ANNO] || 0) + r.QUANTO;
    byCategory[r.CATEGORIA] = (byCategory[r.CATEGORIA] || 0) + r.QUANTO;
    if (!monthlySeries[r.ANNO]) monthlySeries[r.ANNO] = {};
    monthlySeries[r.ANNO][r.MESE] = (monthlySeries[r.ANNO][r.MESE] || 0) + r.QUANTO;
  }

  for (const k of Object.keys(byYear)) byYear[k] = Math.round(byYear[k] * 100) / 100;
  for (const k of Object.keys(byCategory)) byCategory[k] = Math.round(byCategory[k] * 100) / 100;

  const topItems = [...rows]
    .sort((a, b) => b.QUANTO - a.QUANTO)
    .slice(0, 20)
    .map(r => ({ descrizione: r.COSA || '—', QUANTO: r.QUANTO, CATEGORIA: r.CATEGORIA, anno: r.ANNO }));

  return { totalRows, years, categories, byYear, byCategory, topItems, monthlySeries };
}

// ─── Route POST /api/report ───────────────────────────────────────────────────
app.post('/api/report', async (req, res) => {
  const { dataset = 'BIKE' } = req.body;
  const ds = DATASETS[dataset] ?? DATASETS.BIKE;
  const agg = aggregateForReport(ds.records);
  const today = new Date().toLocaleDateString('it-IT');
  const label = dataset === 'BIKE' ? 'Ciclismo' : 'Casa';

  const prompt = `Sei un esperto di analisi finanziaria. Genera un report HTML standalone completo per le spese di ${label.toLowerCase()}.

Dati pre-aggregati:
- Righe totali: ${agg.totalRows}
- Anni: ${agg.years.join(', ')}
- Categorie: ${agg.categories.join(', ')}
- Totale per anno (€): ${JSON.stringify(agg.byYear)}
- Totale per categoria (€): ${JSON.stringify(agg.byCategory)}
- Top 20 voci per importo: ${JSON.stringify(agg.topItems)}
- Serie mensile: ${JSON.stringify(agg.monthlySeries)}

Genera un file HTML completo e standalone con:
1. CSS inline (nessun file esterno eccetto Chart.js da CDN: https://cdn.jsdelivr.net/npm/chart.js)
2. Data di generazione: ${today}
3. Sezioni:
   a. Riepilogo generale (totale assoluto, media annua, anno con spesa più alta e più bassa)
   b. Spesa per anno con grafico a barre
   c. Spesa per categoria con grafico a ciambella
   d. Top 20 voci di spesa in tabella ordinata per importo
   e. Osservazioni e trend notevoli
4. Stile: pulito, professionale, font di sistema, colori sobri, responsive
5. Titolo: "Report spese ${label} — ${today}"
6. Vincoli obbligatori per i grafici Chart.js:
   - Tutti i grafici devono essere inizializzati dentro un listener DOMContentLoaded: document.addEventListener('DOMContentLoaded', () => { ... })
   - Ogni canvas deve avere un id univoco
   - Ogni new Chart() deve avere labels e data sempre validi (mai undefined o array vuoti)
   - Non dichiarare variabili con const/let fuori da funzioni se vengono usate dentro callback

Restituisci SOLO il codice HTML, senza markdown, senza backtick, senza testo aggiuntivo.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    });
    const html = response.content.find(b => b.type === 'text')?.text ?? '';
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Report error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Route POST /api/suggest ──────────────────────────────────────────────────
app.post('/api/suggest', async (req, res) => {
  const { dataset = 'BIKE' } = req.body;
  const ds = DATASETS[dataset] ?? DATASETS.BIKE;
  const agg = aggregateForReport(ds.records);
  const today = new Date().toLocaleDateString('it-IT');
  const label = dataset === 'BIKE' ? 'Ciclismo' : 'Casa';

  const prompt = `Sei un consulente finanziario personale. Analizza i pattern di spesa per ${label.toLowerCase()} e genera suggerimenti pratici di risparmio.

Dati pre-aggregati:
- Righe totali: ${agg.totalRows}
- Anni: ${agg.years.join(', ')}
- Categorie: ${agg.categories.join(', ')}
- Totale per anno (€): ${JSON.stringify(agg.byYear)}
- Totale per categoria (€): ${JSON.stringify(agg.byCategory)}
- Top 20 voci per importo: ${JSON.stringify(agg.topItems)}
- Serie mensile: ${JSON.stringify(agg.monthlySeries)}

Genera un file HTML completo e standalone con:
1. CSS inline (nessun file esterno eccetto Chart.js da CDN: https://cdn.jsdelivr.net/npm/chart.js)
2. Data di generazione: ${today}
3. Sezioni:
   a. Sintesi dei pattern di spesa identificati
   b. Categorie con maggior margine di risparmio (con stima € risparmio annuo)
   c. Almeno 5 suggerimenti specifici e actionable, ciascuno con: descrizione, stima risparmio in €/anno, priorità (Alta/Media/Bassa)
   d. Grafico a barre delle categorie per importo totale
   e. Piano d'azione con priorità
4. Stile: pulito, professionale, indicatori visivi per priorità (rosso=Alta, arancio=Media, verde=Bassa)
5. Titolo: "Suggerimenti di risparmio — ${label} — ${today}"
6. Vincoli obbligatori per i grafici Chart.js:
   - Tutti i grafici devono essere inizializzati dentro un listener DOMContentLoaded: document.addEventListener('DOMContentLoaded', () => { ... })
   - Ogni canvas deve avere un id univoco
   - Ogni new Chart() deve avere labels e data sempre validi (mai undefined o array vuoti)
   - Non dichiarare variabili con const/let fuori da funzioni se vengono usate dentro callback

Restituisci SOLO il codice HTML, senza markdown, senza backtick, senza testo aggiuntivo.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    });
    const html = response.content.find(b => b.type === 'text')?.text ?? '';
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Suggest error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚲 csvagent running → http://localhost:${PORT}`);
  console.log(`   API key: ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗ MANCANTE'}\n`);
});
