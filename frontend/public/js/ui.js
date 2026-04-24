// ============================================================
// Unit 2: DOM Manipulation — selecting, modifying elements,
//         event handling, modifying CSS dynamically, traversal
// Unit 3: jQuery — selectors, DOM manipulation, effects,
//         event handling, CSS modification
// ============================================================

'use strict';

// ── Shared helpers ─────────────────────────────────────────────

// Unit 2: string method — escape HTML
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Unit 2: built-in Math, toFixed, toLocaleString
function fmt(n) {
  if (n == null || (typeof n === 'number' && isNaN(n))) return '—';
  const num = parseFloat(n);
  if (isNaN(num)) return String(n);
  if (Math.abs(num) >= 10000) return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return +num.toFixed(3) + '';
}

// Unit 3: jQuery — toast notification with fadeOut animation
function toast(msg, type = 'info') {
  const $t = $(`<div class="toast ${type}">${esc(msg)}</div>`);
  $('#toastStack').append($t);
  setTimeout(() => $t.fadeOut(300, function () { $(this).remove(); }), 3500);
}

// ── UI: Overview panel ─────────────────────────────────────────
const UI = (() => {

  function buildOverview(data) {
    const total = data.rowCount;
    const numCols = data.numCols;
    const strCols = data.strCols;
    const missing = data.totalMissing;
    const dupes = data.duplicates;
    const missPct = ((missing / (total * data.colCount)) * 100).toFixed(1);

    // Unit 2: array of objects, template literals
    const cards = [
      { label: 'Total rows', value: total.toLocaleString(), delta: `${data.colCount} columns`, cls: 'delta-neu' },
      { label: 'Numeric columns', value: numCols, delta: `${strCols} categorical`, cls: 'delta-neu' },
      { label: 'Missing values', value: missing.toLocaleString(), delta: `${missPct}% of all cells`, cls: +missPct > 5 ? 'delta-bad' : 'delta-good' },
      { label: 'Duplicate rows', value: dupes, delta: dupes > 0 ? 'Consider dedup' : 'None', cls: dupes > 0 ? 'delta-bad' : 'delta-good' }
    ];

    // Unit 2: DOM manipulation — innerHTML
    document.getElementById('overviewCards').innerHTML = cards.map(c =>
      `<div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="sc-label">${c.label}</div>
          <div class="sc-value">${c.value}</div>
          <div class="sc-delta ${c.cls}">${c.delta}</div>
        </div>
      </div>`
    ).join('');

    // Column profile cards
    document.getElementById('colGrid').innerHTML = data.columnStats.map(s => {
      const typeClass = s.type === 'number' ? 'tb-number' : s.type === 'date' ? 'tb-date' : 'tb-string';
      let body = '';
      if (s.type === 'number') {
        const fillPct = Math.min((s.count / total) * 100, 100).toFixed(1);
        body = `
          <div class="mini-stats">
            <div class="ms-item"><div class="ms-val">${fmt(s.mean)}</div><div class="ms-lbl">Mean</div></div>
            <div class="ms-item"><div class="ms-val">${fmt(s.median)}</div><div class="ms-lbl">Median</div></div>
            <div class="ms-item"><div class="ms-val">${fmt(s.stddev)}</div><div class="ms-lbl">Std Dev</div></div>
          </div>
          <div class="mini-stats mt-2">
            <div class="ms-item"><div class="ms-val">${fmt(s.min)}</div><div class="ms-lbl">Min</div></div>
            <div class="ms-item"><div class="ms-val">${fmt(s.max)}</div><div class="ms-lbl">Max</div></div>
            <div class="ms-item"><div class="ms-val">${s.outlierCount || 0}</div><div class="ms-lbl">Outliers</div></div>
          </div>
          <div class="mini-bar-wrap"><div class="mini-bar" style="width:${fillPct}%"></div></div>`;
      } else {
        const chips = (s.topValues || []).slice(0, 4).map(t =>
          `<span class="tv-chip">${esc(t.value)} (${t.count})</span>`
        ).join('');
        body = `
          <div class="mini-stats">
            <div class="ms-item"><div class="ms-val">${s.count}</div><div class="ms-lbl">Count</div></div>
            <div class="ms-item"><div class="ms-val">${s.unique}</div><div class="ms-lbl">Unique</div></div>
            <div class="ms-item"><div class="ms-val">${s.missing || 0}</div><div class="ms-lbl">Missing</div></div>
          </div>
          <div class="top-vals">${chips}</div>`;
      }
      return `<div class="col-card">
        <div class="col-card-header">
          <span class="type-badge ${typeClass}">${s.type}</span>
          <span class="col-card-name">${esc(s.name)}</span>
        </div>
        ${body}
      </div>`;
    }).join('');

    // Unit 3: jQuery — animate mini-bars after render
    setTimeout(() => {
      // Unit 3: jQuery each, DOM traversal
      $('.mini-bar').each(function () {
        const target = $(this).css('width');
        $(this).css('width', '0').animate({ width: target }, 600);
      });
    }, 100);
  }

  // ── Statistics table ─────────────────────────────────────────
  function buildStats(data) {
    const numStats = data.columnStats.filter(s => s.type === 'number');
    const strStats = data.columnStats.filter(s => s.type === 'string');
    let html = '';

    if (numStats.length) {
      html += `<div class="stats-table-wrap" data-type="number">
        <table class="stats-table">
          <thead><tr>
            <th>Column</th><th>Count</th><th>Mean</th><th>Median</th>
            <th>Std Dev</th><th>Min</th><th>Max</th><th>Q1</th><th>Q3</th>
            <th>IQR</th><th>Skewness</th><th>Outliers</th><th>Missing</th>
          </tr></thead>
          <tbody>
            ${numStats.map(s => `<tr>
              <td class="col-name-cell">${esc(s.name)}</td>
              <td>${s.count}</td>
              <td>${fmt(s.mean)}</td>
              <td>${fmt(s.median)}</td>
              <td>${fmt(s.stddev)}</td>
              <td>${fmt(s.min)}</td>
              <td>${fmt(s.max)}</td>
              <td>${fmt(s.q1)}</td>
              <td>${fmt(s.q3)}</td>
              <td>${fmt(s.iqr)}</td>
              <td>${fmt(s.skewness)}</td>
              <td>${s.outlierCount > 0 ? `<span class="outlier-pill">${s.outlierCount}</span>` : '0'}</td>
              <td>${s.missing > 0 ? `<span class="missing-pill">${s.missing}</span>` : '0'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    }

    if (strStats.length) {
      html += `<div class="stats-table-wrap mt-3" data-type="string">
        <table class="stats-table">
          <thead><tr>
            <th>Column</th><th>Count</th><th>Unique</th><th>Missing</th><th>Top value</th><th>Top count</th>
          </tr></thead>
          <tbody>
            ${strStats.map(s => {
        const top = s.topValues?.[0] || { value: '—', count: 0 };
        return `<tr>
                <td class="col-name-cell">${esc(s.name)}</td>
                <td>${s.count}</td>
                <td>${s.unique}</td>
                <td>${s.missing > 0 ? `<span class="missing-pill">${s.missing}</span>` : '0'}</td>
                <td>${esc(top.value)}</td>
                <td>${top.count}</td>
              </tr>`;
      }).join('')}
          </tbody>
        </table>
      </div>`;
    }

    document.getElementById('statsContent').innerHTML = html;
  }

  // Unit 3: jQuery filter effect
  function filterStats(btn, type) {
    // Unit 3: jQuery selectors + DOM manipulation
    $('.filter-pills .pill').removeClass('active');
    $(btn).addClass('active');
    if (type === 'all') {
      $('[data-type]').show();
    } else {
      $('[data-type]').hide();
      $(`[data-type="${type}"]`).show();
    }
  }

  // ── Correlation heatmap ───────────────────────────────────────
  function buildCorrelation(data) {
    const { correlationMatrix: matrix, headers, types } = data;
    const numCols = headers.filter(h => types[h] === 'number');

    if (!matrix || numCols.length < 2) {
      document.getElementById('heatmapWrap').innerHTML =
        '<div class="empty-state"><div class="empty-title">Not enough numeric columns</div><div class="empty-sub">Need at least 2 numeric columns for correlation.</div></div>';
      document.getElementById('corrPairs').innerHTML = '';
      return;
    }

    // Build heatmap — Unit 2: nested for loops
    let hml = '<table class="heatmap-table"><thead><tr><th></th>';
    numCols.forEach(c => hml += `<th><div class="hm-label" title="${esc(c)}">${esc(c.slice(0, 7))}</div></th>`);
    hml += '</tr></thead><tbody>';

    numCols.forEach(rowC => {
      hml += `<tr><th><div class="hm-label" title="${esc(rowC)}">${esc(rowC.slice(0, 7))}</div></th>`;
      numCols.forEach(colC => {
        const r = (matrix[rowC] && matrix[rowC][colC]) ?? 0;
        const bg = corrColor(r);
        const fg = Math.abs(r) > 0.45 ? '#fff' : '#8888a8';
        hml += `<td class="hm-cell" style="background:${bg};color:${fg}"
          title="${esc(rowC)} ↔ ${esc(colC)}: ${r}">${r.toFixed(2)}</td>`;
      });
      hml += '</tr>';
    });
    hml += '</tbody></table>';
    document.getElementById('heatmapWrap').innerHTML = hml;

    // Top pairs
    const pairs = data.topCorrelations || [];
    document.getElementById('corrPairs').innerHTML = pairs.length
      ? pairs.map(p => {
        const pct = (Math.abs(p.r) * 100).toFixed(0);
        const color = p.r > 0 ? 'var(--c-green)' : 'var(--c-red)';
        const label = Math.abs(p.r) > 0.8 ? 'Very strong' : Math.abs(p.r) > 0.5 ? 'Strong' : 'Moderate';
        return `<div class="corr-pair" style="border-left-color:${color}">
            <div class="cp-names">${esc(p.colA)} ↔ ${esc(p.colB)}</div>
            <div class="cp-bar-wrap"><div class="cp-bar" style="width:${pct}%;background:${color}"></div></div>
            <div class="cp-meta">r = ${p.r} &nbsp;·&nbsp; ${p.r > 0 ? 'Positive' : 'Negative'} &nbsp;·&nbsp; ${label}</div>
          </div>`;
      }).join('')
      : '<div class="empty-state"><div class="empty-title">No strong pairs found</div></div>';

    // Unit 3: jQuery hover on heatmap cells
    $(document).off('mouseenter.hm mouseleave.hm');
    $(document).on('mouseenter.hm', '.hm-cell', function () {
      $('.hm-cell').css('opacity', '0.5');
      $(this).css('opacity', '1');
    }).on('mouseleave.hm', '.hm-cell', function () {
      $('.hm-cell').css('opacity', '1');
    });
  }

  // ── Insights ──────────────────────────────────────────────────
  function buildInsights(data) {
    const insights = data.insights || [];
    const badge = document.getElementById('insBadge');
    const warns = insights.filter(i => i.type === 'warn' || i.type === 'bad').length;

    // Unit 2: DOM manipulation — style & innerHTML
    if (warns > 0) {
      badge.textContent = warns;
      badge.style.display = 'inline';
    }

    document.getElementById('insightsList').innerHTML = insights.map(ins =>
      `<div class="insight-item type-${ins.type}" style="display:none">
        <div class="ins-title">${esc(ins.title)}</div>
        <div class="ins-body">${esc(ins.body)}</div>
        <div class="ins-meta">${esc(ins.meta)}</div>
      </div>`
    ).join('');

    // Unit 3: jQuery effects — staggered slideDown
    $('#insightsList .insight-item').each(function (i) {
      $(this).delay(i * 80).slideDown(240);
    });
  }

  return { buildOverview, buildStats, filterStats, buildCorrelation, buildInsights };
})();

// ── TableUI — paginated sortable table ────────────────────────
const TableUI = (() => {
  let _rows = [];
  let _filtered = [];
  let _headers = [];
  let _types = {};
  let _page = 0;
  let _pageSize = 20;
  let _sortCol = null;
  let _sortDir = 1;

  function init(data) {
    _headers = data.headers;
    _types = data.types;
    // Rebuild rows from chartData (raw values per column)
    const len = data.rowCount;
    _rows = [];
    for (let i = 0; i < len; i++) {
      const row = {};
      _headers.forEach(h => {
        const arr = data.chartData[h] || [];
        row[h] = arr[i] != null ? arr[i] : '';
      });
      _rows.push(row);
    }
    _filtered = [..._rows];
    _page = 0;

    // Build headers — Unit 2: DOM manipulation
    document.getElementById('tableHead').innerHTML =
      `<tr>${_headers.map((h, i) => {
        const t = _types[h];
        const tc = t === 'number' ? 'tb-number' : t === 'date' ? 'tb-date' : 'tb-string';
        return `<th data-col="${i}" onclick="TableUI.sort(${i})">
          <span class="type-badge ${tc}">${t.slice(0, 3)}</span> ${esc(h)}
        </th>`;
      }).join('')}</tr>`;

    renderBody();
  }

  function sort(colIdx) {
    if (_sortCol === colIdx) _sortDir *= -1;
    else { _sortCol = colIdx; _sortDir = 1; }
    _page = 0;
    renderBody();
  }

  function search(q) {
    q = q.toLowerCase().trim();
    _filtered = q
      ? _rows.filter(r => _headers.some(h => String(r[h] || '').toLowerCase().includes(q)))
      : [..._rows];
    _page = 0;
    renderBody();
  }

  function setPageSize(n) { _pageSize = n; _page = 0; renderBody(); }
  function prev() { if (_page > 0) { _page--; renderBody(); } }
  function next() {
    if ((_page + 1) * _pageSize < _filtered.length) { _page++; renderBody(); }
  }

  function renderBody() {
    // Sort
    let rows = [..._filtered];
    if (_sortCol !== null) {
      const h = _headers[_sortCol];
      const isNum = _types[h] === 'number';
      rows.sort((a, b) => {
        const av = isNum ? parseFloat(a[h]) : String(a[h]);
        const bv = isNum ? parseFloat(b[h]) : String(b[h]);
        return (av > bv ? 1 : av < bv ? -1 : 0) * _sortDir;
      });
    }

    const start = _page * _pageSize;
    const slice = rows.slice(start, start + _pageSize);

    // Unit 2: DOM — innerHTML rebuild
    document.getElementById('tableBody').innerHTML =
      slice.map(r =>
        `<tr>${_headers.map(h => `<td>${esc(String(r[h] ?? ''))}</td>`).join('')}</tr>`
      ).join('');

    const end = Math.min(start + _pageSize, rows.length);
    document.getElementById('pageInfo').textContent =
      `${(start + 1).toLocaleString()}–${end.toLocaleString()} of ${_filtered.length.toLocaleString()}`;

    // Update sort arrows via CSS — Unit 2: DOM traversal
    document.querySelectorAll('#tableHead th').forEach((th, i) => {
      th.className = th.className.replace(/sort-(asc|desc)/g, '').trim();
      if (i === _sortCol) th.classList.add(_sortDir === 1 ? 'sort-asc' : 'sort-desc');
    });
  }

  return { init, sort, search, setPageSize, prev, next };
})();

// ── HistoryUI ────────────────────────────────────────────────
const HistoryUI = (() => {

  async function load() {
    try {
      const { items } = await ApiClient.getHistory(30);
      const count = items.length;

      // Unit 3: jQuery — update count badge
      if (count > 0) {
        $('#histCount').text(count).show();
      } else {
        $('#histCount').hide();
      }

      document.getElementById('historyList').innerHTML = count
        ? items.map(item => {
          const date = new Date(item.createdAt).toLocaleString();
          const kb = item.fileSize ? `${(item.fileSize / 1024).toFixed(1)} KB` : '';
          return `<div class="hist-item">
              <div class="hi-name">${esc(item.fileName)}</div>
              <div class="hi-meta">${item.rowCount?.toLocaleString()} rows · ${item.colCount} cols ${kb ? '· ' + kb : ''}</div>
              <div class="hi-meta">${date}</div>
              <div class="hi-actions">
                <button class="hi-btn" onclick="HistoryUI.reopen('${esc(item.sessionId)}')">Load</button>
                <button class="hi-btn hi-del" onclick="HistoryUI.remove('${esc(item.sessionId)}', this)">Delete</button>
              </div>
            </div>`;
        }).join('')
        : '<div class="empty-state"><div class="empty-title">No history yet</div><div class="empty-sub">Upload and analyze a file to see it here.</div></div>';
    } catch (e) {
      document.getElementById('historyList').innerHTML =
        '<div class="empty-state"><div class="empty-sub">Could not load history (backend offline?)</div></div>';
    }
  }

  async function reopen(sessionId) {
    try {
      toast('Loading analysis…', 'info');
      const data = await ApiClient.getAnalysis(sessionId);

      // Reconstruct chartData from columnStats for chart rendering
      data.chartData = data.chartData || {};
      // history items don't store raw values — charts will degrade gracefully
      App.displayResults(data);
      App.toggleHistory();
    } catch (e) {
      toast('Could not load this analysis', 'error');
    }
  }

  async function remove(sessionId, btn) {
    try {
      await ApiClient.deleteHistory(sessionId);
      // Unit 3: jQuery — animate removal
      $(btn).closest('.hist-item').slideUp(200, function () { $(this).remove(); });
      toast('Deleted', 'info');
      load();
    } catch (e) {
      toast('Delete failed', 'error');
    }
  }

  async function clearAll() {
    if (!confirm('Delete all history?')) return;
    try {
      await ApiClient.clearAllHistory();
      toast('All history cleared', 'info');
      load();
    } catch (e) {
      toast('Clear failed', 'error');
    }
  }

  return { load, reopen, remove, clearAll };
})();

// ── Correlation color helper ───────────────────────────────────
function corrColor(r) {
  if (r >= 0.9) return 'rgba(124,110,255,0.92)';
  if (r >= 0.7) return 'rgba(124,110,255,0.65)';
  if (r >= 0.4) return 'rgba(124,110,255,0.35)';
  if (r >= 0.1) return 'rgba(124,110,255,0.15)';
  if (r >= -0.1) return 'rgba(80,80,100,0.25)';
  if (r >= -0.4) return 'rgba(240,79,107,0.15)';
  if (r >= -0.7) return 'rgba(240,79,107,0.35)';
  return 'rgba(240,79,107,0.75)';
}
