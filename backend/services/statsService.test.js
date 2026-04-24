// ============================================================
// Unit 4: Unit Testing with Jest
// Covers: describe, test, expect, mocking
// ============================================================

const { CSVParser, DataAnalyzer } = require('../services/statsService');

// ─── CSVParser tests ─────────────────────────────────────────
describe('CSVParser', () => {

  test('parses simple CSV correctly', () => {
    const csv = 'name,age,score\nAlice,25,88\nBob,30,92';
    const { headers, rows } = CSVParser.parse(csv);
    expect(headers).toEqual(['name', 'age', 'score']);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Alice');
    expect(rows[1].score).toBe('92');
  });

  test('handles quoted fields with commas', () => {
    const csv = 'city,country\n"New York, NY",USA\nLondon,UK';
    const { rows } = CSVParser.parse(csv);
    expect(rows[0].city).toBe('New York, NY');
  });

  test('detects tab delimiter', () => {
    const tsv = 'a\tb\tc\n1\t2\t3';
    expect(CSVParser.detectDelimiter(tsv)).toBe('\t');
  });

  test('parses valid JSON array', () => {
    const json = JSON.stringify([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
    const result = CSVParser.parseJSON(json);
    expect(result.headers).toEqual(['x', 'y']);
    expect(result.rows).toHaveLength(2);
  });

  test('returns null for invalid JSON', () => {
    expect(CSVParser.parseJSON('not json')).toBeNull();
  });
});

// ─── DataAnalyzer tests ───────────────────────────────────────
describe('DataAnalyzer — type detection', () => {
  const csv = 'id,score,label\n1,85.5,A\n2,92.0,B\n3,78.3,A';
  const { headers, rows } = CSVParser.parse(csv);
  const analyzer = new DataAnalyzer(headers, rows);

  test('detects numeric columns', () => {
    expect(analyzer.types['score']).toBe('number');
    expect(analyzer.types['id']).toBe('number');
  });

  test('detects string columns', () => {
    expect(analyzer.types['label']).toBe('string');
  });
});

describe('DataAnalyzer — numeric stats', () => {
  const csv = 'val\n2\n4\n4\n4\n5\n5\n7\n9';
  const { headers, rows } = CSVParser.parse(csv);
  const analyzer = new DataAnalyzer(headers, rows);
  const s = analyzer.stats['val'];

  test('mean is correct', () => {
    expect(s.mean).toBeCloseTo(5.0, 1);
  });

  test('median is correct', () => {
    expect(s.median).toBeCloseTo(4.5, 1);
  });

  test('min and max are correct', () => {
    expect(s.min).toBe(2);
    expect(s.max).toBe(9);
  });

  test('stddev is a positive number', () => {
    expect(s.stddev).toBeGreaterThan(0);
  });
});

describe('DataAnalyzer — categorical stats', () => {
  const csv = 'color\nred\nblue\nred\ngreen\nred';
  const { headers, rows } = CSVParser.parse(csv);
  const analyzer = new DataAnalyzer(headers, rows);
  const s = analyzer.stats['color'];

  test('unique count is correct', () => {
    expect(s.unique).toBe(3);
  });

  test('top value is red', () => {
    expect(s.topValues[0].value).toBe('red');
    expect(s.topValues[0].count).toBe(3);
  });
});

describe('DataAnalyzer — correlation', () => {
  // Perfect positive correlation
  const headers = ['x', 'y'];
  const rows    = [1,2,3,4,5].map(i => ({ x: String(i), y: String(i * 2) }));
  const analyzer = new DataAnalyzer(headers, rows);

  test('perfect positive correlation ≈ 1', () => {
    const r = analyzer.pearsonCorrelation('x', 'y');
    expect(r).toBeCloseTo(1.0, 2);
  });

  test('self-correlation is 1', () => {
    const { matrix } = analyzer.correlationMatrix();
    expect(matrix['x']['x']).toBe(1);
  });
});

describe('DataAnalyzer — insights', () => {
  const headers = ['score'];
  const rows = Array.from({ length: 50 }, (_, i) => ({ score: String(i + 1) }));
  const analyzer = new DataAnalyzer(headers, rows);

  test('returns an array of insights', () => {
    const insights = analyzer.generateInsights();
    expect(Array.isArray(insights)).toBe(true);
    expect(insights.length).toBeGreaterThan(0);
  });

  test('each insight has required fields', () => {
    const insights = analyzer.generateInsights();
    insights.forEach(i => {
      expect(i).toHaveProperty('type');
      expect(i).toHaveProperty('title');
      expect(i).toHaveProperty('body');
    });
  });
});
