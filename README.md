# DataLens — Full-Stack CSV Analyzer

A full-stack CSV/data analyzer covering all 6 units of the Web Development syllabus.

---

## Project Structure

```
datalens/
├── backend/                       ← Unit 4: Node.js + Express + MongoDB
│   ├── server.js                  ← Express app, EventEmitter, middleware setup
│   ├── package.json               ← npm scripts: start, dev (nodemon), test (jest)
│   ├── models/
│   │   ├── db.js                  ← MongoDB connection (Mongoose)
│   │   └── Analysis.js            ← Mongoose schema for saved analyses
│   ├── middleware/
│   │   ├── requestLogger.js       ← Custom middleware (req, res, next)
│   │   └── errorHandler.js        ← Error middleware (4-arg signature)
│   ├── routes/
│   │   ├── upload.js              ← POST /api/upload (multer + fs)
│   │   ├── analyze.js             ← POST /api/analyze
│   │   └── history.js             ← GET/DELETE /api/history
│   └── services/
│       ├── statsService.js        ← ES6 classes: CSVParser + DataAnalyzer
│       └── statsService.test.js   ← Jest unit tests
│
└── frontend/
    └── public/
        ├── index.html             ← Unit 1: HTML5 semantic structure
        ├── css/
        │   └── style.css          ← Unit 1: Full CSS (flex, grid, animations)
        └── js/
            ├── api.js             ← Unit 1+4: HTTP client (fetch, GET/POST/DELETE)
            ├── charts.js          ← Unit 2: ChartManager class + Chart.js
            ├── ui.js              ← Unit 2+3: DOM manipulation + jQuery effects
            └── app.js             ← Unit 2+3: App controller, jQuery events
```

---

## Setup & Run

### Prerequisites
- Node.js v18+
- MongoDB (optional — app runs in memory-only mode without it)

### Backend
```bash
cd backend
npm install
npm run dev        # nodemon — auto-restarts on file change
```

Server starts at **http://localhost:5000**

### Frontend
Open `frontend/public/index.html` directly in your browser **or** visit `http://localhost:5000` (backend serves the static files).

### Run Tests (Unit 4: Jest)
```bash
cd backend
npm test
```

---

## Syllabus Coverage Map

### Unit 1 — HTML5 + CSS
| Topic | Where |
|---|---|
| HTML5 semantic elements (header, nav, main, section, footer) | `index.html` |
| HTML5 form + file input with validation | `index.html` — upload zone |
| External CSS file linking | `index.html` → `css/style.css` |
| External JS file linking | `index.html` → `js/*.js` |
| CSS Custom Properties (variables) | `style.css` — `:root` block |
| Box model (margin, padding, border) | `style.css` — throughout |
| Flexbox layout | `style.css` — header, nav, toolbar |
| CSS Grid layout | `style.css` — col-grid, overview cards |
| CSS Positioning | `style.css` — sticky header, drawer |
| CSS Animations & Transitions | `style.css` — spin, pulse, fadeUp, progress |
| Colors, typography, backgrounds | `style.css` — full theme |
| Responsive design (media queries) | `style.css` — `@media (max-width: 768px)` |
| HTTP methods, status codes | `api.js`, `upload.js`, `history.js` |
| URL structure, query parameters | `api.js` — `?limit=20&page=0` |

### Unit 2 — JavaScript ES6 + DOM
| Topic | Where |
|---|---|
| ES6 Classes | `statsService.js` — CSVParser, DataAnalyzer; `charts.js` — ChartManager |
| `let` / `const` | All JS files |
| Arrow functions | All JS files |
| Spread / Rest operator | `statsService.js`, `charts.js` |
| `for...of` loop | `statsService.js` |
| `Map` and `Set` | `statsService.js` — frequency counting |
| Promises + async/await | `app.js`, `api.js` |
| Destructuring | `statsService.js`, `app.js` |
| Default parameters | `charts.js` — `_defaults(type = 'bar')` |
| String methods (includes, startsWith, endsWith, split, trim) | `statsService.js`, `app.js` |
| Built-in Math object | `statsService.js` — mean, stddev, skewness |
| Array methods (map, filter, reduce, sort, forEach) | `statsService.js`, `ui.js` |
| Template literals | All JS files |
| DOM selection + modification | `ui.js` — `document.getElementById`, `innerHTML` |
| Event handling | `app.js`, `ui.js` |
| DOM CSS modification | `ui.js` — dynamic styles |

### Unit 3 — jQuery + Bootstrap
| Topic | Where |
|---|---|
| jQuery selectors | `app.js`, `ui.js` — `$('#id')`, `$('.class')` |
| jQuery DOM manipulation | `ui.js` — `.text()`, `.html()`, `.addClass()` |
| jQuery event handling | `app.js` — `.on('click', ...)`, drag/drop |
| jQuery effects | `ui.js` — `.slideDown()`, `.fadeIn()`, `.fadeOut()` |
| jQuery hover | `ui.js` — heatmap hover, nav hover |
| jQuery CSS modification | `ui.js` — `.css()` |
| Bootstrap grid | `index.html` — `row g-3`, `col-md-3` |
| Bootstrap components | `index.html` — cards, badges, buttons |
| Bootstrap responsive | `index.html` — col-md-* breakpoints |
| Bootstrap JS (bundle) | `index.html` — CDN script tag |

### Unit 4 — Node.js + Express
| Topic | Where |
|---|---|
| Node.js EventEmitter | `server.js` — `appEvents.emit/on` |
| Built-in `fs` module | `upload.js`, `analyze.js` |
| Built-in `path` module | `server.js`, `upload.js`, `analyze.js` |
| Built-in `os` module | `server.js` — health endpoint |
| Express setup + listen | `server.js` |
| Express routing | `routes/upload.js`, `analyze.js`, `history.js` |
| Middleware (custom) | `requestLogger.js`, `errorHandler.js` |
| Multer file upload | `routes/upload.js` |
| Express + MongoDB | `models/Analysis.js`, `models/db.js` |
| HTTP Methods (GET/POST/DELETE) | All routes |
| HTTP Status Codes | All routes — 200, 201, 400, 404, 413, 422, 500 |
| npm scripts (start, dev, test) | `package.json` |
| nodemon | `package.json` devDependency |
| Unit testing (Jest) | `statsService.test.js` |
| Front-end + back-end integration | `api.js` → Express routes |

---

## API Endpoints

| Method | URL | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload file (multipart) |
| `POST` | `/api/analyze` | Analyze uploaded file |
| `GET` | `/api/history` | List saved analyses |
| `GET` | `/api/history/:sessionId` | Load one analysis |
| `DELETE` | `/api/history/:sessionId` | Delete one analysis |
| `DELETE` | `/api/history` | Clear all history |
| `GET` | `/api/health` | Server health info |
