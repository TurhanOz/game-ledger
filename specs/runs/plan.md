# IMPLEMENTATION PLAN: GAME LEDGER

> Reference specs: [spec.md](spec.md), [tech.spec.md](tech.spec.md), [tests.spec.md](tests.spec.md)  
> Architecture rules: [.github/copilot-instructions.md](.github/copilot-instructions.md)

---

## Confirmed Design Decisions

| Topic | Decision |
|---|---|
| Monetary precision | All values stored as integer cents internally (`Math.round(input * 100)`). Divide by 100 **only** at display time. |
| UUID generation | `crypto.randomUUID()` exclusively — no external libraries. |
| State management | Single `useAppStore` Pinia store for all entities. Simplifies cross-entity integrity checks. |
| Router history | `createWebHashHistory()` — avoids GitHub Pages 404 on deep-link without server config. |
| Refund deletion | **Locked.** Refunds are immutable once created. No delete action in UI or store. |
| Session deletion | **Allowed with mandatory `ConfirmDialog` confirmation.** No hard business restriction. |
| Participant lock | `participantIds` set at session creation and never editable. Y is fixed. |
| Exactly one winner | Each round has exactly one winner. No tie-break logic needed. |
| No backend | 100% client-side. localStorage for persistence, File API for import/export. |

---

## Phase 1 — Project Scaffolding & Configuration

**Goal:** Working Vite + Vue 3 + TypeScript + Tailwind + Pinia skeleton with test runner configured.

### Tasks

1. Initialize project:
   ```bash
   npm create vite@latest . -- --template vue-ts
   ```

2. Pin Vue version and install runtime deps:
   ```bash
   npm install vue@3.5.33 pinia vue-router@4
   ```

3. Install dev deps:
   ```bash
   npm install -D vitest jsdom @vitest/ui @vue/test-utils @pinia/testing \
     tailwindcss@3 autoprefixer postcss @vitejs/plugin-vue @types/node
   ```

4. Configure `vite.config.ts`:
   - Add `@vitejs/plugin-vue` plugin
   - Set `base: '/game-ledger/'` for GitHub Pages
   - Add `test: { environment: 'jsdom', globals: true }` for Vitest

5. Configure `tsconfig.json`:
   - Enable `strict: true`
   - Add path alias: `"@/*": ["src/*"]`

6. Configure Tailwind:
   - `npx tailwindcss init -p` generates `tailwind.config.js` + `postcss.config.js`
   - Set `content: ['./index.html', './src/**/*.{vue,ts}']`
   - Inject `@tailwind base/components/utilities` directives into `src/assets/main.css`

7. Scaffold entry points:
   - `src/main.ts` — creates Vue app, registers Pinia + Router, mounts to `#app`
   - `src/App.vue` — root component with `<RouterView>` and a persistent bottom nav bar
   - `src/router/index.ts` — 3 routes: `/` (Dashboard), `/session/:id` (Active Session), `/settings` (Settings)

8. Add `package.json` scripts:
   ```json
   "dev": "vite",
   "build": "vue-tsc && vite build",
   "test": "vitest",
   "test:ui": "vitest --ui",
   "preview": "vite preview"
   ```

### Deliverable
`npm run dev` launches a blank app. `npm run test` runs with zero failures.

---

## Phase 2 — Domain Layer (TDD: Tests Before Code)

**Goal:** All business logic verified in pure isolation from DOM, Vue, and Pinia.

> **Strict TDD order:** Write the full test file → run tests (they MUST fail) → implement the function → run tests again (they MUST pass).

### Step 2a — Write Tests First

#### `src/domain/__tests__/calculations.test.ts`
Covers tests.spec.md scenarios 2.1, 2.2, 2.3.

| Test | Given | Expected |
|---|---|---|
| Basic round — Alice wins | 3 players, buy-in $10, Alice wins | Alice +20, Bob -10, Charlie -10, sum = 0 |
| Accumulation — Bob wins round 2 | Previous state Alice +20/Bob -10/Charlie -10, Bob wins | Alice +10, Bob +10, Charlie -20, sum = 0 |
| Undo last round | 2 rounds recorded | Removing round 2 reverts exactly to round-1 balances |

