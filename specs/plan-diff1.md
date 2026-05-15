# IMPLEMENTATION PLAN DIFF — V1.1 CHANGES

> Covers only the incremental work introduced by spec V1.1 changes.  
> Reference: [spec-diff1.md](spec-diff1.md) | Base plan: [plan.md](plan.md)

---

## Guiding Principles for This Diff

1. **TDD first** — update or add failing tests before touching implementation.
2. **Domain isolation** — no Vue/Pinia imports in `src/domain/`.
3. **Backwards compatibility** — `parseAndValidateAppState` must gracefully handle legacy V1.0 localStorage data (sessions with `title`, rounds without `timestamp`, missing `settings`).

---

## Step D1 — Domain Layer: Type Updates

**File:** `src/domain/types.ts`

### Changes

#### Remove `title` from `GameSession`
```ts
// BEFORE
export interface GameSession {
  id: string
  title: string        // ← remove
  date: string
  ...
}

// AFTER
export interface GameSession {
  id: string
  date: string
  ...
}
```

#### Add `timestamp` to `Round`
```ts
// BEFORE
export interface Round {
  winnerId: string
}

// AFTER
export interface Round {
  winnerId: string
  timestamp: string    // ISO 8601 — e.g., "2026-05-15T20:34:11.000Z"
}
```

#### Add `AppSettings` and wire into `AppState`
```ts
export interface AppSettings {
  locale: 'en' | 'fr'
  currency: '$' | '€'
}

// Default value (exported constant, used by store initializer)
export const DEFAULT_SETTINGS: AppSettings = {
  locale: 'en',
  currency: '$',
}

// AppState — add settings
export interface AppState {
  players: Player[]
  gameTypes: GameType[]
  gameSessions: GameSession[]
  refunds: Refund[]
  settings: AppSettings     // ← new
}
```

---

## Step D2 — Domain Layer: Validation Update

**File:** `src/domain/validation.ts`

### Changes

#### `parseAndValidateAppState` — schema migration + backward compatibility

The function must:
1. Accept V1.0 payloads (sessions may have a `title` field → silently drop it; rounds may lack `timestamp` → backfill with `""`).
2. Accept missing `settings` → backfill with `DEFAULT_SETTINGS`.
3. Validate the new `Round.timestamp` field when present (must be a string).

```ts
// Backward-compat round hydration
function hydrateRound(raw: unknown): Round {
  // winnerId required; timestamp optional (backfill empty string for legacy data)
  ...
}

// Backward-compat session hydration
function hydrateSession(raw: unknown): GameSession {
  // drop `title` if present; map rounds through hydrateRound
  ...
}

// Backward-compat settings hydration
function hydrateSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS }
  // merge with defaults so new fields added in future versions are safe
  ...
}
```

---

## Step D3 — Domain Tests: Update Existing + Add New

**File:** `src/domain/__tests__/calculations.test.ts`

### Update existing round fixtures
All existing test fixtures that construct `Round` objects must add a `timestamp` field. Use an empty string `""` or a fixed ISO date to avoid time-dependency:

```ts
// BEFORE
const rounds = [{ winnerId: 'alice' }]

// AFTER
const rounds = [{ winnerId: 'alice', timestamp: '2026-01-01T00:00:00.000Z' }]
```

---

## Step D4 — Store Layer: `useAppStore` Updates

**File:** `src/stores/app.ts`

### 4a — Add `settings` state

```ts
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
```

### 4b — Hydrate settings on startup

```ts
const saved = localStorage.getItem('game-ledger-state')
if (saved) {
  try {
    const parsed = parseAndValidateAppState(JSON.parse(saved))
    players.value = parsed.players
    gameTypes.value = parsed.gameTypes
    gameSessions.value = parsed.gameSessions
    refunds.value = parsed.refunds
    settings.value = parsed.settings         // ← new
  } catch { /* start fresh */ }
}
```

### 4c — Persist settings in the watch

```ts
watch(
  () => ({ players: players.value, gameTypes: gameTypes.value,
           gameSessions: gameSessions.value, refunds: refunds.value,
           settings: settings.value }),       // ← add settings
  (state) => localStorage.setItem('game-ledger-state', JSON.stringify(state)),
  { deep: true }
)
```

### 4d — Remove `title` from `createSession`

```ts
// BEFORE payload type
interface CreateSessionPayload {
  title: string
  gameTypeId: string
  date: string
  buyIn: number
  participantIds: string[]
}

// AFTER — title removed
interface CreateSessionPayload {
  gameTypeId: string
  date: string
  buyIn: number
  participantIds: string[]
}
```

