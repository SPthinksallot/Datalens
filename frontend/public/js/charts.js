// ============================================================
// Unit 2: ES6 Class — ChartManager
// Unit 6 (React concept): encapsulated component lifecycle
// Covers: classes, static, default params, Math, array methods
// ============================================================

'use strict';

class ChartManager {
  // Unit 2: constructor
  constructor() {
    this.instance = null;
  }

  // Unit 2: method — destroy previous chart instance
  destroy() {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }

  // ── Shared Chart.js theme options ──────────────────────────
  // Unit 2: default parameter
  _defaults(type = 'bar') {
    const isCartesian = !['pie', 'doughnut'].includes(type);
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: '#8888a8',
            font: { family: 'Outfit', size: 11 }
          }
        },
        tooltip: {
          backgroundColor: '#1c1c28',
          borderColor: '#ffffff12',
          borderWidth: 1,
          titleColor: '#eaeaf5',
          bodyColor: '#8888a8',
          titleFont: { family: 'Outfit', size: 12 },
          bodyFont:  { family: 'JetBrains Mono', size: 11 }
        }
      },
      scales: isCartesian ? {
        x: {
          ticks: { color: '#4a4a68', font: { size: 10 }, maxTicksLimit: 15 },
          grid:  { color: '#15151f' }
        },
        y: {
          ticks: { color: '#4a4a68', font: { size: 10 } },
          grid:  { color: '#1c1c28' },
          beginAtZero: true
        }
      } : {}
    };
  }

  // Unit 2: spread operator to merge options
  _create(canvasId, type, data, extraOpts = {}) {
    this.destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    // Unit 2: spread to merge defaults with extras
    const options = { ...this._defaults(type), ...extraOpts };
    if (extraOpts.scales) options.scales = { ...this._defaults(type).scales, ...extraOpts.scales };
    this.instance = new Chart(ctx, { type, data, options });
  }

  // ── Histogram ──────────────────────────────────────────────
  // Unit 2: Math.min, Math.max, Math.floor, array methods
  histogram(canvasId, values, label, bins = 20) {
    // Unit 2: spread for min/max
    const min     = Math.min(...values);
    const max     = Math.max(...values);
    const binSize = (max - min) / bins;
    const counts  = new Array(bins).fill(0);
    const labels  = [];

    for (let i = 0; i < bins; i++) {
      labels.push((min + i * binSize).toFixed(1));
    }

    // Unit 2: forEach
    values.forEach(v => {
      const idx = Math.min(Math.floor((v - min) / binSize), bins - 1);
      counts[idx]++;
    });

    this._create(canvasId, 'bar', {
      labels,
      datasets: [{
        label,
        data: counts,
        backgroundColor: 'rgba(124,110,255,0.55)',
        borderColor: '#7c6eff',
        borderWidth: 1,
        borderRadius: 3
      }]
    }, { plugins: { legend: { display: false } } });
  }

  // ── Bar chart (categorical) ─────────────────────────────────
  // Unit 2: arrow function, map, slice
  bar(canvasId, labels, values, label) {
    const colors = labels.map((_, i) =>
      `hsl(${240 + i * 18}, 60%, ${52 + (i % 2) * 8}%)`
    );

    this._create(canvasId, 'bar', {
      labels: labels.slice(0, 20),
      datasets: [{
        label,
        data: values.slice(0, 20),
        backgroundColor: colors.slice(0, 20),
        borderRadius: 5
      }]
    });
  }

  // ── Line chart ─────────────────────────────────────────────
  line(canvasId, values, label) {
    this._create(canvasId, 'line', {
      labels: values.map((_, i) => i + 1),
      datasets: [{
        label,
        data: values,
        borderColor: '#7c6eff',
        backgroundColor: 'rgba(124,110,255,0.08)',
        tension: 0.35,
        pointRadius: values.length > 200 ? 0 : 3,
        fill: true
      }]
    });
  }

  // ── Scatter plot ───────────────────────────────────────────
  // Unit 2: map + filter with destructuring
  scatter(canvasId, xVals, yVals, xLabel, yLabel) {
    const points = xVals
      .map((x, i) => ({ x, y: yVals[i] }))
      .filter(({ x, y }) => !isNaN(x) && !isNaN(y));

    this._create(canvasId, 'scatter', {
      datasets: [{
        label: `${xLabel} vs ${yLabel}`,
        data: points,
        backgroundColor: 'rgba(124,110,255,0.45)',
        pointRadius: 5
      }]
    });
  }

  // ── Box plot (simulated via stacked bar) ───────────────────
  boxPlot(canvasId, stats, label) {
    // Unit 2: destructuring
    const { min, q1, median, q3, max } = stats;
    this._create(canvasId, 'bar', {
      labels: [label],
      datasets: [
        { label: `Min→Q1 (${min}–${q1})`, data: [q1 - min], backgroundColor: 'rgba(124,110,255,0.2)', stack: 'box', base: min },
        { label: `Q1→Median (${q1}–${median})`, data: [median - q1], backgroundColor: 'rgba(124,110,255,0.6)', stack: 'box', base: q1 },
        { label: `Median→Q3 (${median}–${q3})`, data: [q3 - median], backgroundColor: 'rgba(168,157,255,0.6)', stack: 'box', base: median },
        { label: `Q3→Max (${q3}–${max})`, data: [max - q3], backgroundColor: 'rgba(168,157,255,0.2)', stack: 'box', base: q3 }
      ]
    }, { indexAxis: 'y' });
  }

  // ── Pie / Donut ────────────────────────────────────────────
  pie(canvasId, labels, values, label) {
    const palette = [
      '#7c6eff', '#2dd4a0', '#f87239', '#4db8ff',
      '#f04f6b', '#a89dff', '#f5c94e', '#06b6d4',
      '#ec4899', '#84cc16'
    ];
    this._create(canvasId, 'doughnut', {
      labels: labels.slice(0, 10),
      datasets: [{
        label,
        data: values.slice(0, 10),
        backgroundColor: palette,
        borderWidth: 2,
        borderColor: '#1c1c28'
      }]
    }, { cutout: '52%' });
  }
}