#### `src/domain/__tests__/ledger.test.ts`
Covers tests.spec.md scenario 3.1.

| Test | Given | Expected |
|---|---|---|
| Consolidated ignores refunds | Session1 (Alice+5/Bob-5), Session2 (Alice+10/Bob-10), Refund Bob→Alice $5 | Consolidated: Alice +15, Bob -15 |
| Ledger applies refunds | Same state | Ledger: Alice +10, Bob -10 |

#### `src/domain/__tests__/settlement.test.ts`
Covers tests.spec.md scenarios 4.1, 4.2.

| Test | Given | Expected |
|---|---|---|
| Linear chain A→B→C | Alice owes Bob $10, Bob owes Charlie $10 | Single tx: Alice pays Charlie $10. Bob absent. |
| Multi-debtor settlement | Alice +50, Bob -30, Charlie -20 | Two txs: Bob pays Alice $30, Charlie pays Alice $20 |

### Step 2b — Implement Domain Functions

All files in `src/domain/`. Zero imports from `vue`, `pinia`, or any UI library.

#### `src/domain/types.ts`
```ts
export interface Player { id: string; name: string }
export interface GameType { id: string; name: string }
export interface Round { winnerId: string }
export interface GameSession {
  id: string
  title: string
  date: string          // ISO string
  gameTypeId: string
  buyIn: number         // stored as integer cents
  participantIds: string[]
  rounds: Round[]
}
export interface Refund {
  id: string
  emitterId: string     // who paid
  receptorId: string    // who received
  amount: number        // integer cents
  date: string
}
export interface AppState {
  players: Player[]
  gameTypes: GameType[]
  gameSessions: GameSession[]
  refunds: Refund[]
}
export interface Settlement {
  debtorId: string
  creditorId: string
  amount: number        // integer cents
}
```

#### `src/domain/calculations.ts`
- `computeRoundDelta(participantIds: string[], winnerId: string, buyInCents: number): Record<string, number>`
  - Winner: `+(participantIds.length - 1) * buyInCents`
  - Each loser: `-buyInCents`
- `computeSessionBalances(session: GameSession): Record<string, number>`
  - Initialize all participants to 0
  - Reduce over `session.rounds` accumulating `computeRoundDelta` for each round

#### `src/domain/ledger.ts`
- `computeConsolidatedBalances(sessions: GameSession[]): Record<string, number>`
  - Sum `computeSessionBalances` across all sessions. Ignores refunds entirely.
- `computeLedgerBalances(sessions: GameSession[], refunds: Refund[]): Record<string, number>`
  - Start from consolidated balances
  - For each refund: `emitter -= amount`, `receptor += amount`

#### `src/domain/settlement.ts`
- `simplifyDebts(ledgerBalances: Record<string, number>): Settlement[]`
  - Min-Max Cash Flow algorithm:
    1. Build two heaps/sorted arrays: creditors (positive) and debtors (negative)
    2. Loop: match max creditor with max debtor
    3. Transaction amount = `min(abs(debtor), creditor)`
    4. Reduce both by transaction amount; if zeroed out remove from array
    5. Repeat until all balances are 0
    6. Return `Settlement[]` array

#### `src/domain/validation.ts`
- `canDeletePlayer(playerId: string, sessions: GameSession[], refunds: Refund[]): boolean`
  - Returns `false` if playerId appears in any `session.participantIds` OR any `refund.emitterId/receptorId`
- `canDeleteGameType(gameTypeId: string, sessions: GameSession[]): boolean`
  - Returns `false` if gameTypeId appears in any `session.gameTypeId`
- `parseAndValidateAppState(raw: unknown): AppState`
  - Validates shape of parsed JSON. Throws descriptive error on invalid structure.
  - Used for localStorage hydration and JSON import.

### Deliverable
`npm run test` — all 10+ domain scenarios from tests.spec.md pass with zero store or DOM involvement.

---

## Phase 3 — Store Layer (TDD)

**Goal:** Verified Pinia store wiring domain logic with localStorage persistence and relational integrity.

