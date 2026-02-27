# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint checks
npm run preview    # Preview production build locally
```

Cloud Functions (from `functions/` directory):
```bash
cd functions && npm run build    # Compile Cloud Functions
cd functions && npm run serve    # Local emulator
cd functions && npm run deploy   # Deploy to Firebase
```

Firebase deployment:
```bash
firebase deploy --only hosting    # Deploy frontend
firebase deploy --only functions  # Deploy Cloud Functions
firebase deploy --only firestore  # Deploy Firestore rules/indexes
```

## Architecture

This is a **React 19 + TypeScript + Firebase** dashboard for Paka Festival participant management. It fetches participant data from the Weezevent ticketing API via Cloud Functions and stores snapshots in Firestore.

### Three-Tier Data Flow

1. **Cloud Functions** (`functions/src/index.ts`) — Two functions running on Node 20 in `europe-west1`:
   - `dailyWeezeventSync`: Scheduled daily at 6 AM (Europe/Paris), authenticates with Weezevent API, fetches all participants, saves snapshot to Firestore
   - `manualWeezeventSync`: HTTP POST endpoint triggered from the dashboard UI

2. **Firestore** — Collections:
   - `weezevent_snapshots/latest` — Current participant data (read by frontend)
   - `weezevent_snapshots/{timestamp}` — Historical snapshots
   - `graph_events/` — Timeline event markers displayed on charts

3. **React SPA** (`src/`) — Reads from Firestore, all filtering/stats computed client-side

### Frontend Structure

- **`src/hooks/`** — Business logic separated from components:
  - `useAuth` — Session-based auth (sessionStorage)
  - `useParticipants` — Fetches from Firestore, computes stats (department, age range) via `useMemo`
  - `useFilters` — Client-side text search + age/postal code filtering
  - `useCommunes` — Batch geocoding via geo.api.gouv.fr for map display

- **`src/services/`** — External service clients:
  - `firebase.ts` — Firestore reads, Cloud Function triggers, graph events CRUD
  - `api.ts` — Weezevent API client (auth, participants, tickets)

- **`src/components/`** — UI components with co-located CSS files. Barrel-exported via `index.ts`

- **`src/constants/`** — Weezevent API credentials and age range definitions

- **`src/types/`** — TypeScript interfaces (Participant, Owner, Buyer, Answer, etc.)

- **`src/utils/helpers.ts`** — Data transformation utilities

### Key Component Hierarchy

`App.tsx` orchestrates: `Login` → authenticated view with `Header`, `Controls` (search + sync), `Filters` (age/postal), `StatsCards` (KPIs), `StatsSection` (tabbed: stats tables / Leaflet map / Recharts graphs), `ParticipantsTable`, `Footer`

### Visualization Libraries

- **Recharts** for Line/Bar/Pie charts in `ParticipantGraph`
- **Leaflet + react-leaflet** with MarkerCluster for the interactive France map

## Conventions

- UI labels are in **French** with date formatting using `fr-FR` locale
- Code comments and variable names are in **English**
- Component CSS is co-located (e.g., `Graph/ParticipantGraph.css` alongside `.tsx`)
- Vite proxies `/api` routes to `https://api.weezevent.com` during development
- Firestore rules are read-only for clients; writes happen exclusively through Cloud Functions
- Firebase project ID: `portfolio-d0bfe`, hosted from `dist/` directory
