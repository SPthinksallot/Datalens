// ============================================================
// Unit 2: ES6 — main app module (IIFE, let/const, arrow fns,
//         promises, async/await, classes, spread/rest,
//         default params, string methods)
// Unit 3: jQuery — event handling, selectors, effects
// Unit 4: Front-end integration with Express backend
// ============================================================

'use strict';

// ── Theme toggle — Unit 1: CSS custom properties switching ────
const Theme = (() => {
  // Unit 2: localStorage, string methods
  const DARK  = 'dark';
  const LIGHT = 'light';

  function init() {
    const saved = localStorage.getItem('datalens-theme') || DARK;
    apply(saved);
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('datalens-theme', theme);
    const btn = document.getElementById('btnTheme');
    if (btn) btn.textContent = theme === DARK ? '☀' : '☾';
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    apply(current === DARK ? LIGHT : DARK);
  }

  return { init, toggle };
})();

// ── App Controller ─────────────────────────────────────────────
const App = (() => {
  // Unit 2: let/const
  let _uploadMeta = null; // info returned from POST /api/upload

  // ── jQuery document ready — Unit 3 ──────────────────────────
  $(document).ready(function () {
    Theme.init();

    // Unit 3: jQuery event handling — nav tab clicks
    $(document).on('click', '.nav-tab', function () {
      const tab = $(this).data('tab');
      if (!window._analysisData) return;

      // Unit 3: jQuery DOM manipulation
      $('.nav-tab').removeClass('active');
      $(this).addClass('active');

      // Unit 2: DOM — show/hide panels
      $('.panel').removeClass('active');
      $(`#panel-${tab}`).addClass('active');

      // Unit 3: jQuery fadeIn effect
      $(`#panel-${tab}`).hide().fadeIn(220);

      // Lazy-render on demand
      if (tab === 'correlation') UI.buildCorrelation(window._analysisData);
      if (tab === 'insights')    UI.buildInsights(window._analysisData);
      if (tab === 'data')        TableUI.init(window._analysisData);
      if (tab === 'charts')      ChartUI.update();
      if (tab === 'chat')        ChatUI.init(window._analysisData?.sessionId);
    });

    // Unit 3: jQuery drag-drop events
    const $dz = $('#dropZone');
    $dz.on('dragover', function (e) {
      e.preventDefault();
      $(this).addClass('drag-over'); // Unit 3: jQuery addClass
    }).on('dragleave drop', function (e) {
      e.preventDefault();
      $(this).removeClass('drag-over');
      if (e.type === 'drop') {
        const file = e.originalEvent.dataTransfer.files[0];
        if (file) handleFile(file);
      }
    });

    // Unit 1: HTML5 file input change event
    $('#fileInput').on('change', function () {
      if (this.files[0]) handleFile(this.files[0]);
    });

    // Load history count on boot
    HistoryUI.load();

    // Unit 3: jQuery hover effect on nav items
    $(document).on('mouseenter', '.nav-tab', function () {
      if (!$(this).hasClass('active')) {
        $(this).css('color', 'var(--c-text)'); // Unit 3: jQuery CSS
      }
    }).on('mouseleave', '.nav-tab', function () {
      if (!$(this).hasClass('active')) {
        $(this).css('color', '');
      }
    });
  });

  // ── File handling ────────────────────────────────────────────
  async function handleFile(file) {
    // Unit 2: string method endsWith, includes
    const name = file.name.toLowerCase();
    const ok   = ['.csv','.tsv','.json','.txt'].some(ext => name.endsWith(ext));
    if (!ok) { toast('Unsupported file type', 'error'); return; }
    if (file.size > 52_428_800) { toast('File too large (max 50 MB)', 'error'); return; }

    setProgress(true, 'Uploading to server…', 30);

    try {
      // Unit 4: POST /api/upload via ApiClient
      _uploadMeta = await ApiClient.uploadFile(file);
      setProgress(true, 'Analyzing…', 65);

      // Unit 4: POST /api/analyze
      const data = await ApiClient.analyzeFile({
        sessionId:    _uploadMeta.sessionId,
        storedName:   _uploadMeta.storedName,
        originalName: _uploadMeta.originalName,
        fileSize:     _uploadMeta.size
      });

      setProgress(true, 'Done!', 100);
      setTimeout(() => {
        setProgress(false);
        displayResults(data);
        toast(`Loaded: ${data.rowCount.toLocaleString()} rows × ${data.colCount} columns`, 'success');
      }, 400);

    } catch (err) {
      setProgress(false);
      toast(`Error: ${err.message}`, 'error');
      console.error(err);
    }
  }

  // ── Display results ─────────────────────────────────────────
  function displayResults(data) {
    // Store globally for all panels
    window._analysisData = data;

    // Update header — Unit 2: DOM manipulation
    $('#headerFileInfo').show();
    $('#hFileName').text(data.fileName);
    $('#hFileMeta').text(`${data.rowCount?.toLocaleString()} rows · ${data.colCount} cols`);
    $('#btnNew').show();

    // ── Hide upload page, reveal app shell ──────────────────
    // Fade out the upload panel, then switch to analysis view
    $('#panel-upload').fadeOut(300, function () {
      $(this).removeClass('active');

      // Show nav bar with a slide-down effect
      $('#appNav').hide().slideDown(250);

      // Build static panels immediately
      UI.buildOverview(data);
      UI.buildStats(data);
      ChartUI.populate(data);
      HistoryUI.load();

      // Navigate to overview — Unit 3: jQuery trigger
      $('[data-tab="overview"]').trigger('click');
    });
  }

  // ── Progress UI ──────────────────────────────────────────────
  function setProgress(show, label = '', pct = 0) {
    if (show) {
      // Unit 1: CSS animation on progress bar
      $('#uploadProgress').show();
      $('#progressLabel').text(label);
      $('#progressFill').css('width', pct + '%');
    } else {
      $('#uploadProgress').fadeOut(300);
    }
  }

  // ── Reset ────────────────────────────────────────────────────
  function reset() {
    window._analysisData = null;
    _uploadMeta = null;
    $('#headerFileInfo').hide();
    $('#btnNew').hide();
    $('#appNav').slideUp(200);
    // Fade out current panel, fade in upload hero
    $('.panel.active').fadeOut(200, function () {
      $('.panel').removeClass('active');
      $('#panel-upload').addClass('active').hide().fadeIn(300);
    });
    $('#fileInput').val('');
    toast('Ready for a new file', 'info');
  }

  // ── History drawer toggle ────────────────────────────────────
  function toggleHistory() {
    const open = $('#historyDrawer').hasClass('open');
    if (open) {
      $('#historyDrawer').removeClass('open');
      $('#historyOverlay').removeClass('open');
    } else {
      HistoryUI.load();
      $('#historyDrawer').addClass('open');
      $('#historyOverlay').addClass('open');
    }
  }

  // ── Sample data generator ─────────────────────────────────────
  // Unit 2: ES6 template literals, for loops, Math, array methods
  function loadSample(name) {
    let csv = '';

    if (name === 'sales') {
      csv = 'Month,Region,Product,Units_Sold,Revenue,Profit,Discount_Pct,Rating\n';
      const regions  = ['North','South','East','West'];
      const products = ['Widget A','Widget B','Gadget X','Gadget Y','Pro Pack'];
      const months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      for (let i = 0; i < 150; i++) {
        // Unit 2: Math.random, Math.floor
        const units    = Math.floor(Math.random() * 500 + 50);
        const price    = Math.random() * 80 + 20;
        const discount = Math.random() * 25;
        const rev      = +(units * price * (1 - discount / 100)).toFixed(2);
        const profit   = +(rev * (Math.random() * 0.3 + 0.1)).toFixed(2);
        const rating   = +(Math.random() * 2 + 3).toFixed(1);
        // Unit 2: template literal
        csv += `${months[i % 12]},${regions[i % 4]},${products[i % 5]},${units},${rev},${profit},${discount.toFixed(1)},${rating}\n`;
      }

    } else if (name === 'students') {
      csv = 'StudentID,Math,Science,English,Attendance,Grade,StudyHrs\n';
      const grades = ['A','B','C','D','F'];
      for (let i = 0; i < 100; i++) {
        const math  = Math.floor(Math.random() * 50 + 50);
        const sci   = Math.floor(math * 0.8 + Math.random() * 30);
        const eng   = Math.floor(Math.random() * 40 + 55);
        const att   = +(Math.random() * 30 + 70).toFixed(1);
        const study = +(Math.random() * 6 + 1).toFixed(1);
        const avg   = (math + sci + eng) / 3;
        const grade = avg > 85 ? 'A' : avg > 70 ? 'B' : avg > 60 ? 'C' : avg > 50 ? 'D' : 'F';
        csv += `S${String(i+1).padStart(3,'0')},${math},${sci},${eng},${att},${grade},${study}\n`;
      }

    } else if (name === 'products') {
      csv = 'ProductID,Category,Price,Stock,Rating,Reviews,Weight\n';
      const cats = ['Electronics','Clothing','Food','Sports','Books'];
      for (let i = 0; i < 120; i++) {
        const price   = +(Math.random() * 490 + 10).toFixed(2);
        const stock   = Math.floor(Math.random() * 500);
        const rating  = +(Math.random() * 2 + 3).toFixed(1);
        const reviews = Math.floor(Math.random() * 2000);
        const weight  = +(Math.random() * 9 + 0.1).toFixed(2);
        csv += `P${String(i+1).padStart(4,'0')},${cats[i%5]},${price},${stock},${rating},${reviews},${weight}\n`;
      }
    }

    // Unit 2: Blob, File API
    const blob = new Blob([csv], { type: 'text/csv' });
    const file = new File([blob], `${name}_sample.csv`, { type: 'text/csv' });
    handleFile(file);
  }

  return { reset, toggleHistory, displayResults, loadSample };
})();
