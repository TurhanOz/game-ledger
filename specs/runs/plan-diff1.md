# Plan: spec-diff1.md — V1.1 Implementation

## Overview

Four functional changes from V1.0 → V1.1. Two are data model changes (CHANGE 1: drop `title`,
CHANGE 2: add `timestamp`), one is already done (CHANGE 3: sort descending — already implemented
in `sortedSessions`), and one is a new access-control feature (CHANGE 4: session locking).

---

## Phase 1 — Domain Layer (Steps 1–2, parallel)

### Step 1 — `src/domain/types.ts`

- Remove `title: string` from `GameSession` (CHANGE 1)
- Add `timestamp: string` to `Round` (CHANGE 2, ISO 8601 string)

### Step 2 — `src/domain/validation.ts`

- Remove `assertString(s['title'], 'gameSession.title')` from the session loop (CHANGE 1)
- Add `assertString((round as Record<string, unknown>)['timestamp'], 'round.timestamp')` inside
  the rounds loop (CHANGE 2)

---

## Phase 2 — Store Layer (Step 3, depends on Phase 1)

### Step 3 — `src/stores/app.ts`

- Remove `title` from `CreateSessionPayload` interface (CHANGE 1)
- Remove `title: payload.title` from the `gameSessions.value.push({…})` body in `createSession()` (CHANGE 1)
- In `addRound()`: push `{ winnerId, timestamp: new Date().toISOString() }` instead of `{ winnerId }` (CHANGE 2)
- Add `latestSessionId` computed:
  ```ts
  const latestSessionId = computed(() =>
    [...gameSessions.value].sort((a, b) => b.date.localeCompare(a.date))[0]?.id ?? null,
  )
  ```
  (CHANGE 4)
- Add `canMutateSession(id: string): boolean` — returns `id === latestSessionId.value` (CHANGE 4)
- Guard `addRound()`: silently `return` if `!canMutateSession(sessionId)` (CHANGE 4)
- Guard `deleteLastRound()`: silently `return` if `!canMutateSession(sessionId)` (CHANGE 4)
- Guard `deleteSession()`: `throw` if `!canMutateSession(id)` (CHANGE 4)
- Export `latestSessionId` and `canMutateSession` from the store return object (CHANGE 4)

---

## Phase 3 — View & Component Layer (Steps 4–7, depends on Phase 2)

Steps 4–7 are independent of each other and can be done in parallel.

### Step 4 — `src/views/DashboardView.vue` (CHANGE 1 + CHANGE 4 wiring)

- Remove `formTitle` ref declaration
- Remove the title validation check in `submitNewSession()`: `if (!formTitle.value.trim()) { … }`
- Remove `title: formTitle.value.trim()` from the `store.createSession({…})` call
- Remove the Title `<div>` + `<input>` block from the modal template
- Pass `:is-latest="session.id === store.latestSessionId"` to every `<SessionCard>` in the session list
- Note: CHANGE 3 (`sortedSessions` computed using `b.date.localeCompare(a.date)`) is **already implemented** — no action needed

### Step 5 — `src/views/SessionView.vue` (CHANGE 1 + CHANGE 4)

- Replace `<h1>{{ session.title }}</h1>` with `{{ gameTypeName }} — {{ formatDate(session.date) }}`
- Add `isLatestSession` computed: `computed(() => store.canMutateSession(sessionId))`
- Wrap the `<RoundEntryPanel>` container `<div>` with `v-if="isLatestSession"` (CHANGE 4)
- Pass `:can-undo="isLatestSession"` prop to `<RoundHistoryList>` (CHANGE 4)

### Step 6 — `src/components/SessionCard.vue` (CHANGE 1 + CHANGE 4)

- Add `isLatest: boolean` to `defineProps`
- Replace `<h3>{{ session.title }}</h3>` with `{{ getGameTypeName(session.gameTypeId) }} — {{ formatDate(session.date) }}`
- Update `ConfirmDialog :message` to reference game type + date instead of `session.title`
- Add a lock badge next to the header: `<span v-if="!isLatest" …>Locked</span>`
- Apply `v-if="isLatest"` to the Delete button (hidden entirely for locked sessions) (CHANGE 4)

