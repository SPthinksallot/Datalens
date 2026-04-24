// ============================================================
// API Client — FINAL PRODUCTION VERSION
// ============================================================

'use strict';

// ✅ Your LIVE backend URL
const API_BASE = 'https://datalens-nd3e.onrender.com';

class ApiClient {

  // ✅ Upload CSV
  static async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Upload failed: ${res.status}`);
    }

    return res.json();
  }

  // ✅ Analyze file
  static async analyzeFile(payload) {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Analysis failed: ${res.status}`);
    }

    return res.json();
  }

  // ✅ Get history
  static async getHistory(limit = 20, page = 0) {
    const url = `${API_BASE}/api/history?limit=${limit}&page=${page}`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error('Failed to load history');
    }

    return res.json();
  }

  // ✅ Get single analysis
  static async getAnalysis(sessionId) {
    const res = await fetch(`${API_BASE}/api/history/${sessionId}`);

    if (!res.ok) {
      throw new Error(`Analysis not found: ${res.status}`);
    }

    return res.json();
  }

  // ✅ Delete one history
  static async deleteHistory(sessionId) {
    const res = await fetch(`${API_BASE}/api/history/${sessionId}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      throw new Error('Delete failed');
    }

    return res.json();
  }

  // ✅ Clear all history
  static async clearAllHistory() {
    const res = await fetch(`${API_BASE}/api/history`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      throw new Error('Clear failed');
    }

    return res.json();
  }

  // ✅ Health check
  static async health() {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.json();
  }

  // ✅ Upload blob (sample data)
  static async uploadBlob(blob, name) {
    const file = new File([blob], name, { type: 'text/csv' });
    return ApiClient.uploadFile(file);
  }
}