### Step 3a — Write Store Tests First

#### `src/stores/__tests__/appStore.test.ts`
Use `setActivePinia(createTestingPinia({ stubActions: false }))` to execute real actions.
Mock `localStorage` with `vi.stubGlobal('localStorage', localStorageMock)`.

| Test | Scenario |
|---|---|
| 1.1 Add player | Name "Alice" → UUID generated, exists in `store.players` |
| 1.1 Delete unlinked player | Alice not in any session → removed from `store.players` |
| 1.2 Block linked player deletion | Bob in a session → `deletePlayer` throws, Bob still in state |
| 5.1 localStorage sync | Round added → `localStorage.setItem` called with full serialized state |
| 5.2 Clean session | `resetAll()` → `localStorage.clear()` called, all state arrays empty |

### Step 3b — Implement `src/stores/app.ts`

Single `useAppStore` Pinia store (composition style with `defineStore`).

#### State
```ts
const players = ref<Player[]>([])
const gameTypes = ref<GameType[]>([])
const gameSessions = ref<GameSession[]>([])
const refunds = ref<Refund[]>([])
```

#### Getters (computed)
```ts
const consolidatedBalances = computed(() => computeConsolidatedBalances(gameSessions.value))
const ledgerBalances = computed(() => computeLedgerBalances(gameSessions.value, refunds.value))
const simplifiedSettlements = computed(() => simplifyDebts(ledgerBalances.value))
```

#### Actions
| Action | Behaviour |
|---|---|
| `addPlayer(name)` | `crypto.randomUUID()`, push to players |
| `updatePlayer(id, name)` | Find + update name |
| `deletePlayer(id)` | Check `canDeletePlayer` → throw if false, else splice |
| `addGameType(name)` | `crypto.randomUUID()`, push |
| `updateGameType(id, name)` | Find + update |
| `deleteGameType(id)` | Check `canDeleteGameType` → throw if false, else splice |
| `createSession(payload)` | `crypto.randomUUID()`, `buyIn` stored as `Math.round(payload.buyIn * 100)` |
| `deleteSession(id)` | No business restriction; caller must confirm via UI before calling |
| `addRound(sessionId, winnerId)` | Push `{ winnerId }` to session.rounds |
| `deleteLastRound(sessionId)` | Pop last item from session.rounds |
| `addRefund(payload)` | `crypto.randomUUID()`, `amount` stored as `Math.round(payload.amount * 100)` |
| ~~`deleteRefund`~~ | **Not implemented.** Refunds are immutable. |
| `resetAll()` | Reset all state to `[]`, call `localStorage.clear()` |
| `exportData()` | Return `JSON.stringify(currentState)` |
| `importData(json)` | Parse → `parseAndValidateAppState` → replace state |

#### Persistence
```ts
// Auto-save on every state mutation
watch(
  () => ({ players: players.value, gameTypes: gameTypes.value, gameSessions: gameSessions.value, refunds: refunds.value }),
  (state) => localStorage.setItem('game-ledger-state', JSON.stringify(state)),
  { deep: true }
)

// Hydrate on store initialization
const saved = localStorage.getItem('game-ledger-state')
if (saved) {
  try {
    const parsed = parseAndValidateAppState(JSON.parse(saved))
    players.value = parsed.players
    // ... etc
  } catch { /* ignore corrupt state, start fresh */ }
}
```

### Deliverable
`npm run test` — all store tests pass, including localStorage spy assertions.

---

## Phase 4 — View Layer

**Goal:** Full UI wired to the store, mobile-optimized for game entry, desktop-optimized for dashboards.

### Components (`src/components/`)

