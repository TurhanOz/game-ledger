# SPEC DIFF — V1.0 → V1.1

This document records the precise functional changes introduced in **spec.md V1.1** relative to the V1.0 baseline.  
For the full updated specification see [spec.md](spec.md).  
For the implementation plan covering these changes see [plan-diff1.md](plan-diff1.md).

---

## Change 1 — Remove `title` from `GameSession`

**Section affected:** §2 Data Model, §4.2 Session Management

| | Before (V1.0) | After (V1.1) |
|---|---|---|
| `GameSession` fields | `id, title, date, gameTypeId, buyIn, participantIds, rounds` | `id, date, gameTypeId, buyIn, participantIds, rounds` |
| Session creation form | "Title" text input required | No title field — sessions identified by game type + date |

**Rationale:** A title adds friction during live game entry with no analytical benefit. The combination of game type and date provides sufficient identification.

---

## Change 2 — Round Winner Timestamping

**Section affected:** §2 Data Model, §4.2 Round History

| | Before (V1.0) | After (V1.1) |
|---|---|---|
| `Round` shape | `{ winnerId: UUID }` | `{ winnerId: UUID, timestamp: Date }` |
| Round history display | Winner name only | Round number, winner name, **timestamp of entry** |

**Rationale:** Knowing when each round was played adds context for long multi-hour sessions and audit traceability.

---

## Change 3 — Session List Ordered Latest First

**Section affected:** §4.2 Session List Ordering (new sub-section)

| | Before (V1.0) | After (V1.1) |
|---|---|---|
| Dashboard session order | Unspecified (insertion order) | **Descending by `date`** (latest first) |

**Rationale:** Players are most interested in the current or most recent session; it should always appear at the top.

---

## Change 4 — Session Locking (Only Latest Session Is Mutable)

**Section affected:** §4.2 Session Locking Rules (new sub-section), §4.2 Session Deletion

| | Before (V1.0) | After (V1.1) |
|---|---|---|
| Adding rounds | Any session | **Latest session only** |
| "Delete Last Round" (Undo) | Any session | **Latest session only** |
| Session deletion | Any session (with confirm) | **Latest session only** (with confirm) |
| Older sessions | No restriction stated | **Permanently locked / read-only** |
| Visual indicator | None | Lock indicator on locked session cards |

**Rationale:** Prevents retroactive manipulation of settled historical sessions, preserving ledger integrity.

---

## Change 5 — Internationalization (i18n): English & French

**Section affected:** §4.4 Localization (new section), §2 AppSettings, §5 Persistence, §6 Constraints

| | Before (V1.0) | After (V1.1) |
|---|---|---|
| Language support | English only (implicit) | **English (en) + French (fr)** |
| Locale selection | N/A | Settings tab toggle, persisted in `AppSettings.locale` |
| UI strings | Hard-coded | Driven by `useI18n` composable + translation dictionaries |
| Number formatting | Unspecified | Locale-aware (e.g., `10,00 €` vs `$10.00`) |
| AppState schema | No settings object | `AppSettings: { locale, currency }` added |

---

## Change 6 — Configurable Currency Symbol

**Section affected:** §4.5 Currency Configuration (new section), §2 AppSettings, §5 Persistence

| | Before (V1.0) | After (V1.1) |
|---|---|---|
| Currency symbol | `$` hard-coded (implied) | **User-selectable: `$` or `€`** |
| Currency selection | N/A | Settings tab toggle, persisted in `AppSettings.currency` |
| Monetary displays | Unspecified symbol | Always prefixed/suffixed with `AppSettings.currency` |
| Locale coupling | N/A | Currency and locale are **independent** settings |

---

## Summary Impact Matrix

| Artifact | Change type | Changes triggered by |
|---|---|---|
| `src/domain/types.ts` | Modify | #1, #2, #5, #6 |
| `src/domain/validation.ts` | Modify | #1, #2, #5, #6 |
| `src/stores/app.ts` | Modify | #1, #2, #3, #4, #5, #6 |
| `src/stores/__tests__/appStore.test.ts` | Modify | #1, #2, #4 |
| `src/domain/__tests__/calculations.test.ts` | Modify | #2 |
| `src/i18n/index.ts` | **New** | #5 |
| `src/i18n/en.ts` | **New** | #5 |
| `src/i18n/fr.ts` | **New** | #5 |
| `src/components/RoundHistoryList.vue` | Modify | #2, #4 |
| `src/components/RoundEntryPanel.vue` | Modify | #4 |
| `src/components/SessionCard.vue` | Modify | #1, #4 |
| `src/components/BalanceBadge.vue` | Modify | #6 |
| `src/views/DashboardView.vue` | Modify | #1, #3, #4 |
| `src/views/SessionView.vue` | Modify | #2, #4 |
| `src/views/SettingsView.vue` | Modify | #5, #6 |
