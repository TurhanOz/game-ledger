# FUNCTIONAL SPECIFICATION: GAME LEDGER (V1.1)

> **Changelog:** V1.0 → V1.1 — see [spec-diff1.md](spec-diff1.md) for a precise delta.

## 1. PRODUCT VISION
Game Ledger is a web application (SPA) designed to calculate and track balances owed between players during fixed buy-in game sessions (e.g., Poker, Belote, Tarot). 
- **Philosophy:** Total autonomy (no backend database), local persistence, and frictionless entry during live gameplay.

## 2. DATA MODEL (ENTITIES)
The global application state (`AppState`) must be JSON-serializable according to the following structure:

- **Players:** `Array<{ id: UUID, name: String }>`
- **GameTypes:** `Array<{ id: UUID, name: String }>` (e.g., "Poker", "Tarot")
- **GameSessions:** `Array<{
    id: UUID,
    date: Date,
    gameTypeId: UUID,
    buyIn: Number (Amount X, stored as integer cents),
    participantIds: Array<UUID>,
    rounds: Array<{ winnerId: UUID, timestamp: Date }>
  }>`
- **Refunds:** `Array<{
    id: UUID,
    emitterId: UUID,
    receptorId: UUID,
    amount: Number (stored as integer cents),
    date: Date
  }>`
- **AppSettings:** `{
    locale: 'en' | 'fr',
    currency: '$' | '€'
  }`

> **Removed:** `GameSession.title` — sessions are identified by their game type name and date only.  
> **Added:** `Round.timestamp` — each round winner entry records the exact moment it was logged.  
> **Added:** `AppSettings` — user-configurable preferences persisted alongside the rest of `AppState`.

## 3. BUSINESS LOGIC & CALCULATION RULES

### 3.1 Round Calculation
For each round within a game session counting Y players and a buy-in amount X:
- **Losers (Y-1 players):** Their session balance decreases by X.
- **Winner (1 player):** Their session balance increases by X * (Y - 1).
- **Rule:** Each round has exactly one winner.

### 3.2 Ledgers and Views
The application must dynamically compute four reading levels:
1. **Session View:** Breakdown of wins/losses within a single specific game session.
2. **Consolidated View (Performance):** Total sum of wins and losses across all rounds of all sessions. This view ignores refunds to reflect raw game scores.
3. **Ledger View (Actual Debts):** (Wins - Losses) - (Sum of issued refunds) + (Sum of received refunds).
4. **Simplified View (Settlement):** Application of a debt simplification algorithm (Min-Max Cash Flow) to minimize the number of transactions required to settle all accounts (e.g., if A owes B and B owes C, then A owes C).

## 4. REQUIRED FEATURES

### 4.1 Reference Data Management (CRUD)
- **Players:** Create, update, delete (prevent deletion if linked to an existing session or refund).
- **Game Types:** Create, update, delete (prevent deletion if linked to an existing session).

### 4.2 Session Management

#### Creation
- Input: select game type, select date, set buy-in amount X, and multi-select participants.
- No title field. Sessions are identified by their game type name and date in the UI.
- The participant list is locked once the session is created (Y is fixed).

#### Session List Ordering
- Sessions displayed on the Dashboard are ordered **latest first** (descending by `date`).

#### Session Locking Rules
The application enforces a strict **latest-session-only** mutation policy:
- **Only the most recently created session** (i.e., the session with the latest `date`) may have new round winners entered, its last round undone, or itself deleted.
- **All other sessions are permanently locked:** they are read-only and cannot be mutated or deleted under any circumstances.
- Locked sessions are visually distinguishable from the active session (e.g., a lock indicator on the session card).

#### Fast Round Entry (Active Session Only)
- Interface featuring large buttons for each participating player.
- Tapping a player name logs that player as the round winner, records `timestamp: new Date().toISOString()`, and instantly recomputes balances.
- This interface is disabled / hidden for locked sessions.

#### Round History
- Ordered list of rounds, each displaying: round number, winner name, and the timestamp of entry.
- A **"Delete Last Round" (Undo)** button is present **only** for the active (latest) session.

#### Session Deletion
- Permitted only for the latest session, and only after an explicit `ConfirmDialog` confirmation.

### 4.3 Refunds / Peer-to-Peer Settlements
- Free-form entry (outside of sessions): who paid, to whom, and the amount.
- Refunds are immutable once created (no delete action).

### 4.4 Localization (i18n)
- The application supports two languages: **English (en)** and **French (fr)**.
- The active locale is user-configurable from the **Settings** tab and persisted in `AppSettings.locale`.
- All static UI labels, button texts, column headers, confirmation messages, and error messages must be driven by the active locale.
- Numeric and currency formatting should respect locale conventions (e.g., `10,00 €` for French, `$10.00` for English).

### 4.5 Currency Configuration
- The application supports two currency symbols: **Dollar ($)** and **Euro (€)**.
- The active currency is user-configurable from the **Settings** tab and persisted in `AppSettings.currency`.
- All monetary displays (balances, buy-in values, settlement amounts) must prefix or suffix values with the configured currency symbol.
- Currency selection is independent of locale (a French-speaking user may choose `$`).

## 5. DATA PERSISTENCE AND LIFECYCLE
- **Default Persistence:** Uses `window.localStorage`. Every user action triggers an immediate save. `AppSettings` is persisted together with the rest of the state.
- **Loading:** Upon page refresh, the application automatically restores the state from local storage.
- **Reset:** A "Clean Session" button to completely wipe local storage data (requires explicit security confirmation).
- **Export:** Generates and downloads a `ledger_data.json` file containing the full `AppState` (including `AppSettings`).
- **Import:** Uploads a JSON file that completely replaces the current state (requires structure validation and confirmation).

## 6. TECHNICAL AND UI CONSTRAINTS
- **Interface:** Responsive (Mobile-First for game entry, Desktop for detailed dashboards).
- **Identifiers:** Strict use of UUID v4 (`crypto.randomUUID()`).
- **Calculations:** Floating-point precision — all monetary values stored as integer cents internally; divide by 100 only at display time.
- **Design:** Binary color-coding (Green for wins/credits, Red for losses/debts).
- **i18n Implementation:** Lightweight custom reactive composable (`useI18n`) backed by static translation dictionaries — no third-party i18n library required.
- **Suggested Stack:** Vue 3.5.33 + Pinia + Vue Router 4 + Tailwind CSS.