### 4e — Stamp `timestamp` on `addRound`

```ts
function addRound(sessionId: string, winnerId: string): void {
  const session = gameSessions.value.find(s => s.id === sessionId)
  if (!session) return
  guardLatestSession(session)              // see 4f
  session.rounds.push({ winnerId, timestamp: new Date().toISOString() })
}
```

### 4f — `guardLatestSession` helper (internal)

```ts
// Returns the session with the latest date. Tie-break: last in the array (insertion order).
const latestSession = computed<GameSession | undefined>(() => {
  if (!gameSessions.value.length) return undefined
  return [...gameSessions.value].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0]
})

function guardLatestSession(session: GameSession): void {
  if (latestSession.value?.id !== session.id) {
    throw new Error('Only the latest session can be mutated.')
  }
}
```

### 4g — Guard `deleteLastRound` and `deleteSession`

```ts
function deleteLastRound(sessionId: string): void {
  const session = gameSessions.value.find(s => s.id === sessionId)
  if (!session) return
  guardLatestSession(session)
  session.rounds.pop()
}

function deleteSession(id: string): void {
  const session = gameSessions.value.find(s => s.id === id)
  if (!session) return
  guardLatestSession(session)
  gameSessions.value = gameSessions.value.filter(s => s.id !== id)
}
```

### 4h — `sortedSessions` computed getter

```ts
const sortedSessions = computed<GameSession[]>(() =>
  [...gameSessions.value].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
)
```

### 4i — `updateSettings` action

```ts
function updateSettings(patch: Partial<AppSettings>): void {
  settings.value = { ...settings.value, ...patch }
}
```

### 4j — Expose new items in store return

```ts
return {
  // state
  players, gameTypes, gameSessions, refunds, settings,
  // getters
  consolidatedBalances, ledgerBalances, simplifiedSettlements,
  sortedSessions, latestSession,
  // actions
  addPlayer, updatePlayer, deletePlayer,
  addGameType, updateGameType, deleteGameType,
  createSession, deleteSession,
  addRound, deleteLastRound,
  addRefund,
  updateSettings,
  resetAll, exportData, importData,
}
```

---

## Step D5 — Store Tests: Update + Add

**File:** `src/stores/__tests__/appStore.test.ts`

### Update existing tests
- Remove `title` from any `createSession` calls in test fixtures.
- When asserting round data, expect a `timestamp` string to be present.

### New test cases to add

| # | Scenario | Expected |
|---|---|---|
| Lock-1 | `addRound` called on a session that is NOT the latest | Throws `"Only the latest session can be mutated."` |
| Lock-2 | `deleteLastRound` called on a locked session | Throws same error |
| Lock-3 | `deleteSession` called on a locked session | Throws same error |
| Lock-4 | `addRound` on the latest session when an older session exists | Succeeds; round appended |
| Stamp-1 | `addRound` succeeds | New round has `timestamp` string in ISO format |
| Settings-1 | `updateSettings({ locale: 'fr' })` | `store.settings.locale === 'fr'` |
| Settings-2 | `updateSettings({ currency: '€' })` | `store.settings.currency === '€'` |
| Settings-3 | Settings persisted | `localStorage.setItem` payload includes `settings` object |

---

## Step D6 — i18n Layer (New)

### New Files

#### `src/i18n/en.ts`
```ts
export const en = {
  nav: {
    dashboard: 'Dashboard',
    settings: 'Settings',
  },
  session: {
    newSession: 'New Session',
    gameType: 'Game Type',
    date: 'Date',
    buyIn: 'Buy-in',
    participants: 'Participants',
    create: 'Create Session',
    delete: 'Delete Session',
    confirmDelete: 'Are you sure you want to delete this session? This action cannot be undone.',
    locked: 'Locked',
  },
  round: {
    selectWinner: 'Select Round Winner',
    history: 'Round History',
    deleteLastRound: 'Undo Last Round',
    confirmUndo: 'Remove the last round? Balances will be recalculated.',
    round: 'Round',
    winner: 'Winner',
    at: 'at',
  },
  balance: {
    consolidated: 'Consolidated (Performance)',
    ledger: 'Ledger (Actual Debts)',
    settlement: 'Settlement',
    player: 'Player',
    balance: 'Balance',
    mustPay: 'must pay',
  },
  refund: {
    title: 'Refunds',
    from: 'From',
    to: 'To',
    amount: 'Amount',
    submit: 'Add Refund',
  },
  settings: {
    title: 'Settings',
    players: 'Players',
    gameTypes: 'Game Types',
    language: 'Language',
    currency: 'Currency',
    exportData: 'Export Data',
    importData: 'Import Data',
    resetAll: 'Reset All Data',
    confirmReset: 'This will permanently delete all data. Are you sure?',
  },
  players: {
    add: 'Add Player',
    name: 'Player name',
    edit: 'Edit',
    delete: 'Delete',
    errorLinked: 'Cannot delete: player is linked to an existing session or refund.',
  },
  gameTypes: {
    add: 'Add Game Type',
    name: 'Game type name',
    edit: 'Edit',
    delete: 'Delete',
    errorLinked: 'Cannot delete: game type is linked to an existing session.',
  },
}

export type Translations = typeof en
```

