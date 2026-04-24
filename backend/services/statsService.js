// ============================================================
// Unit 2: ES6 Classes — Statistical Analysis Service
// Covers: classes, static methods, Math object, array methods,
//         destructuring, spread, for/of, Map, Set, Promises
// ============================================================

class CSVParser {
  // Unit 2: static method, string methods (split, trim, includes, startsWith)
  static parse(text, delimiter = ',') {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (!lines.length) return { headers: [], rows: [] };

    const headers = CSVParser._parseLine(lines[0], delimiter)
      .map(h => h.replace(/^"|"$/g, '').trim());

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = CSVParser._parseLine(lines[i], delimiter);
      // Unit 2: destructuring in forEach
      const row = {};
      headers.forEach((h, j) => {
        row[h] = (vals[j] || '').replace(/^"|"$/g, '').trim();
      });
      rows.push(row);
    }
    return { headers, rows };
  }

  static _parseLine(line, delim) {
    const result = [];
    let current = '';
    let inQuote = false;
    // Unit 2: for...of loop (ES6)
    for (const ch of line) {
      if (ch === '"') inQuote = !inQuote;
      else if (ch === delim && !inQuote) { result.push(current); current = ''; }
      else current += ch;
    }
    result.push(current);
    return result;
  }

  static parseJSON(text) {
    try {
      const data = JSON.parse(text);
      const arr  = Array.isArray(data) ? data : Object.values(data)[0];
      if (!Array.isArray(arr) || !arr.length) return null;
      const headers = Object.keys(arr[0]);
      // Unit 2: arrow function, map
      const rows = arr.map(r => {
        const o = {};
        headers.forEach(h => { o[h] = String(r[h] ?? ''); });
        return o;
      });
      return { headers, rows };
    } catch { return null; }
  }

  static detectDelimiter(sample) {
    // Unit 2: String method includes(), comparison
    const counts = { ',': 0, '\t': 0, ';': 0 };
    for (const ch of sample.slice(0, 1000)) {
      if (ch in counts) counts[ch]++;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }
}

class DataAnalyzer {
  // Unit 2: constructor, this, private-by-convention methods (_prefix)
  constructor(headers, rows) {
    this.headers = headers;
    this.rows    = rows;
    this.types   = this._detectTypes();
    this.stats   = this._computeAllStats();
  }

  _detectTypes() {
    const types = {};
    for (const h of this.headers) {
      // Unit 2: arrow functions, filter, map
      const vals = this.rows.map(r => r[h]).filter(v => v !== '' && v != null);
      const numRatio  = vals.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length / vals.length;
      const dateRatio = vals.filter(v => !isNaN(Date.parse(v)) && v.length > 4).length / vals.length;

      if (numRatio  > 0.8) types[h] = 'number';
      else if (dateRatio > 0.8) types[h] = 'date';
      else types[h] = 'string';
    }
    return types;
  }

  _computeAllStats() {
    const stats = {};
    for (const h of this.headers) {
      if (this.types[h] === 'number') {
        const vals = this.rows.map(r => parseFloat(r[h])).filter(v => !isNaN(v));
        stats[h]   = this._numericStats(vals, h);
      } else {
        const vals = this.rows.map(r => r[h]).filter(v => v !== '');
        stats[h]   = this._categoricStats(vals, h);
      }
    }
    return stats;
  }

  // Unit 2: Built-in Math object usage — min, max, sqrt, abs, floor
  _numericStats(vals, name) {
    if (!vals.length) return { type: 'number', name, count: 0, missing: this.rows.length };

    // Unit 2: spread operator for Math.min/max
    const sorted  = [...vals].sort((a, b) => a - b);
    const n        = sorted.length;

    // Unit 2: reduce for sum
    const sum      = vals.reduce((acc, v) => acc + v, 0);
    const mean     = sum / n;

    const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const stddev   = Math.sqrt(variance);

    const median   = n % 2 === 0
      ? (sorted[n/2 - 1] + sorted[n/2]) / 2
      : sorted[Math.floor(n / 2)];

    const q1        = sorted[Math.floor(n * 0.25)];
    const q3        = sorted[Math.floor(n * 0.75)];
    const iqr       = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;
    const outliers  = sorted.filter(v => v < lowerFence || v > upperFence);

    // Unit 2: Math object — skewness
    const skewness  = stddev > 0
      ? vals.reduce((acc, v) => acc + Math.pow((v - mean) / stddev, 3), 0) / n
      : 0;

    const missing   = this.rows.filter(r => r[name] === '' || r[name] == null).length;

    return {
      type: 'number', name, count: n, missing,
      mean: +mean.toFixed(4),
      median: +median.toFixed(4),
      stddev: +stddev.toFixed(4),
      min: sorted[0],
      max: sorted[n - 1],
      range: +(sorted[n-1] - sorted[0]).toFixed(4),
      q1: +q1.toFixed(4),
      q3: +q3.toFixed(4),
      iqr: +iqr.toFixed(4),
      skewness: +skewness.toFixed(4),
      outlierCount: outliers.length,
      outlierValues: outliers.slice(0, 10),
      values: vals   // raw values for chart rendering
    };
  }

