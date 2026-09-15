# School Competition Management & Live Quiz System — Frontend

A frontend-only React implementation of the competition/host/controller platform, built against a
fully documented API contract (`docs/API_SPECIFICATION.md`) and a configured backend API.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

## Demo accounts

| Role       | Username / Name | Password  |
|------------|------------------|-----------|
| Admin      | `Admin`          | `admin123`|
| Host       | `host1`          | `host123` |
| Controller | `controller1`    | `ctrl123` |

Open two browser windows/tabs to run Host and Controller side-by-side and watch them stay in sync
through the configured API (they poll the same `live-state` / `public-state` endpoints — no direct
DOM/state sharing between the two).

## What's implemented

- **`docs/API_SPECIFICATION.md`** — the full API contract, written before any UI code, per the
  project's mandated implementation order.
- **`src/api/`** — one service module per domain (`authApi`, `schoolsApi`, `subjectsApi`,
  `questionsApi`, `competitionsApi`, `matchesApi`, `resultsApi`, `liveMatchApi`, ...), all routed
  through a single `client.js` fetch wrapper. No component calls `fetch()` directly.
- **Auth & routing** — Admin login only (name + password, no email), a single shared
  Host/Controller login at `/staff/login` with server-resolved role redirect, and role-gated routes.
  No `localStorage`/`sessionStorage` is used anywhere; the auth token lives in memory only
  (`src/api/client.js`'s `sessionStore`), so a hard refresh returns to a logged-out state by design.
- **Admin** — collapsible sidebar, Dashboard, Schools, Subjects, Question Bank (manual entry +
  video questions + download/upload templates), Competition Setup (school/subject selection with
  disabled items greyed out and unselectable, Host/Controller assignment), Matches/Fixtures
  (bracket generation + date editing), Results, Reports (PDF request/poll/download), and a
  password-gated Edit Profile popup.
- **Host** — normal and video modes in one page, school/turn selector enforcing the 5-question
  rule, subject selector, 20-slot question grid (10-slot video grid), question panel with
  Correct/Incorrect, and a timer that records a `TIMEOUT` result through the API when it expires.
- **Controller** — a separate, independently-mode-switching public display that only ever reads
  live state and never mutates it, plus the green/red edge-flash result animation.

## Backend integration

- Point `VITE_API_BASE_URL` at the office backend server without changing components.
- The Controller's "live sync" is implemented as short-interval polling
  (`src/api/liveMatchApi.js#subscribeToLiveState`) standing in for the documented SSE stream
  (`GET /api/matches/:id/public-state/stream`) until the backend exposes a real event stream.
- The downloaded "template" is a CSV rather than a formatted spreadsheet, and the generated report
  PDF is a minimal placeholder document — both are meant to be produced by the real backend.

## Project structure

```
docs/API_SPECIFICATION.md   # the API contract (write this first, per spec)
src/
  api/            # one service module per domain, all via client.js
  context/        # AuthContext (in-memory session, no localStorage)
  routes/         # ProtectedRoute (role-gated)
  constants/      # centralized status/enum values
  components/     # layout, common, competition, questions, host, controller
  pages/          # admin/*, auth/*, host/*, controller/*, LandingPage
```