// ── ChartUI — connects Chart.js to the DOM ──────────────────
// Unit 2: Object literal with methods, closures
const ChartUI = (() => {
  const mgr = new ChartManager();

  function update() {
    const col  = document.getElementById('chartCol').value;
    const type = document.getElementById('chartType').value;
    const bins = parseInt(document.getElementById('chartBins').value);

    if (!col || !window._analysisData) return;

    const data    = window._analysisData;
    const stats   = data.columnStats.find(s => s.name === col);
    const colType = data.types[col];
    const vals    = data.chartData[col] || [];

    document.getElementById('chartTitle').textContent    = `${col} — ${type}`;
    document.getElementById('chartSubtitle').textContent = `${(stats?.count || vals.length).toLocaleString()} values · type: ${colType}`;
    document.getElementById('outlierBadge').innerHTML    = '';
    document.getElementById('distStats').innerHTML       = '';

    // Unit 3: jQuery show/hide for yAxisGroup
    if (type === 'scatter') {
      $('#yAxisGroup').show();
    } else {
      $('#yAxisGroup').hide();
    }

    try {
      if (type === 'histogram' && colType === 'number') {
        mgr.histogram('mainChart', vals.map(Number), col, bins);
        if (stats?.outlierCount) {
          document.getElementById('outlierBadge').innerHTML =
            `<span class="outlier-pill2">${stats.outlierCount} outliers</span>`;
        }
        buildDistStats(stats);

      } else if (type === 'bar') {
        if (colType === 'string') {
          const tv = stats?.topValues || [];
          mgr.bar('mainChart', tv.map(t => t.value), tv.map(t => t.count), col);
        } else {
          mgr.histogram('mainChart', vals.map(Number), col, bins);
        }

      } else if (type === 'line') {
        mgr.line('mainChart', vals.map(Number), col);

      } else if (type === 'scatter') {
        const yCol  = document.getElementById('chartYCol').value;
        const yVals = (data.chartData[yCol] || []).map(Number);
        mgr.scatter('mainChart', vals.map(Number), yVals, col, yCol);

      } else if (type === 'box' && colType === 'number' && stats) {
        mgr.boxPlot('mainChart', stats, col);

      } else if (type === 'pie') {
        if (colType === 'string') {
          const tv = stats?.topValues || [];
          mgr.pie('mainChart', tv.map(t => t.value), tv.map(t => t.count), col);
        } else {
          toast('Pie works best with categorical columns', 'error');
        }
      } else {
        toast('This chart type does not suit this column type', 'error');
      }
    } catch (e) {
      console.error('Chart error:', e);
    }
  }

  function buildDistStats(s) {
    if (!s || s.type !== 'number') return;
    // Unit 2: array of objects, map to HTML template literals
    const items = [
      { label: 'Mean',     value: fmt(s.mean)     },
      { label: 'Median',   value: fmt(s.median)   },
      { label: 'Std Dev',  value: fmt(s.stddev)   },
      { label: 'Skewness', value: fmt(s.skewness) },
      { label: 'IQR',      value: fmt(s.iqr)      },
      { label: 'Range',    value: fmt(s.range)    }
    ];
    document.getElementById('distStats').innerHTML = items.map(it =>
      `<div class="col-6 col-md-2">
        <div class="stat-card" style="padding:12px 14px">
          <div class="sc-label">${it.label}</div>
          <div class="sc-value" style="font-size:17px">${it.value}</div>
        </div>
      </div>`
    ).join('');
  }

  function populate(data) {
    const colSel  = document.getElementById('chartCol');
    const yColSel = document.getElementById('chartYCol');
    const headers = data.headers || [];
    const numCols = headers.filter(h => data.types[h] === 'number');

    // Unit 2: template literal, map
    colSel.innerHTML  = headers.map(h => `<option value="${esc(h)}">${esc(h)}</option>`).join('');
    yColSel.innerHTML = numCols.map(h => `<option value="${esc(h)}">${esc(h)}</option>`).join('');

    // Auto-pick first numeric col
    const firstNum = numCols[0];
    if (firstNum) colSel.value = firstNum;
  }

  return { update, populate };
})();