#### `src/i18n/fr.ts`
```ts
import type { Translations } from './en'

export const fr: Translations = {
  nav: {
    dashboard: 'Tableau de bord',
    settings: 'Paramètres',
  },
  session: {
    newSession: 'Nouvelle partie',
    gameType: 'Type de jeu',
    date: 'Date',
    buyIn: 'Mise',
    participants: 'Participants',
    create: 'Créer la partie',
    delete: 'Supprimer la partie',
    confirmDelete: 'Supprimer cette partie ? Cette action est irréversible.',
    locked: 'Verrouillée',
  },
  round: {
    selectWinner: 'Sélectionner le gagnant',
    history: 'Historique des manches',
    deleteLastRound: 'Annuler la dernière manche',
    confirmUndo: 'Supprimer la dernière manche ? Les soldes seront recalculés.',
    round: 'Manche',
    winner: 'Gagnant',
    at: 'à',
  },
  balance: {
    consolidated: 'Consolidé (Performance)',
    ledger: 'Grand livre (Dettes réelles)',
    settlement: 'Règlement',
    player: 'Joueur',
    balance: 'Solde',
    mustPay: 'doit payer',
  },
  refund: {
    title: 'Remboursements',
    from: 'De',
    to: 'À',
    amount: 'Montant',
    submit: 'Ajouter un remboursement',
  },
  settings: {
    title: 'Paramètres',
    players: 'Joueurs',
    gameTypes: 'Types de jeu',
    language: 'Langue',
    currency: 'Devise',
    exportData: 'Exporter les données',
    importData: 'Importer les données',
    resetAll: 'Réinitialiser toutes les données',
    confirmReset: 'Toutes les données seront supprimées définitivement. Continuer ?',
  },
  players: {
    add: 'Ajouter un joueur',
    name: 'Nom du joueur',
    edit: 'Modifier',
    delete: 'Supprimer',
    errorLinked: 'Suppression impossible : ce joueur est lié à une partie ou un remboursement.',
  },
  gameTypes: {
    add: 'Ajouter un type de jeu',
    name: 'Nom du type de jeu',
    edit: 'Modifier',
    delete: 'Supprimer',
    errorLinked: 'Suppression impossible : ce type de jeu est lié à une partie existante.',
  },
}
```

#### `src/i18n/index.ts`
```ts
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { en } from './en'
import { fr } from './fr'

const dictionaries = { en, fr }

export function useI18n() {
  const store = useAppStore()

  const t = computed(() => dictionaries[store.settings.locale] ?? en)

  // Format monetary value: cents → display string with currency symbol
  function formatMoney(cents: number): string {
    const value = (cents / 100).toFixed(2)
    const { locale, currency } = store.settings
    if (locale === 'fr') {
      // French convention: "10,00 €" or "10,00 $"
      return `${value.replace('.', ',')} ${currency}`
    }
    // English convention: "$10.00" or "€10.00"
    return `${currency}${value}`
  }

  return { t, formatMoney }
}
```

### Usage in components
```vue
<script setup lang="ts">
import { useI18n } from '@/i18n'
const { t, formatMoney } = useI18n()
</script>

<template>
  <button>{{ t.session.newSession }}</button>
  <span>{{ formatMoney(session.buyIn) }}</span>
</template>
```

---

## Step D7 — View Layer Updates

### `src/views/DashboardView.vue`

| Change | Detail |
|---|---|
| Remove title input | Session creation form no longer has a `<input type="text">` for title |
| Use `store.sortedSessions` | Replace direct `store.gameSessions` reference with `store.sortedSessions` for the session list |
| Pass `isLatest` prop to `SessionCard` | `isLatest = session.id === store.latestSession?.id` |
| Apply i18n | All labels use `t.session.*`, `t.nav.*` etc. |