  // Unit 2: Map (ES6), Set (ES6), spread
  _categoricStats(vals, name) {
    const freq    = new Map();
    for (const v of vals) freq.set(v, (freq.get(v) || 0) + 1);

    const sorted  = [...freq.entries()].sort((a, b) => b[1] - a[1]);
    const unique  = new Set(vals).size;
    const missing = this.rows.filter(r => r[name] === '' || r[name] == null).length;

    return {
      type: 'string', name, count: vals.length, unique, missing,
      topValues: sorted.slice(0, 15).map(([value, count]) => ({ value, count }))
    };
  }

  // Pearson correlation — Unit 2: Math, reduce
  pearsonCorrelation(colA, colB) {
    const pairs = this.rows
      .map(r => [parseFloat(r[colA]), parseFloat(r[colB])])
      .filter(([a, b]) => !isNaN(a) && !isNaN(b));

    const n = pairs.length;
    if (n < 3) return 0;

    const meanA = pairs.reduce((s, [a]) => s + a, 0) / n;
    const meanB = pairs.reduce((s, [, b]) => s + b, 0) / n;

    const num  = pairs.reduce((s, [a, b]) => s + (a - meanA) * (b - meanB), 0);
    const denA = Math.sqrt(pairs.reduce((s, [a]) => s + Math.pow(a - meanA, 2), 0));
    const denB = Math.sqrt(pairs.reduce((s, [, b]) => s + Math.pow(b - meanB, 2), 0));

    return denA * denB === 0 ? 0 : +(num / (denA * denB)).toFixed(4);
  }

  correlationMatrix() {
    const numCols = this.headers.filter(h => this.types[h] === 'number');
    const matrix  = {};

    for (const a of numCols) {
      matrix[a] = {};
      for (const b of numCols) {
        matrix[a][b] = a === b ? 1 : this.pearsonCorrelation(a, b);
      }
    }

    // Top correlation pairs (sorted by |r|)
    const pairs = [];
    for (let i = 0; i < numCols.length; i++) {
      for (let j = i + 1; j < numCols.length; j++) {
        const r = matrix[numCols[i]][numCols[j]];
        pairs.push({ colA: numCols[i], colB: numCols[j], r });
      }
    }
    pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

    return { matrix, cols: numCols, topPairs: pairs.slice(0, 10) };
  }

  generateInsights() {
    const insights = [];
    const total    = this.rows.length;

    // Missing data
    for (const h of this.headers) {
      const s  = this.stats[h];
      const pct = (s.missing / total * 100).toFixed(1);
      if (s.missing / total > 0.05) {
        insights.push({ type: 'warn', title: `High missing data — "${h}"`, body: `${s.missing} of ${total} rows (${pct}%) are empty. Consider imputation or dropping this column.`, meta: `${pct}% missing` });
      }
    }

    // Outliers
    for (const h of this.headers) {
      const s = this.stats[h];
      if (s.type === 'number' && s.outlierCount > 0) {
        const pct = (s.outlierCount / s.count * 100).toFixed(1);
        insights.push({ type: s.outlierCount > 5 ? 'bad' : 'warn', title: `Outliers in "${h}"`, body: `${s.outlierCount} outlier(s) detected via IQR method (${pct}% of values). Range: [${s.min}, ${s.max}].`, meta: `IQR=${s.iqr} Q1=${s.q1} Q3=${s.q3}` });
      }
    }

    // Skewness
    for (const h of this.headers) {
      const s = this.stats[h];
      if (s.type === 'number' && Math.abs(s.skewness) > 1) {
        const dir = s.skewness > 0 ? 'right (positive)' : 'left (negative)';
        insights.push({ type: 'info', title: `Skewed distribution — "${h}"`, body: `Skewness ${s.skewness.toFixed(2)} indicates ${dir} skew. Mean (${s.mean?.toFixed(2)}) ≠ Median (${s.median?.toFixed(2)}).`, meta: `skewness=${s.skewness}` });
      }
    }

    // High cardinality
    for (const h of this.headers) {
      const s = this.stats[h];
      if (s.type === 'string' && s.unique / total > 0.9 && total > 20) {
        insights.push({ type: 'warn', title: `High cardinality — "${h}"`, body: `${s.unique} unique values in ${total} rows. Likely an ID column — consider excluding from analysis.`, meta: `${s.unique} unique` });
      }
    }

    // Correlations
    const { topPairs } = this.correlationMatrix();
    for (const { colA, colB, r } of topPairs.slice(0, 3)) {
      if (Math.abs(r) > 0.6) {
        insights.push({ type: Math.abs(r) > 0.85 ? 'bad' : 'good', title: `Correlation: "${colA}" ↔ "${colB}"`, body: `r = ${r}. ${r > 0 ? 'Positive' : 'Negative'} correlation — as ${colA} increases, ${colB} tends to ${r > 0 ? 'increase' : 'decrease'}.`, meta: `r=${r}` });
      }
    }

    if (!insights.length) {
      insights.push({ type: 'good', title: 'Dataset looks clean', body: 'No major issues found — low missing rate, no extreme outliers, and reasonable distributions.', meta: `${total} rows · ${this.headers.length} cols` });
    }

    return insights;
  }

  summary() {
    const numCols = this.headers.filter(h => this.types[h] === 'number').length;
    const strCols = this.headers.filter(h => this.types[h] === 'string').length;
    const total   = this.rows.length;
    const totalMissing = this.headers.reduce((s, h) => s + (this.stats[h].missing || 0), 0);
    const dupes   = total - new Set(this.rows.map(r => JSON.stringify(r))).size;

    return { total, numCols, strCols, totalMissing, dupes };
  }
}

module.exports = { CSVParser, DataAnalyzer };