| Component | Responsibility |
|---|---|
| `PlayerManager.vue` | List players, add form, edit inline, delete button (shows error if blocked). Props: none. Reads store directly. |
| `GameTypeManager.vue` | Same pattern as `PlayerManager` for game types. |
| `BalanceBadge.vue` | Props: `amount: number` (cents). Displays `+$X.XX` in `text-green-600` or `-$X.XX` in `text-red-600`. |
| `BalanceTable.vue` | Props: `balances: Record<string, number>`, `players: Player[]`. Renders table with `BalanceBadge` per row. |
| `SessionCard.vue` | Props: `session: GameSession`, `players: Player[]`, `gameTypes: GameType[]`. Compact summary card. Emits `select` and `delete`. Delete triggers `ConfirmDialog` before emitting. |
| `RoundEntryPanel.vue` | Props: `participants: Player[]`. Emits `winner-selected(playerId)`. Grid of large buttons, each `min-h-[44px] min-w-[44px]`. Mobile-optimized. |
| `RoundHistoryList.vue` | Props: `rounds: Round[]`, `players: Player[]`. Ordered list. "Delete Last Round" button emits `undo`. |
| `RefundForm.vue` | Props: `players: Player[]`. Emits `submit(refundPayload)`. From/to dropdowns + amount input. |
| `SettlementList.vue` | Props: `settlements: Settlement[]`, `players: Player[]`. Renders "X must pay Y $Z". Debtor in `text-red-600`, creditor in `text-green-600`. |
| `ConfirmDialog.vue` | Props: `open: boolean`, `message: string`. Emits `confirm`, `cancel`. Reusable modal overlay for all destructive actions. |
| `ImportExportPanel.vue` | Buttons: Export (calls `store.exportData()` + triggers file download), Import (file input → `store.importData()`), Reset (triggers `ConfirmDialog` → calls `store.resetAll()`). |

### Views (`src/views/`)

#### `DashboardView.vue` — route `/`
- **Mobile:** Tab switcher between Consolidated / Ledger / Settlement sections (stacked, full width)
- **Desktop (`md:`):** Three-column grid `md:grid md:grid-cols-3 gap-4` displaying all three `BalanceTable` / `SettlementList` panels side by side
- Below the balances: list of `SessionCard` components with "New Session" button
- "New Session" opens an inline form or modal: title, game type (select), date, buy-in amount, participants (multi-select)

#### `SessionView.vue` — route `/session/:id`
- Reads session from store by route param `:id`; redirects to `/` if not found
- Top: session metadata + live `BalanceTable` for this session only
- Middle: `RoundEntryPanel` — tapping a player name calls `store.addRound(sessionId, playerId)`
- Bottom: `RoundHistoryList` — "Delete Last Round" calls `store.deleteLastRound(sessionId)` after `ConfirmDialog`
- Back link returns to Dashboard

#### `SettingsView.vue` — route `/settings`
- **Mobile:** Stacked sections
- **Desktop (`md:`):** Two-column grid — `PlayerManager` | `GameTypeManager`
- Below: `ImportExportPanel`
- Below: `RefundForm` + list of recorded refunds (read-only, no delete)

### Routing (`src/router/index.ts`)
```ts
createRouter({
  history: createWebHashHistory('/game-ledger/'),
  routes: [
    { path: '/', component: DashboardView },
    { path: '/session/:id', component: SessionView },
    { path: '/settings', component: SettingsView },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})
```

### Design Token Summary
| Token | Tailwind Class |
|---|---|
| Positive / credit | `text-green-600`, `bg-green-50` |
| Negative / debt | `text-red-600`, `bg-red-50` |
| Touch target minimum | `min-h-[44px] min-w-[44px]` |
| Mobile layout | `flex flex-col` (default) |
| Desktop layout | `md:grid md:grid-cols-2` / `md:grid-cols-3` |
| Bottom nav height | `h-16` |

### Deliverable
Full interactive UI. `npm run dev` — complete app usable end-to-end in browser.

---

## Phase 5 — Build & GitHub Pages Deployment

**Goal:** Automated CI/CD pipeline that builds the app and publishes to GitHub Pages on every push to `main`.

### Step 5a — Verify Production Build Locally

```bash
npm run build        # vue-tsc type-check + vite build → outputs dist/
npm run preview      # serves dist/ locally at http://localhost:4173/game-ledger/
```

Checklist before pushing:
- [ ] `dist/` generated with no TypeScript errors
- [ ] App loads correctly at `http://localhost:4173/game-ledger/`
- [ ] Hash-based routing works (`/#/session/...`, `/#/settings`)
- [ ] `vite.config.ts` has `base: '/game-ledger/'`