### `src/views/SessionView.vue`

| Change | Detail |
|---|---|
| Derive `isLatest` | `const isLatest = computed(() => store.latestSession?.id === route.params.id)` |
| Pass `isLocked` to panels | `RoundEntryPanel` and `RoundHistoryList` receive `:is-locked="!isLatest"` |
| Show lock banner | If `!isLatest`, render a read-only notice (translated: `t.session.locked`) |
| Timestamp in round display | Pass `rounds` (which now include `timestamp`) to `RoundHistoryList` |

### `src/views/SettingsView.vue`

| Change | Detail |
|---|---|
| Add locale selector | Toggle/radio for `en` / `fr` — calls `store.updateSettings({ locale })` |
| Add currency selector | Toggle/radio for `$` / `€` — calls `store.updateSettings({ currency })` |
| Apply i18n | All labels use `t.settings.*` |

### `src/components/SessionCard.vue`

| Change | Detail |
|---|---|
| Remove title display | No longer renders `session.title`; show `<GameTypeName> — <date>` instead |
| `isLatest` prop | `defineProps<{ session: GameSession, players: Player[], gameTypes: GameType[], isLatest: boolean }>()` |
| Lock badge | If `!isLatest`, render a lock icon or badge using `t.session.locked` |
| Disable delete button | Only render delete button if `isLatest` |

### `src/components/RoundHistoryList.vue`

| Change | Detail |
|---|---|
| `isLocked` prop | `defineProps<{ rounds: Round[], players: Player[], isLocked: boolean }>()` |
| Timestamp column | Each row displays `round.timestamp` formatted via locale (e.g., `HH:mm:ss` or full datetime) |
| Disable undo button | Conditionally render "Delete Last Round" only when `!isLocked` |

### `src/components/RoundEntryPanel.vue`

| Change | Detail |
|---|---|
| `isLocked` prop | `defineProps<{ participants: Player[], isLocked: boolean }>()` |
| Disable when locked | If `isLocked`, render a read-only message in place of the winner buttons |

### `src/components/BalanceBadge.vue`

| Change | Detail |
|---|---|
| Currency-aware display | Use `formatMoney(amount)` from `useI18n()` instead of hard-coded `$` prefix |

---

## Step D8 — Tests: i18n + Currency (Optional, Recommended)

Since the `useI18n` composable is a pure function of `store.settings`, it can be tested in isolation:

| Test | Scenario | Expected |
|---|---|---|
| i18n-1 | `locale = 'en'`, access `t.session.newSession` | `'New Session'` |
| i18n-2 | `locale = 'fr'`, access `t.session.newSession` | `'Nouvelle partie'` |
| currency-1 | `locale = 'en'`, `currency = '$'`, `formatMoney(1000)` | `'$10.00'` |
| currency-2 | `locale = 'fr'`, `currency = '€'`, `formatMoney(1000)` | `'10,00 €'` |
| currency-3 | `locale = 'en'`, `currency = '€'`, `formatMoney(1000)` | `'€10.00'` |

---

## Step D9 — `parseAndValidateAppState` Backward-Compatibility Matrix

| Scenario | V1.0 payload field | V1.1 behavior |
|---|---|---|
| `session.title` present | `"My Game"` | Silently dropped |
| `round.timestamp` absent | `{ winnerId: "..." }` | Backfilled with `""` |
| `settings` key absent | `undefined` | Replaced with `DEFAULT_SETTINGS` |
| `settings.locale` invalid | `"de"` | Replaced with `"en"` |
| `settings.currency` invalid | `"£"` | Replaced with `"$"` |

---

## Deliverable Checklist

- [ ] `npm run test` — all existing tests pass with updated fixtures
- [ ] New store tests (Lock-1 through Stamp-1, Settings-1 through Settings-3) pass
- [ ] `src/i18n/` directory created with `en.ts`, `fr.ts`, `index.ts`
- [ ] All components receive and honor `isLocked` / `isLatest` props
- [ ] `BalanceBadge` uses `formatMoney` for all monetary output
- [ ] Settings tab renders locale and currency selectors; changes persist after reload
- [ ] Session creation form has no title field
- [ ] Dashboard session list ordered latest first
- [ ] Round history rows show timestamp
- [ ] Older sessions display lock indicator and all mutation controls are hidden
- [ ] `npm run build` — zero TypeScript errors