### Step 7 — `src/components/RoundHistoryList.vue` (CHANGE 2 + CHANGE 4)

- Add `canUndo: boolean` prop to `defineProps`
- Display `round.timestamp` formatted via `new Date(round.timestamp).toLocaleTimeString()` in each round list item
- Change the undo button condition from `v-if="rounds.length > 0"` to `v-if="rounds.length > 0 && canUndo"`

---

## Phase 4 — Test Updates (Steps 8–10, depends on Phases 1–3; parallel with each other)

### Step 8 — `src/domain/__tests__/calculations.test.ts`

- Remove `title` field from all `GameSession` fixture objects
- Add `timestamp: '2026-01-01T00:00:00.000Z'` to all `Round` fixture objects (static string is
  fine for pure domain tests)

### Step 9 — `src/domain/__tests__/ledger.test.ts`

- Remove `title` from `session1` and `session2` fixture objects
- Add `timestamp: '2026-01-01T00:00:00.000Z'` to all round objects inside those fixtures

### Step 10 — `src/stores/__tests__/appStore.test.ts`

- Remove `title` from all `store.createSession({…})` calls
- Add a new `describe` block **"CHANGE 4 — Session Locking Policy"** covering:
  - `canMutateSession` returns `true` only for the session with the latest `date` value
  - `addRound` on a non-latest session is a no-op (round count is unchanged)
  - `deleteLastRound` on a non-latest session is a no-op
  - `deleteSession` on a non-latest session throws
  - After deleting the latest session, the next-newest session becomes mutable

---

## Affected Files Summary

| File | Changes |
|---|---|
| `src/domain/types.ts` | Remove `GameSession.title`; add `Round.timestamp` |
| `src/domain/validation.ts` | Remove title assertion; add timestamp assertion |
| `src/stores/app.ts` | Remove title wiring; add timestamp; add locking computed + guards |
| `src/views/DashboardView.vue` | Remove title form field; pass `isLatest` to `SessionCard` |
| `src/views/SessionView.vue` | Update header label; conditionally render entry panel + undo |
| `src/components/SessionCard.vue` | Update label; add lock badge; hide Delete on locked sessions |
| `src/components/RoundHistoryList.vue` | Display timestamp per round; add `canUndo` prop |
| `src/domain/__tests__/calculations.test.ts` | Update `GameSession` + `Round` fixtures |
| `src/domain/__tests__/ledger.test.ts` | Update `GameSession` + `Round` fixtures |
| `src/stores/__tests__/appStore.test.ts` | Remove `title` from calls; add locking test cases |

---

## Verification Checklist

1. `npm run test` — all tests pass after fixture updates
2. Create session → modal has no title input field
3. `SessionView` header shows `GameType — Date` format (no title)
4. `SessionCard` shows `GameType — Date`; no title anywhere in the list
5. Play a round → `RoundHistoryList` shows a timestamp next to each winner name
6. Create two sessions on different dates → older card shows lock badge; Delete button absent;
   `SessionView` for older session hides the round entry panel and undo button
7. Dashboard session list — newest session is always first

---

## Decisions & Scope Boundaries

- **CHANGE 3 is already done** — `sortedSessions` in `DashboardView.vue` already uses
  `b.date.localeCompare(a.date)`; no code changes required.
- **"Latest session" definition** uses the same lexicographic ISO date comparison as `sortedSessions`
  — consistent, and safe for `YYYY-MM-DD` format.
- **`addRound` / `deleteLastRound` lock guard** is a silent no-op — the UI buttons are hidden
  anyway; this is purely a defensive safety net in the store layer.
- **`deleteSession` lock guard throws** — hard block per spec policy table.
- **Delete button uses `v-if`** (hidden) rather than `:disabled` — aligns with the spec table
  which shows the action as "Blocked", not "Disabled".
- **Timestamp display format** in `RoundHistoryList` is locale-based (`toLocaleTimeString`) — the
  spec states no explicit format requirement beyond displaying it.
- **No localStorage migration** — `parseAndValidateAppState` will reject persisted data that is
  missing `round.timestamp`; the existing `try/catch` in store hydration already handles this by
  starting fresh.