### Step 5b — GitHub Repository Setup

1. Push code to `main` branch on GitHub at `https://github.com/<owner>/game-ledger`
2. In repository **Settings → Pages**:
   - Source: **GitHub Actions** (not the legacy branch deploy)

### Step 5c — Create CI/CD Workflow

File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test -- --run

      - name: Build
        run: npm run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 5d — Hash Router Verification

Because `createWebHashHistory()` is used, all routes are prefixed with `#`. No `404.html` redirect hack is needed. Verify:
- `https://<owner>.github.io/game-ledger/` loads the Dashboard
- `https://<owner>.github.io/game-ledger/#/settings` loads Settings directly
- Hard-refresh on any hash route works without 404

### Deliverable
Every push to `main` runs tests, builds, and deploys automatically. Live URL: `https://<owner>.github.io/game-ledger/`

---

## End-to-End Verification Checklist

| Check | How to Verify |
|---|---|
| All TDD scenarios pass | `npm run test` → 0 failures |
| No TypeScript errors | `npm run build` completes cleanly |
| Float precision | Buy-in $0.10, 3 players → balances show exactly `+$0.20` / `-$0.10` |
| Relational guard — player | Add player to session, attempt delete → UI shows error |
| Relational guard — game type | Link game type to session, attempt delete → UI shows error |
| Refund immutability | No delete button present anywhere on refund entries |
| Session delete confirmation | Click delete on session → `ConfirmDialog` appears before any action |
| Undo last round | Play 2 rounds, undo → balances revert to round-1 state exactly |
| Mobile touch targets | DevTools mobile emulation → round-entry buttons ≥ 44px |
| Desktop dashboard | Browser ≥ 768px → 3-column grid visible |
| localStorage persistence | Add round → DevTools Application tab → LocalStorage shows updated JSON |
| Clean session | Reset → confirm → state empty, localStorage cleared |
| Export/Import round-trip | Export JSON → Reset → Import → state fully restored |
| GitHub Pages deployment | Push to `main` → Actions CI green → live URL loads app |

---

## File Map (All New Files)

```
game-ledger/
├── .github/
│   └── workflows/
│       └── deploy.yml                    # Phase 5 — CI/CD pipeline
├── public/
│   └── (favicon, etc.)
├── src/
│   ├── assets/
│   │   └── main.css                      # Tailwind directives
│   ├── domain/                           # Phase 2 — Pure logic (no framework imports)
│   │   ├── __tests__/
│   │   │   ├── calculations.test.ts
│   │   │   ├── ledger.test.ts
│   │   │   └── settlement.test.ts
│   │   ├── types.ts
│   │   ├── calculations.ts
│   │   ├── ledger.ts
│   │   ├── settlement.ts
│   │   └── validation.ts
│   ├── stores/                           # Phase 3 — Pinia store
│   │   ├── __tests__/
│   │   │   └── appStore.test.ts
│   │   └── app.ts
│   ├── components/                       # Phase 4 — Reusable UI components
│   │   ├── PlayerManager.vue
│   │   ├── GameTypeManager.vue
│   │   ├── BalanceBadge.vue
│   │   ├── BalanceTable.vue
│   │   ├── SessionCard.vue
│   │   ├── RoundEntryPanel.vue
│   │   ├── RoundHistoryList.vue
│   │   ├── RefundForm.vue
│   │   ├── SettlementList.vue
│   │   ├── ConfirmDialog.vue
│   │   └── ImportExportPanel.vue
│   ├── views/                            # Phase 4 — Page-level views
│   │   ├── DashboardView.vue
│   │   ├── SessionView.vue
│   │   └── SettingsView.vue
│   ├── router/
│   │   └── index.ts                      # Phase 1
│   ├── App.vue                           # Phase 1
│   └── main.ts                           # Phase 1
├── index.html
├── package.json                          # Phase 1
├── vite.config.ts                        # Phase 1
├── tailwind.config.js                    # Phase 1
├── postcss.config.js                     # Phase 1
└── tsconfig.json                         # Phase 1
```
