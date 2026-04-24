// ============================================================
// Unit 1+4: API Client — HTTP & HTTPS, Request/Response,
//           Methods (GET, POST, DELETE), Status Codes,
//           URL Structure, Query Parameters
// Unit 2: Promises, async/await, ES6 classes
// ============================================================

'use strict';

// Unit 1: Base URL — URL structure
const API_BASE = 'https://datalens-nd3e.onrender.com';

class ApiClient {
  // Unit 2: async/await, Promise

  // Unit 4: POST /api/upload — multipart/form-data
  static async uploadFile(file) {
    const formData = new FormData(); // Unit 1: HTML5 FormData
    formData.append('file', file);

    // Unit 1: HTTP POST method
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
      // No Content-Type header — browser sets it with boundary for multipart
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Upload failed: ${res.status}`);
    }
    return res.json(); // Unit 1: JSON response body
  }

  // Unit 4: POST /api/analyze — JSON body
  static async analyzeFile(payload) {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // Unit 1: HTTP headers
      body: JSON.stringify(payload)                     // Unit 1: Request body
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Analysis failed: ${res.status}`);
    }
    return res.json();
  }

  // Unit 1: GET /api/history?limit=20&page=0 — query parameters
  static async getHistory(limit = 20, page = 0) {
    // Unit 1: URL with query parameters
    const url = `${API_BASE}/history?limit=${limit}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load history');
    return res.json();
  }

  // Unit 1: GET /api/history/:sessionId — URL parameter
  static async getAnalysis(sessionId) {
    const res = await fetch(`${API_BASE}/history/${sessionId}`);
    if (!res.ok) throw new Error(`Analysis not found: ${res.status}`); // Unit 1: Status codes
    return res.json();
  }

  // Unit 1: DELETE HTTP method
  static async deleteHistory(sessionId) {
    const res = await fetch(`${API_BASE}/history/${sessionId}`, {
      method: 'DELETE'   // Unit 1: DELETE HTTP method
    });
    if (!res.ok) throw new Error('Delete failed');
    return res.json();
  }

  static async clearAllHistory() {
    const res = await fetch(`${API_BASE}/history`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Clear failed');
    return res.json();
  }

  // Unit 1: GET /api/health — server health check
  static async health() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  }

  // Unit 4: Upload a blob as CSV (used by sample data generator)
  static async uploadBlob(blob, name) {
    const file = new File([blob], name, { type: 'text/csv' });
    return ApiClient.uploadFile(file);
  }
}
